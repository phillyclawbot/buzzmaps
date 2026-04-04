/**
 * BuzzMaps — Real photo fetcher (no Google API)
 * Strategy: DuckDuckGo search → Yelp / restaurant website → OG image
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

// Extract OG image from HTML
function extractOgImage(html, baseUrl) {
  const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (!match) return null;
  let url = match[1];
  if (url.startsWith("//")) url = "https:" + url;
  if (url.startsWith("/")) {
    const base = new URL(baseUrl);
    url = base.origin + url;
  }
  // Skip obvious placeholders/logos
  if (/logo|placeholder|default|blank|avatar|icon/i.test(url)) return null;
  return url;
}

// Search DuckDuckGo HTML for a URL
async function ddgSearch(query) {
  try {
    const q = encodeURIComponent(query);
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${q}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "text/html",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    // Extract result URLs
    const urls = [];
    const matches = html.matchAll(/class="result__url"[^>]*>([^<]+)</g);
    for (const m of matches) {
      let url = m[1].trim();
      if (!url.startsWith("http")) url = "https://" + url;
      urls.push(url);
    }
    // Also extract from result__a links
    const linkMatches = html.matchAll(/href="\/\/duckduckgo\.com\/l\/[^"]*uddg=([^"&]+)/g);
    for (const m of linkMatches) {
      try { urls.push(decodeURIComponent(m[1])); } catch {}
    }
    return [...new Set(urls)];
  } catch {
    return [];
  }
}

// Fetch OG image from a URL
async function fetchOgImage(url) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 BuzzMaps/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("html")) return null;
    const html = await res.text();
    return extractOgImage(html, url);
  } catch {
    return null;
  }
}

// Check if a URL returns a valid image
async function validateImageUrl(url) {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: AbortSignal.timeout(5000),
      headers: { "User-Agent": "Mozilla/5.0 BuzzMaps/1.0" },
    });
    if (!res.ok) return false;
    const ct = res.headers.get("content-type") || "";
    return ct.startsWith("image/");
  } catch {
    return false;
  }
}

// Priority sources to check for a restaurant
async function findRealPhoto(name, address) {
  const city = "Toronto";
  const shortAddress = address ? address.split(",")[0].trim() : "";

  // 1. Try Yelp search
  const yelpQuery = `site:yelp.com "${name}" Toronto`;
  const yelpUrls = await ddgSearch(yelpQuery);
  await delay(2000);

  const yelpUrl = yelpUrls.find(u => u.includes("yelp.com/biz/"));
  if (yelpUrl) {
    const img = await fetchOgImage(yelpUrl);
    if (img && !img.includes("yelp.com/assets") && !img.includes("s3-media")) {
      // Yelp OG images are actual photos
      if (await validateImageUrl(img)) return img;
    }
    // Even the yelp.com s3-media ones are real restaurant photos
    if (img && img.includes("s3-media")) {
      return img; // These are real photos from Yelp users
    }
    await delay(1000);
  }

  // 2. Try restaurant's own website
  const siteQuery = `"${name}" restaurant ${city} official site`;
  const siteUrls = await ddgSearch(siteQuery);
  await delay(2000);

  // Skip Yelp/TripAdvisor/aggregators, find the actual site
  const skipDomains = ["yelp.com", "tripadvisor.com", "google.com", "facebook.com", "instagram.com", "zomato.com", "grubhub.com", "doordash.com", "ubereats.com", "foursquare.com"];
  const ownSite = siteUrls.find(u => {
    try {
      const h = new URL(u).hostname;
      return !skipDomains.some(d => h.includes(d));
    } catch { return false; }
  });

  if (ownSite) {
    const img = await fetchOgImage(ownSite);
    if (img && await validateImageUrl(img)) return img;
    await delay(1000);
  }

  // 3. Try TripAdvisor
  const taQuery = `site:tripadvisor.com "${name}" Toronto`;
  const taUrls = await ddgSearch(taQuery);
  await delay(2000);
  const taUrl = taUrls.find(u => u.includes("tripadvisor.com/Restaurant_Review"));
  if (taUrl) {
    const img = await fetchOgImage(taUrl);
    if (img && img.includes("media-cdn") && await validateImageUrl(img)) return img;
    await delay(1000);
  }

  return null;
}

async function main() {
  // Get all restaurants with fake Unsplash photos (or null)
  const places = await sql`
    SELECT id, name, address, photo_url
    FROM restaurants
    ORDER BY id
  `;

  console.log(`\nChecking photos for ${places.length} places...\n`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const p of places) {
    const isUnsplash = p.photo_url && p.photo_url.includes("unsplash.com");
    const isNull = !p.photo_url;

    if (!isUnsplash && !isNull) {
      skipped++;
      continue; // Already has a real photo
    }

    process.stdout.write(`[${updated + failed + skipped + 1}/${places.length}] ${p.name} ... `);

    try {
      const photo = await findRealPhoto(p.name, p.address);
      if (photo) {
        await sql`UPDATE restaurants SET photo_url = ${photo} WHERE id = ${p.id}`;
        updated++;
        console.log(`✓ ${photo.slice(0, 80)}`);
      } else {
        failed++;
        console.log(`✗ not found`);
      }
    } catch (e) {
      failed++;
      console.log(`✗ error: ${e.message}`);
    }

    // Rate limit: be polite with DDG
    await delay(3000);
  }

  console.log(`\nDone. Updated: ${updated}, Failed: ${failed}, Already real: ${skipped}`);
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
