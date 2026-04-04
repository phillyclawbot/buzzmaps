const { neon } = require("@neondatabase/serverless");
const fs = require("fs");

const dbUrl = fs.readFileSync(".env.local", "utf8").match(/DATABASE_URL=(.+)/)[1].trim();
const sql = neon(dbUrl);

function extractNames(title, selftext) {
  const text = `${title}\n${selftext}`;
  const names = new Set();
  // Quoted names
  for (const m of text.matchAll(/["']([A-Z][A-Za-z\s&'.\-]{2,30})["']/g)) names.add(m[1].trim());
  // "at/from/try/visit X" patterns
  for (const m of text.matchAll(/(?:at|from|called|try|tried|visit|visited|recommend|check out|love)\s+([A-Z][A-Za-z\s&'.\-]{2,30})(?:[,.\s!?]|$)/g)) {
    const n = m[1].trim().replace(/[.\s]+$/, "");
    if (n.split(/\s+/).length <= 5) names.add(n);
  }
  const bad = new Set(["Toronto","Ontario","Canada","Reddit","The","This","That","Anyone","Everyone","Someone","Looking","Best","Good","Great","New","Old","They","Their","There","I've","You","Your"]);
  return [...names].filter(n => !bad.has(n) && n.length > 3 && n.split(/\s+/).length <= 5);
}

async function geocode(name) {
  try {
    const q = encodeURIComponent(`${name} Toronto Ontario`);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=ca`, {
      headers: { "User-Agent": "BuzzMaps/1.0" }
    });
    const data = await res.json();
    if (!data[0]) return null;
    const lat = parseFloat(data[0].lat), lng = parseFloat(data[0].lon);
    if (lat < 43.4 || lat > 44.0 || lng < -79.8 || lng > -78.8) return null;
    const shortName = data[0].display_name.split(",")[0].trim();
    return { name: shortName, lat, lng, address: data[0].display_name };
  } catch { return null; }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  // Get all posts that haven't been processed yet
  const posts = await sql`
    SELECT rp.id, rp.reddit_id, rp.title, rp.selftext, rp.created_utc, rp.sentiment
    FROM reddit_posts rp
    WHERE NOT EXISTS (
      SELECT 1 FROM post_restaurants pm WHERE pm.post_id = rp.id
    )
    AND (rp.score >= 3 OR rp.score IS NULL)
    ORDER BY rp.score DESC NULLS LAST
    LIMIT 2000
  `;
  
  console.log(`Processing ${posts.length} unprocessed posts...`);
  let placed = 0;
  
  for (let i = 0; i < posts.length; i++) {
    const p = posts[i];
    const names = extractNames(p.title, p.selftext || "");
    
    for (const name of names.slice(0, 6)) {
      const geo = await geocode(name);
      await sleep(1200); // Nominatim rate limit
      if (!geo) continue;
      
      try {
        const rr = await sql`
          INSERT INTO restaurants (name, lat, lng, address, category, mention_count, latest_mention)
          VALUES (${geo.name}, ${geo.lat}, ${geo.lng}, ${geo.address}, 'other', 1, ${p.created_utc})
          ON CONFLICT (name) DO UPDATE SET
            mention_count = restaurants.mention_count + 1,
            latest_mention = GREATEST(restaurants.latest_mention, ${p.created_utc})
          RETURNING id
        `;
        const restId = rr[0]?.id;
        if (restId) {
          await sql`INSERT INTO post_restaurants (post_id, restaurant_id, sentiment) VALUES (${p.id}, ${restId}, ${p.sentiment || 'neutral'}) ON CONFLICT (post_id, restaurant_id) DO NOTHING`.catch(()=>{});
          process.stdout.write("★");
          placed++;
        }
      } catch {}
    }
    
    if (i % 50 === 0) {
      const [r] = await sql`SELECT COUNT(*) as n FROM restaurants`;
      console.log(`\n[${i}/${posts.length}] places so far: ${r.n}, placed this run: ${placed}`);
    }
  }
  
  const [r, p] = await Promise.all([sql`SELECT COUNT(*) as n FROM restaurants`, sql`SELECT COUNT(*) as n FROM reddit_posts`]);
  console.log(`\nDone! Places: ${r.n}, Posts: ${p.n}`);
}

main().catch(console.error);
