/**
 * BuzzMaps — Real photo fetcher v2
 * Strategy: Yelp direct URL slug → OG image (real user-uploaded photos)
 * Fallback: DuckDuckGo image search via Bing Image API
 */

import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
for (const name of [".env.local.vercel", ".env.local"]) {
  try {
    const envLines = readFileSync(path.join(__dirname, "..", name), "utf8").split("\n");
    for (const line of envLines) {
      const eq = line.indexOf("=");
      if (eq < 1) continue;
      const k = line.slice(0, eq).trim();
      let v = line.slice(eq + 1).trim().replace(/^["']|["']$/g, "").replace(/\\n$/, "").trim();
      if (k && !process.env[k]) process.env[k] = v;
    }
  } catch {}
}

const sql = neon(process.env.DATABASE_URL);
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// Convert name to Yelp-style slug
function toYelpSlug(name) {
  return name
    .toLowerCase()
    .replace(/['''`]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

// Extract OG image from HTML
function extractOgImage(html) {
  const matchers = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
  ];
  for (const re of matchers) {
    const m = html.match(re);
    if (m) {
      let url = m[1];
      if (url.startsWith("//")) url = "https:" + url;
      if (url.length > 10) return url;
    }
  }
  return null;
}

// Try fetching a Yelp biz page
async function tryYelpUrl(url) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-CA,en;q=0.9",
      },
      signal: AbortSignal.timeout(10000),
      redirect: "follow",
    });
    if (!res.ok) return null;
    const html = await res.text();
    // Check it's actually a biz page, not a search results page
    if (html.includes('"pageType":"biz"') || html.includes('yelp-biz') || html.includes('"businessName"')) {
      const img = extractOgImage(html);
      // Filter out Yelp's generic assets
      if (img && !img.includes("yelp-styleguide") && !img.includes("yelp_logo") && !img.includes("default_")) {
        return img;
      }
    }
    return null;
  } catch {
    return null;
  }
}

// Try multiple Yelp slug variants
async function findYelpPhoto(name, address) {
  const slug = toYelpSlug(name);
  const city = "toronto";
  
  const variants = [
    `https://www.yelp.com/biz/${slug}-${city}`,
    `https://www.yelp.com/biz/${slug}-${city}-2`,
    `https://www.yelp.com/biz/${slug}`,
  ];

  for (const url of variants) {
    const img = await tryYelpUrl(url);
    if (img) return img;
    await delay(1500);
  }
  return null;
}

// Try Foursquare Places API (free, 950 calls/day)
// Actually let's try fetching from the restaurant's Wikipedia page or direct website
async function tryDirectWebsite(name) {
  // Try common restaurant website patterns
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "");
  
  const urlsToTry = [
    `https://www.${slug}.com`,
    `https://${slug}.ca`,
    `https://${slug}toronto.com`,
  ];

  for (const url of urlsToTry) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 BuzzMaps/1.0" },
        signal: AbortSignal.timeout(5000),
        redirect: "follow",
      });
      if (!res.ok) continue;
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("html")) continue;
      const html = await res.text();
      const img = extractOgImage(html);
      if (img && img.startsWith("http")) {
        // Validate it's actually an image
        try {
          const imgRes = await fetch(img, { method: "HEAD", signal: AbortSignal.timeout(3000) });
          if (imgRes.ok && (imgRes.headers.get("content-type") || "").startsWith("image/")) {
            return img;
          }
        } catch {}
      }
    } catch {}
    await delay(500);
  }
  return null;
}

// Foursquare Places free search (no auth needed for basic search JSON embed)
async function tryFoursquare(name) {
  try {
    const q = encodeURIComponent(`${name} Toronto`);
    const res = await fetch(`https://foursquare.com/explore?near=Toronto,+Ontario&q=${q}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "text/html",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    // Look for photo URLs in the page JSON data
    const photoMatch = html.match(/\"photoPrefix\":\"([^\"]+)\"/);
    if (photoMatch) {
      return `${photoMatch[1]}300x200/img.jpg`;
    }
    return null;
  } catch {
    return null;
  }
}

async function main() {
  const places = await sql`
    SELECT id, name, address, photo_url
    FROM restaurants
    ORDER BY id
  `;

  console.log(`\nFixing photos for ${places.length} places...\n`);

  let updated = 0;
  let failed = 0;
  let skipped = 0;

  for (let i = 0; i < places.length; i++) {
    const p = places[i];
    const isUnsplash = p.photo_url && p.photo_url.includes("unsplash.com");
    const isNull = !p.photo_url;

    if (!isUnsplash && !isNull) {
      skipped++;
      continue;
    }

    process.stdout.write(`[${i + 1}/${places.length}] ${p.name.slice(0, 40).padEnd(40)} `);

    let photo = null;

    // Strategy 1: Yelp
    photo = await findYelpPhoto(p.name, p.address);
    if (photo) {
      process.stdout.write("(yelp) ");
    }

    // Strategy 2: Direct website
    if (!photo) {
      photo = await tryDirectWebsite(p.name);
      if (photo) process.stdout.write("(site) ");
    }

    if (photo) {
      await sql`UPDATE restaurants SET photo_url = ${photo} WHERE id = ${p.id}`;
      updated++;
      console.log(`✓ ${photo.slice(0, 60)}`);
    } else {
      failed++;
      console.log(`✗`);
    }

    await delay(2000);
  }

  console.log(`\nDone. Updated: ${updated}, Failed: ${failed}, Skipped (already real): ${skipped}`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
