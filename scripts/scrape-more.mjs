/**
 * BuzzMaps — Extended scraper (no Google API)
 * Sources: Reddit JSON (no key) + Toronto food/lifestyle blogs
 * Usage: node scripts/scrape-more.mjs
 */

import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";

// Load env — try .env.local.vercel (has API keys) then .env.local
const __dirname = path.dirname(fileURLToPath(import.meta.url));
for (const name of [".env.local.vercel", ".env.local"]) {
  try {
    const envPath = path.join(__dirname, "..", name);
    const envLines = readFileSync(envPath, "utf8").split("\n");
    for (const line of envLines) {
      const eq = line.indexOf("=");
      if (eq < 1) continue;
      const k = line.slice(0, eq).trim();
      let v = line.slice(eq + 1).trim();
      // Strip surrounding quotes
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      // Strip literal \n trailer
      v = v.replace(/\\n$/, "").trim();
      if (k && !process.env[k]) process.env[k] = v;
    }
  } catch {}
}

const DATABASE_URL = process.env.DATABASE_URL;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const sql = neon(DATABASE_URL);

// ── helpers ────────────────────────────────────────────────────────────────

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJSON(url, headers = {}) {
  const res = await fetch(url, {
    headers: { "User-Agent": "BuzzMaps/1.0 (toronto place finder)", ...headers },
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 BuzzMaps/1.0" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.text();
}

// Strip HTML tags, collapse whitespace
function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s{2,}/g, " ")
    .trim();
}

// ── AI extraction ──────────────────────────────────────────────────────────

async function extractVenuesWithAI(text) {
  if (!ANTHROPIC_API_KEY) return [];
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `Extract ALL specifically named places in Toronto from this text. Include: restaurants, bars, cafes, clubs, parks, shops, gyms, music venues, markets, museums, galleries, bookstores, spas, entertainment venues. Do NOT include generic terms. Only real named places.\n\nReturn JSON array: [{"name": "Exact Place Name", "category": "restaurant|bar|cafe|club|shop|park|gym|venue|market|museum|other"}]\nReturn [] if no specific named places found. Max 12. Return ONLY the JSON array.\n\nText:\n${text.slice(0, 4000)}`,
          },
        ],
      }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const content = data?.content?.[0]?.text || "[]";
    const match = content.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];
    const VALID = new Set(["restaurant","bar","cafe","club","shop","park","gym","venue","market","museum","other"]);
    return parsed
      .filter((v) => v.name && typeof v.name === "string" && v.name.length > 2)
      .map((v) => ({ name: v.name, category: VALID.has(v.category) ? v.category : "other" }))
      .slice(0, 12);
  } catch (e) {
    console.error("AI extraction error:", e.message);
    return [];
  }
}

// ── Nominatim geocoding ────────────────────────────────────────────────────

