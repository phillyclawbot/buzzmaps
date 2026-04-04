const { neon } = require("@neondatabase/serverless");
const fs = require("fs");

const dbUrl = fs.readFileSync(".env.local", "utf8").match(/DATABASE_URL=(.+)/)[1].trim();
const OPENAI_KEY = fs.readFileSync("/Users/philbot/.openclaw/workspace/TOOLS.md", "utf8").match(/sk-proj-[A-Za-z0-9_\-]+/)?.[0];
const sql = neon(dbUrl);

const SUBREDDITS = ["askTO", "toronto", "torontofood", "FoodToronto"];
const SEARCH_QUERIES = [
  "best restaurant recommendation","where to eat toronto","hidden gem toronto",
  "best brunch toronto","best ramen toronto","best sushi toronto","best pizza toronto",
  "best pho toronto","best dim sum toronto","best korean toronto","best thai toronto",
  "best bar toronto","best patio toronto","best nightclub toronto","best live music toronto",
  "best shop toronto","best vintage store toronto","best bookstore toronto","best market toronto",
  "best park toronto","best gym toronto","best museum toronto","best art gallery toronto",
  "recommendation toronto","best place in toronto","underrated toronto","must visit toronto",
  "best cafe toronto","best coffee toronto","cheap eats toronto","best date night toronto",
  "best burger toronto","things to do toronto","best cocktail toronto","best dessert toronto",
];

async function extractVenues(text) {
  if (!OPENAI_KEY) return [];
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_KEY}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: `Extract specific named places/venues in Toronto from this Reddit post. Return a JSON array of objects with {name, category} where category is one of: restaurant, bar, cafe, club, shop, park, gym, venue, market, museum, other. Only include real named places, not generic terms.\n\nText: ${text.slice(0,2000)}\n\nReturn ONLY a JSON array, nothing else.` }],
        max_tokens: 400, temperature: 0,
      })
    });
    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || "[]";
    const match = content.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : [];
  } catch { return []; }
}

async function geocode(name) {
  try {
    const q = encodeURIComponent(`${name} Toronto ON Canada`);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=ca`, {
      headers: { "User-Agent": "BuzzMaps/1.0 toronto place map" }
    });
    const data = await res.json();
    if (!data[0]) return null;
    const lat = parseFloat(data[0].lat), lng = parseFloat(data[0].lon);
    // Must be roughly in Toronto/GTA
    if (lat < 43.2 || lat > 44.2 || lng < -80.0 || lng > -78.5) return null;
    return { lat, lng, address: data[0].display_name.split(",").slice(0,3).join(",") };
  } catch { return null; }
}

async function searchReddit(subreddit, query, after) {
  const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&sort=top&t=all&limit=100${after ? `&after=${after}` : ""}`;
  const res = await fetch(url, { headers: { "User-Agent": "BuzzMaps/1.0" } });
  if (!res.ok) return { posts: [], after: null };
  const data = await res.json();
  const posts = (data?.data?.children || []).map(c => ({
    reddit_id: c.data.name, subreddit,
    title: c.data.title || "", selftext: c.data.selftext || "",
    author: c.data.author || "", url: c.data.url || "", permalink: c.data.permalink || "",
    score: c.data.score || 0, num_comments: c.data.num_comments || 0,
    created_utc: c.data.created_utc || 0,
  }));
  return { posts, after: data?.data?.after || null };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  let totalNew = 0, totalPlaces = 0;

  for (const subreddit of SUBREDDITS) {
    for (const query of SEARCH_QUERIES) {
      let after = null, fetched = 0;
      process.stdout.write(`\n[${subreddit}] "${query}": `);

      while (fetched < 100) {
        try {
          const result = await searchReddit(subreddit, query, after);
          if (!result.posts.length) break;

          for (const p of result.posts) {
            if (p.score < 3) continue;
            try {
              const rows = await sql`
                INSERT INTO reddit_posts (reddit_id, subreddit, title, selftext, author, url, permalink, score, num_comments, is_food_related, sentiment, created_utc)
                VALUES (${p.reddit_id}, ${p.subreddit}, ${p.title}, ${p.selftext}, ${p.author}, ${p.url}, ${p.permalink}, ${p.score}, ${p.num_comments}, true, 'neutral', ${p.created_utc})
                ON CONFLICT (reddit_id) DO NOTHING
                RETURNING id
              `;
              if (!rows.length) { process.stdout.write("·"); continue; }
              const postId = rows[0].id;
              totalNew++;
              process.stdout.write("+");

              const venues = await extractVenues(`${p.title} ${p.selftext}`);
              await sleep(400);

              for (const v of venues.slice(0, 8)) {
                const geo = await geocode(v.name);
                if (!geo) continue;
                await sleep(300);
                try {
                  const rr = await sql`
                    INSERT INTO restaurants (name, lat, lng, address, category, mention_count, latest_mention)
                    VALUES (${v.name}, ${geo.lat}, ${geo.lng}, ${geo.address}, ${v.category || 'other'}, 1, ${p.created_utc})
                    ON CONFLICT (name) DO UPDATE SET
                      mention_count = restaurants.mention_count + 1,
                      latest_mention = GREATEST(restaurants.latest_mention, ${p.created_utc})
                    RETURNING id
                  `;
                  const restId = rr[0]?.id;
                  if (restId) {
                    await sql`INSERT INTO post_restaurant_mentions (post_id, restaurant_id, sentiment) VALUES (${postId}, ${restId}, 'neutral') ON CONFLICT DO NOTHING`.catch(()=>{});
                    totalPlaces++;
                    process.stdout.write("★");
                  }
                } catch {}
              }
            } catch {}
          }

          after = result.after; fetched += result.posts.length;
          if (!after) break;
          await sleep(1000);
        } catch { break; }
      }
      await sleep(1500);
    }
  }

  const [r, p] = await Promise.all([sql`SELECT COUNT(*) as n FROM restaurants`, sql`SELECT COUNT(*) as n FROM reddit_posts`]);
  console.log(`\n\nDone! New posts: ${totalNew}, New places: ${totalPlaces}`);
  console.log(`DB totals — places: ${r[0].n}, posts: ${p[0].n}`);
}

main().catch(console.error);
