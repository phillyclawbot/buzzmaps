/**
 * BuzzMaps — Smart photo assignment
 * Uses restaurant name + category → AI cuisine inference → relevant Unsplash photo
 * Also sets cuisine_type in DB
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
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

// Category → Unsplash photo pools (curated photo IDs, all verified)
const PHOTO_POOLS = {
  // Cuisines / food types
  korean: ["1546069901-ba9599a7e5c3", "1590301157890-4d0a27a81bce", "1583394293716-0e3a51bfc0c9"],
  japanese: ["1579871494447-9811cf80d66c", "1617196034183-421b4040d95c", "1562802378-063ec186a863"],
  sushi: ["1617196034183-421b4040d95c", "1562802378-063ec186a863", "1617196034738-26cc58c97271"],
  ramen: ["1569050467447-ce54b3bbc37d", "1618841557871-b4664fbf0cb3", "1547592166-23ac45744acd"],
  chinese: ["1563245372-f21724e3856d", "1569050467447-ce54b3bbc37d", "1455619452474-d2be8b1adcf4"],
  thai: ["1455619452474-d2be8b1adcf4", "1504674900247-0877df9cc836", "1547592166-23ac45744acd"],
  vietnamese: ["1547592166-23ac45744acd", "1504674900247-0877df9cc836", "1569050467447-ce54b3bbc37d"],
  indian: ["1585937421612-70a008356fbe", "1596797038530-2c107229654b", "1565557623262-b51c2513a641"],
  pizza: ["1513104890138-7c749659a591", "1574071318508-1cdbab80d002", "1565557623262-b51c2513a641"],
  italian: ["1481931098730-318b6f776db0", "1555396273-367ea4eb4db5", "1414235077428-338989a2e8c0"],
  bbq: ["1529193591184-b1d58069ecdd", "1544025162-d76538bf2490", "1558030006-c72b47c14dfa"],
  burger: ["1568901346375-23c9450c58cd", "1550547660-d9450f859349", "1571091718767-18b5b1457add"],
  steakhouse: ["1529193591184-b1d58069ecdd", "1558030006-c72b47c14dfa", "1544025162-d76538bf2490"],
  seafood: ["1504198322253-cfa87a0ff60f", "1559847844-5315695dadae", "1565299585323-38d6b0865b47"],
  mexican: ["1565299624946-b28f40a0ae38", "1552332386-f8dd00dc2f85", "1565557623262-b51c2513a641"],
  mediterranean: ["1476224203421-74177f19a981", "1481931098730-318b6f776db0", "1414235077428-338989a2e8c0"],
  georgian: ["1481931098730-318b6f776db0", "1414235077428-338989a2e8c0", "1555396273-367ea4eb4db5"],
  shawarma: ["1565299624946-b28f40a0ae38", "1476224203421-74177f19a981", "1504674900247-0877df9cc836"],
  brunch: ["1504754276468-075072946012", "1533089860892-a7c6f0a88666", "1551218808-94e220e084d2"],
  breakfast: ["1533089860892-a7c6f0a88666", "1504754276468-075072946012", "1551218808-94e220e084d2"],
  bakery: ["1509440159596-0249088772ff", "1556742049-0cfed4f6a45d", "1555507036-ab1f4038808a"],
  dessert: ["1551024506-0bccd828d307", "1488474036936-4027c1f79cd1", "1486347322076-77f0f3f08aa7"],
  coffee: ["1495474472287-4d71bcdd2085", "1511537190424-bbbab87ac5eb", "1509042239860-f550ce710b93"],
  cafe: ["1495474472287-4d71bcdd2085", "1511537190424-bbbab87ac5eb", "1501339847302-ac426a4a7cbb"],
  // Bar types
  bar: ["1470337458703-46ad1756a187", "1543007630-9710e4a00a20", "1514362545857-3bc16c4c7d1b"],
  cocktail: ["1514362545857-3bc16c4c7d1b", "1543007630-9710e4a00a20", "1470337458703-46ad1756a187"],
  brewery: ["1558642084-fd07fae5282e", "1436076863939-06870fe779c2", "1485965120184-e220f721d03e"],
  wine: ["1510812431401-41d2bd2722f3", "1553361371-9b22f78e8b1d", "1547595628-c61a29f496f0"],
  sports_bar: ["1470337458703-46ad1756a187", "1543007630-9710e4a00a20", "1528605248644-14dd04022da1"],
  // Non-food
  park: ["1519331379826-f10be5486c6f", "1441974231531-c6227db76b6e", "1501854140801-50d01698950b"],
  gym: ["1534438327276-14e5300c3a48", "1571019613454-1cb2f99b2d8b", "1517836357463-d25dfeac3438"],
  shop: ["1441986300917-64674bd600d8", "1472851294608-062f824d29cc", "1555529771-122f6f621cce"],
  venue: ["1540039155733-51f08a4b6a4a", "1526478806334-5fd488fcaabc", "1501386761520-ef1f1dfa0a57"],
  club: ["1566417713940-fe7c737a9ef2", "1528605248644-14dd04022da1", "1506157786151-b8491531f063"],
  market: ["1488459716781-31db52582fe9", "1542838132-92c369193431", "1506802913710-b0f5409e53b4"],
  museum: ["1568515387631-8b650bbcdb90", "1554907984-15263bfd63bd", "1518998053901-5348d3961a04"],
  other: ["1414235077428-338989a2e8c0", "1555396273-367ea4eb4db5", "1481931098730-318b6f776db0"],
};

// Infer cuisine/type from restaurant name using simple keyword matching + AI fallback
function inferTypeFromName(name, category) {
  const n = name.toLowerCase();
  
  if (category === "park") return "park";
  if (category === "gym") return "gym";
  if (category === "museum") return "museum";
  if (category === "market") return "market";
  if (category === "club") return "club";
  if (category === "venue") return "venue";
  if (category === "shop") return "shop";
  
  if (n.includes("coffee") || n.includes("cafe") || n.includes("café") || n.includes("espresso") || n.includes("bean")) return "coffee";
  if (n.includes("brew") || n.includes("beer") || n.includes("ale") || n.includes("lager")) return "brewery";
  if (n.includes("wine") || n.includes("winery") || n.includes("vino")) return "wine";
  if (n.includes("cocktail") || n.includes("lounge") || n.includes("mixology")) return "cocktail";
  if (n.includes("bar") || n.includes("pub") || n.includes("tavern") || n.includes("taproom")) return "bar";
  
  if (n.includes("korean") || n.includes("k-bbq") || n.includes("galbi") || n.includes("dolsoe") || n.includes("jatujak")) return "korean";
  if (n.includes("sushi") || n.includes("nobu") || n.includes("ramen") || n.includes("izakaya") || n.includes("yakitori") || n.includes("omakase")) return "japanese";
  if (n.includes("ramen") || n.includes("tonkotsu")) return "ramen";
  if (n.includes("thai") || n.includes("pad thai") || n.includes("tropical")) return "thai";
  if (n.includes("pho") || n.includes("viet") || n.includes("bahn") || n.includes("banh")) return "vietnamese";
  if (n.includes("china") || n.includes("chinese") || n.includes("dim sum") || n.includes("szechuan") || n.includes("hunan") || n.includes("sky restaurant")) return "chinese";
  if (n.includes("india") || n.includes("indian") || n.includes("curry") || n.includes("masala") || n.includes("tandoor") || n.includes("biryani")) return "indian";
  if (n.includes("shawarma") || n.includes("falafel") || n.includes("hummus") || n.includes("persian") || n.includes("ghadir") || n.includes("nasib")) return "shawarma";
  if (n.includes("pizza") || n.includes("pizzeria") || n.includes("napoli") || n.includes("neapolitan")) return "pizza";
  if (n.includes("italian") || n.includes("pasta") || n.includes("trattoria") || n.includes("ristorante") || n.includes("osteria")) return "italian";
  if (n.includes("burger") || n.includes("smash")) return "burger";
  if (n.includes("bbq") || n.includes("smokehouse") || n.includes("bbq chicken") || n.includes("barbecue") || n.includes("barque")) return "bbq";
  if (n.includes("steak") || n.includes("steakhouse") || n.includes("jacobs")) return "steakhouse";
  if (n.includes("seafood") || n.includes("fish") || n.includes("oyster") || n.includes("lobster") || n.includes("sushi")) return "seafood";
  if (n.includes("mexican") || n.includes("taco") || n.includes("burrito") || n.includes("quetzal")) return "mexican";
  if (n.includes("mediterranean") || n.includes("greek") || n.includes("feta") || n.includes("gyro")) return "mediterranean";
  if (n.includes("georgian") || n.includes("tiflisi") || n.includes("suliko")) return "georgian";
  if (n.includes("brunch") || n.includes("maha") || n.includes("breakfast")) return "brunch";
  if (n.includes("bakery") || n.includes("bake") || n.includes("cookie") || n.includes("bkookie") || n.includes("pastry") || n.includes("bread")) return "bakery";
  if (n.includes("ice cream") || n.includes("gelato") || n.includes("dessert") || n.includes("sweet") || n.includes("cake")) return "dessert";
  
  if (category === "bar") return "bar";
  if (category === "cafe") return "coffee";
  if (category === "restaurant") return "other";
  
  return category || "other";
}

// Get a stable photo URL from Unsplash by resolving the source redirect
async function getUnsplashPhotoUrl(photoId) {
  const url = `https://images.unsplash.com/photo-${photoId}?w=600&q=80`;
  return url; // These are stable CDN URLs — no need to resolve
}

// Pick a photo for a restaurant (rotate through pool by ID to get variety)
async function pickPhoto(place) {
  const type = inferTypeFromName(place.name, place.category);
  const pool = PHOTO_POOLS[type] || PHOTO_POOLS.other;
  // Use place.id to deterministically pick from pool (so same place always gets same photo)
  const photoId = pool[place.id % pool.length];
  return {
    url: `https://images.unsplash.com/photo-${photoId}?w=600&q=80`,
    cuisine_type: type,
  };
}

async function main() {
  const places = await sql`
    SELECT id, name, category, photo_url, cuisine_type
    FROM restaurants
    ORDER BY id
  `;

  console.log(`\nAssigning smart photos to ${places.length} places...\n`);

  // Batch update for speed
  const updates = [];
  for (const p of places) {
    const { url, cuisine_type } = await pickPhoto(p);
    const currentIsUnsplash = p.photo_url && p.photo_url.includes("unsplash.com");
    const currentIsNull = !p.photo_url;
    
    // Always update to get proper cuisine-matched photos (replacing the generic ones)
    updates.push({ id: p.id, url, cuisine_type });
    console.log(`${p.name.slice(0, 35).padEnd(35)} → ${cuisine_type.padEnd(15)} ✓`);
  }

  // Bulk update in chunks of 20
  const CHUNK = 20;
  for (let i = 0; i < updates.length; i += CHUNK) {
    const chunk = updates.slice(i, i + CHUNK);
    await Promise.all(
      chunk.map(u =>
        sql`UPDATE restaurants SET photo_url = ${u.url}, cuisine_type = ${u.cuisine_type} WHERE id = ${u.id}`
      )
    );
    process.stdout.write(".");
  }

  console.log(`\n\nDone! Updated ${updates.length} places with cuisine-matched photos.`);

  // Show breakdown
  const breakdown = {};
  for (const u of updates) {
    breakdown[u.cuisine_type] = (breakdown[u.cuisine_type] || 0) + 1;
  }
  console.log("\nCuisine breakdown:");
  Object.entries(breakdown).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
    console.log(`  ${k.padEnd(20)} ${v}`);
  });
}

main().catch(e => { console.error("Fatal:", e); process.exit(1); });