async function geocode(name) {
  try {
    const q = encodeURIComponent(`${name} Toronto Ontario`);
    const data = await fetchJSON(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=ca`
    );
    if (!data?.length) return null;
    const place = data[0];
    const lat = parseFloat(place.lat);
    const lng = parseFloat(place.lon);
    // Must be in GTA bounding box
    if (lat < 43.4 || lat > 44.0 || lng < -79.8 || lng > -78.8) return null;
    const displayName = place.display_name || name;
    const shortName = displayName.split(",")[0].trim();
    await delay(1200); // Nominatim rate limit: 1 req/sec
    return {
      name: shortName,
      place_id: `osm_${place.osm_id}`,
      address: displayName,
      lat,
      lng,
    };
  } catch {
    return null;
  }
}

// ── DB save ────────────────────────────────────────────────────────────────

async function saveVenue(place, category, sourceLabel) {
  try {
    await sql`
      INSERT INTO restaurants (name, place_id, address, lat, lng, category)
      VALUES (${place.name}, ${place.place_id}, ${place.address}, ${place.lat}, ${place.lng}, ${category})
      ON CONFLICT (place_id) DO UPDATE SET
        name = EXCLUDED.name,
        address = EXCLUDED.address,
        category = EXCLUDED.category
    `;
    return true;
  } catch (e) {
    return false;
  }
}

// ── Reddit scraper ─────────────────────────────────────────────────────────

// Reddit: use subreddit top/hot feeds + within-subreddit search (restricted=1 to stay within sub)
const REDDIT_SEARCHES = [
  // r/torontofood — most relevant
  "https://www.reddit.com/r/FoodToronto/top.json?t=year&limit=100",
  "https://www.reddit.com/r/FoodToronto/hot.json?limit=100",
  "https://www.reddit.com/r/FoodToronto/top.json?t=month&limit=50",
  "https://www.reddit.com/r/torontofood/top.json?t=year&limit=100",
  "https://www.reddit.com/r/torontofood/hot.json?limit=100",
  // r/toronto within-subreddit search
  "https://www.reddit.com/r/toronto/search.json?q=restaurant+recommend&restrict_sr=1&sort=top&t=year&limit=50",
  "https://www.reddit.com/r/toronto/search.json?q=best+restaurant&restrict_sr=1&sort=top&t=year&limit=50",
  "https://www.reddit.com/r/toronto/search.json?q=hidden+gem+food&restrict_sr=1&sort=top&t=year&limit=50",
  "https://www.reddit.com/r/toronto/search.json?q=where+to+eat&restrict_sr=1&sort=top&t=year&limit=50",
  "https://www.reddit.com/r/toronto/search.json?q=bar+cocktail&restrict_sr=1&sort=top&t=year&limit=50",
  "https://www.reddit.com/r/toronto/search.json?q=cafe+coffee&restrict_sr=1&sort=top&t=year&limit=50",
  "https://www.reddit.com/r/toronto/search.json?q=brunch&restrict_sr=1&sort=top&t=year&limit=50",
  "https://www.reddit.com/r/toronto/search.json?q=ramen+noodle&restrict_sr=1&sort=top&t=year&limit=30",
  "https://www.reddit.com/r/toronto/search.json?q=new+opening&restrict_sr=1&sort=top&t=month&limit=50",
  // r/askTO within-subreddit search
  "https://www.reddit.com/r/askTO/search.json?q=restaurant+recommend&restrict_sr=1&sort=top&t=year&limit=50",
  "https://www.reddit.com/r/askTO/search.json?q=best+food&restrict_sr=1&sort=top&t=year&limit=50",
  "https://www.reddit.com/r/askTO/search.json?q=hidden+gem&restrict_sr=1&sort=top&t=year&limit=30",
  "https://www.reddit.com/r/askTO/search.json?q=cafe&restrict_sr=1&sort=top&t=year&limit=30",
  "https://www.reddit.com/r/askTO/search.json?q=bar+nightlife&restrict_sr=1&sort=top&t=year&limit=30",
];

async function scrapeReddit() {
  let found = 0;
  const seenPostIds = new Set();

  for (const url of REDDIT_SEARCHES) {
    try {
      console.log(`  Reddit: ${url.split("?")[0].split("/").slice(-3).join("/")}`);
      const data = await fetchJSON(url);
      const posts = data?.data?.children || [];

      for (const child of posts) {
        const p = child.data;
        if (!p?.id || seenPostIds.has(p.id)) continue;
        seenPostIds.add(p.id);

        const text = `${p.title || ""}\n${p.selftext || ""}`;

        // Save post to reddit_posts
        let postId;
        try {
          const rows = await sql`
            INSERT INTO reddit_posts (reddit_id, subreddit, title, selftext, author, url, permalink, score, num_comments, is_food_related, sentiment, created_utc)
            VALUES (${p.id}, ${p.subreddit || "toronto"}, ${(p.title||"").slice(0,500)}, ${(p.selftext||"").slice(0,2000)}, ${p.author||""}, ${p.url||""}, ${p.permalink||""}, ${p.score||0}, ${p.num_comments||0}, true, 'neutral', ${p.created_utc||0})
            ON CONFLICT (reddit_id) DO UPDATE SET score = EXCLUDED.score, num_comments = EXCLUDED.num_comments
            RETURNING id
          `;
          postId = rows[0].id;
        } catch {
          continue;
        }

        // Extract venues
        const venues = await extractVenuesWithAI(text);
        for (const venue of venues) {
          const place = await geocode(venue.name);
          if (place) {
            const saved = await saveVenue(place, venue.category, "reddit");
            if (saved) {
              found++;
              // Link to post
              try {
                await sql`
                  INSERT INTO post_restaurants (post_id, restaurant_id, mention_context, sentiment)
                  SELECT ${postId}, id, ${(p.title||"").slice(0,200)}, 'neutral'
                  FROM restaurants WHERE place_id = ${place.place_id}
                  ON CONFLICT DO NOTHING
                `;
              } catch {}
              console.log(`    ✓ ${place.name} (${venue.category})`);
            }
          }
          await delay(200);
        }
      }

      await delay(2000); // Be nice to Reddit
    } catch (e) {
      console.error(`  Reddit error: ${e.message}`);
    }
  }
  return found;
}

// ── Blog scraper ───────────────────────────────────────────────────────────

const BLOG_URLS = [
  // BlogTO
  "https://www.blogto.com/restaurants/",
  "https://www.blogto.com/eat_drink/",
  "https://www.blogto.com/arts/",
  "https://www.blogto.com/city/",
  // Toronto Life
  "https://torontolife.com/food/restaurants/",
  "https://torontolife.com/food/bars/",
  // Narcity
  "https://www.narcity.com/toronto/restaurants",
  "https://www.narcity.com/toronto/best-restaurants-toronto-neighbourhoods-2024",
  // Time Out
  "https://www.timeout.com/toronto/restaurants",
  "https://www.timeout.com/toronto/bars-and-pubs",
  "https://www.timeout.com/toronto/coffee-and-cafes",
  // Eater Toronto
  "https://toronto.eater.com/maps",
  "https://toronto.eater.com/",
  // NOW Magazine
  "https://nowtoronto.com/food-and-drink",
  // Yelp lists
  "https://www.yelp.com/search?find_desc=Restaurants&find_loc=Toronto%2C+Ontario&sortby=review_count",
  // Local food bloggers (static lists, good signal)
  "https://www.thelocal.to/eat/",
  "https://foodism.to/top-lists/",
];

async function scrapeBlog(url) {
  try {
    const html = await fetchText(url);
    const text = stripHtml(html);
    // Only keep first 8000 chars to control token use
    return text.slice(0, 8000);
  } catch (e) {
    console.error(`  Blog fetch error (${url}): ${e.message}`);
    return null;
  }
}

async function scrapeBlogs() {
  let found = 0;

  // Synthetic post to link blog mentions to
  let blogPostId;
  try {
    const rows = await sql`
      INSERT INTO reddit_posts (reddit_id, subreddit, title, selftext, author, url, permalink, score, num_comments, is_food_related, sentiment, created_utc)
      VALUES ('blog_seed_2024', 'blog', 'Blog seed — Toronto places from food blogs', '', 'buzzmaps', 'https://buzzmaps.vercel.app', '/blog_seed', 999, 0, true, 'positive', 1700000000)
      ON CONFLICT (reddit_id) DO UPDATE SET score = EXCLUDED.score
      RETURNING id
    `;
    blogPostId = rows[0].id;
  } catch {
    blogPostId = null;
  }

  for (const url of BLOG_URLS) {
    console.log(`  Blog: ${url}`);
    const text = await scrapeBlog(url);
    if (!text) continue;

    const venues = await extractVenuesWithAI(text);
    console.log(`    Found ${venues.length} venues`);

    for (const venue of venues) {
      const place = await geocode(venue.name);
      if (place) {
        const saved = await saveVenue(place, venue.category, "blog");
        if (saved) {
          found++;
          if (blogPostId) {
            try {
              await sql`
                INSERT INTO post_restaurants (post_id, restaurant_id, mention_context, sentiment)
                SELECT ${blogPostId}, id, ${`Blog: ${url.slice(0, 100)}`}, 'positive'
                FROM restaurants WHERE place_id = ${place.place_id}
                ON CONFLICT DO NOTHING
              `;
            } catch {}
          }
          console.log(`    ✓ ${place.name} (${venue.category})`);
        }
      }
      await delay(200);
    }

    await delay(3000); // Polite crawl rate
  }

  return found;
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const before = await sql`SELECT COUNT(*) as c FROM restaurants`;
  console.log(`\nStarting with ${before[0].c} restaurants in DB\n`);

  console.log("=== Scraping Reddit ===");
  const redditFound = await scrapeReddit();
  console.log(`Reddit: ${redditFound} new places\n`);

  console.log("=== Scraping Blogs ===");
  const blogFound = await scrapeBlogs();
  console.log(`Blogs: ${blogFound} new places\n`);

  const after = await sql`SELECT COUNT(*) as c FROM restaurants`;
  console.log(`\nDone. DB now has ${after[0].c} restaurants (+${after[0].c - before[0].c} new)\n`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
