import { delay } from "./utils";
import type { PlaceCategory } from "./types";

const USER_AGENT = "BuzzMaps/1.0 (https://buzzmaps.vercel.app; buzzmaps@example.com)";

// ─── Wikimedia Commons geosearch ────────────────────────────────────────────

/** Image filename patterns to skip (maps, diagrams, logos, icons). */
const SKIP_PATTERNS = /\b(map|logo|icon|diagram|flag|coat.of.arms|seal|emblem|insignia|banner|svg)\b/i;

interface WikiGeoResult {
  pageid: number;
  title: string;
}

interface WikiImageInfo {
  thumburl?: string;
  url?: string;
  descriptionurl?: string;
  extmetadata?: Record<string, { value?: string }>;
}

/**
 * Fetch a thumbnail URL from a Wikimedia Commons page result.
 */
async function fetchThumbnail(title: string): Promise<string | null> {
  const infoUrl =
    `https://commons.wikimedia.org/w/api.php?action=query` +
    `&titles=${encodeURIComponent(title)}` +
    `&prop=imageinfo&iiprop=url&iiurlwidth=600&format=json`;

  const infoRes = await fetch(infoUrl, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(8000),
  });
  if (!infoRes.ok) return null;
  const infoData = await infoRes.json();

  const pages = infoData?.query?.pages ?? {};
  const page = Object.values(pages)[0] as { imageinfo?: WikiImageInfo[] } | undefined;
  const imageInfo = page?.imageinfo?.[0];

  return imageInfo?.thumburl ?? imageInfo?.url ?? null;
}

/**
 * Pick the best candidate from a list, preferring titles that mention the place name.
 */
function pickBestCandidate(candidates: WikiGeoResult[], name: string): WikiGeoResult {
  const nameWords = name.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  return (
    candidates.find((c) => {
      const t = c.title.toLowerCase();
      return nameWords.some((w) => t.includes(w));
    }) ?? candidates[0]
  );
}

/**
 * Search Wikimedia Commons for photos of a place.
 * Tries geosearch first (geotagged photos near coordinates), then falls back
 * to a title/text search by name for landmarks and well-known places.
 */
export async function fetchWikimediaPhoto(
  lat: number,
  lng: number,
  name: string
): Promise<string | null> {
  try {
    // Strategy 1: geosearch for images near the coordinates
    const geoUrl =
      `https://commons.wikimedia.org/w/api.php?action=query&list=geosearch` +
      `&gscoord=${lat}|${lng}&gsradius=500&gsnamespace=6&gslimit=10&format=json`;

    const geoRes = await fetch(geoUrl, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(8000),
    });

    if (geoRes.ok) {
      const geoData = await geoRes.json();
      const results: WikiGeoResult[] = geoData?.query?.geosearch ?? [];
      const candidates = results.filter((r) => !SKIP_PATTERNS.test(r.title));

      if (candidates.length > 0) {
        const best = pickBestCandidate(candidates, name);
        await delay(1100);
        const url = await fetchThumbnail(best.title);
        if (url) return url;
      }
    }

    await delay(1100); // respect Wikimedia rate limits

    // Strategy 2: search by name (catches landmarks, famous places, etc.)
    const searchQuery = encodeURIComponent(`${name} Toronto`);
    const searchUrl =
      `https://commons.wikimedia.org/w/api.php?action=query&list=search` +
      `&srnamespace=6&srsearch=${searchQuery}&srlimit=10&format=json`;

    const searchRes = await fetch(searchUrl, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(8000),
    });
    if (!searchRes.ok) return null;
    const searchData = await searchRes.json();

    const searchResults: { title: string }[] = searchData?.query?.search ?? [];
    const searchCandidates = searchResults.filter((r) => !SKIP_PATTERNS.test(r.title));
    if (searchCandidates.length === 0) return null;

    // Pick the best match from search results
    const nameWords = name.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const bestSearch =
      searchCandidates.find((c) => {
        const t = c.title.toLowerCase();
        return nameWords.some((w) => t.includes(w));
      }) ?? searchCandidates[0];

    await delay(1100);
    return await fetchThumbnail(bestSearch.title);
  } catch {
    return null;
  }
}

// ─── Yelp OG image scraping ─────────────────────────────────────────────────

function toYelpSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/^the\s+/i, "")
    .replace(/['''`]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

function extractOgImage(html: string): string | null {
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

async function tryYelpUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-CA,en;q=0.9",
      },
      signal: AbortSignal.timeout(10000),
      redirect: "follow",
    });
    if (!res.ok) return null;
    const html = await res.text();
    if (
      html.includes('"pageType":"biz"') ||
      html.includes("yelp-biz") ||
      html.includes('"businessName"')
    ) {
      const img = extractOgImage(html);
      if (
        img &&
        !img.includes("yelp-styleguide") &&
        !img.includes("yelp_logo") &&
        !img.includes("default_")
      ) {
        return img;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Try to find a real photo on Yelp by constructing URL slug variants.
 * City defaults to "toronto" but can be changed for expansion.
 */
export async function fetchYelpPhoto(
  name: string,
  city: string = "toronto"
): Promise<string | null> {
  const slug = toYelpSlug(name);

  const variants = [
    `https://www.yelp.com/biz/${slug}-${city}`,
    `https://www.yelp.com/biz/${slug}-${city}-2`,
    `https://www.yelp.com/biz/${slug}-${city}-3`,
    `https://www.yelp.com/biz/${slug}`,
    `https://www.yelp.com/biz/the-${slug}-${city}`,
    `https://www.yelp.com/biz/${slug}-${city}-on`,
  ];

  for (const url of variants) {
    const img = await tryYelpUrl(url);
    if (img) return img;
    await delay(1500);
  }
  return null;
}

// ─── Unsplash category fallback ─────────────────────────────────────────────

/** Curated Unsplash photo pools keyed by inferred cuisine/type. */
const PHOTO_POOLS: Record<string, string[]> = {
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
  brunch: ["1504754276468-075072946012", "1533089860892-a7c6f0a88666", "1551218808-94e220e084d2"],
  bakery: ["1509440159596-0249088772ff", "1556742049-0cfed4f6a45d", "1555507036-ab1f4038808a"],
  dessert: ["1551024506-0bccd828d307", "1488474036936-4027c1f79cd1", "1486347322076-77f0f3f08aa7"],
  coffee: ["1495474472287-4d71bcdd2085", "1511537190424-bbbab87ac5eb", "1509042239860-f550ce710b93"],
  cafe: ["1495474472287-4d71bcdd2085", "1511537190424-bbbab87ac5eb", "1501339847302-ac426a4a7cbb"],
  bar: ["1470337458703-46ad1756a187", "1543007630-9710e4a00a20", "1514362545857-3bc16c4c7d1b"],
  cocktail: ["1514362545857-3bc16c4c7d1b", "1543007630-9710e4a00a20", "1470337458703-46ad1756a187"],
  brewery: ["1558642084-fd07fae5282e", "1436076863939-06870fe779c2", "1485965120184-e220f721d03e"],
  wine: ["1510812431401-41d2bd2722f3", "1553361371-9b22f78e8b1d", "1547595628-c61a29f496f0"],
  park: ["1519331379826-f10be5486c6f", "1441974231531-c6227db76b6e", "1501854140801-50d01698950b"],
  gym: ["1534438327276-14e5300c3a48", "1571019613454-1cb2f99b2d8b", "1517836357463-d25dfeac3438"],
  shop: ["1441986300917-64674bd600d8", "1472851294608-062f824d29cc", "1555529771-122f6f621cce"],
  venue: ["1540039155733-51f08a4b6a4a", "1526478806334-5fd488fcaabc", "1501386761520-ef1f1dfa0a57"],
  club: ["1566417713940-fe7c737a9ef2", "1528605248644-14dd04022da1", "1506157786151-b8491531f063"],
  market: ["1488459716781-31db52582fe9", "1542838132-92c369193431", "1506802913710-b0f5409e53b4"],
  museum: ["1568515387631-8b650bbcdb90", "1554907984-15263bfd63bd", "1518998053901-5348d3961a04"],
  other: ["1414235077428-338989a2e8c0", "1555396273-367ea4eb4db5", "1481931098730-318b6f776db0"],
};

/** Infer cuisine/type from restaurant name and category for Unsplash pool selection. */
function inferTypeFromName(name: string, category: string): string {
  if (["park", "gym", "museum", "market", "club", "venue", "shop"].includes(category)) return category;

  const n = name.toLowerCase();
  if (n.includes("coffee") || n.includes("cafe") || n.includes("café") || n.includes("espresso")) return "coffee";
  if (n.includes("brew") || n.includes("beer") || n.includes("ale")) return "brewery";
  if (n.includes("wine") || n.includes("vino")) return "wine";
  if (n.includes("cocktail") || n.includes("lounge") || n.includes("mixology")) return "cocktail";
  if (n.includes("bar") || n.includes("pub") || n.includes("tavern")) return "bar";
  if (n.includes("korean") || n.includes("k-bbq") || n.includes("galbi")) return "korean";
  if (n.includes("sushi") || n.includes("izakaya") || n.includes("omakase")) return "japanese";
  if (n.includes("ramen") || n.includes("tonkotsu")) return "ramen";
  if (n.includes("thai") || n.includes("pad thai")) return "thai";
  if (n.includes("pho") || n.includes("viet") || n.includes("banh")) return "vietnamese";
  if (n.includes("chinese") || n.includes("dim sum") || n.includes("szechuan")) return "chinese";
  if (n.includes("indian") || n.includes("curry") || n.includes("tandoor") || n.includes("biryani")) return "indian";
  if (n.includes("shawarma") || n.includes("falafel") || n.includes("hummus")) return "mediterranean";
  if (n.includes("pizza") || n.includes("pizzeria")) return "pizza";
  if (n.includes("italian") || n.includes("pasta") || n.includes("trattoria")) return "italian";
  if (n.includes("burger") || n.includes("smash")) return "burger";
  if (n.includes("bbq") || n.includes("smokehouse") || n.includes("barbecue")) return "bbq";
  if (n.includes("steak")) return "steakhouse";
  if (n.includes("seafood") || n.includes("fish") || n.includes("oyster")) return "seafood";
  if (n.includes("mexican") || n.includes("taco") || n.includes("burrito")) return "mexican";
  if (n.includes("brunch") || n.includes("breakfast")) return "brunch";
  if (n.includes("bakery") || n.includes("pastry") || n.includes("bread")) return "bakery";
  if (n.includes("ice cream") || n.includes("gelato") || n.includes("dessert")) return "dessert";

  if (category === "bar") return "bar";
  if (category === "cafe") return "coffee";
  return category || "other";
}

/**
 * Get a deterministic Unsplash fallback photo based on place name, category, and ID.
 */
export function getUnsplashFallback(
  name: string,
  category: string,
  id: number
): string {
  const type = inferTypeFromName(name, category);
  const pool = PHOTO_POOLS[type] || PHOTO_POOLS.other;
  const photoId = pool[id % pool.length];
  return `https://images.unsplash.com/photo-${photoId}?w=600&q=80`;
}

// ─── Orchestrator ───────────────────────────────────────────────────────────

export interface PlaceForEnrichment {
  id: number;
  name: string;
  lat: number;
  lng: number;
  category: string;
}

/**
 * Try all free photo sources for a place, returning the first successful URL.
 * Order: Wikimedia Commons → Yelp → Unsplash fallback.
 */
export async function enrichPhoto(
  place: PlaceForEnrichment,
  city: string = "toronto"
): Promise<{ url: string; source: "wikimedia" | "yelp" | "unsplash" }> {
  // 1. Wikimedia Commons
  const wiki = await fetchWikimediaPhoto(place.lat, place.lng, place.name);
  if (wiki) return { url: wiki, source: "wikimedia" };

  // 2. Yelp
  const yelp = await fetchYelpPhoto(place.name, city);
  if (yelp) return { url: yelp, source: "yelp" };

  // 3. Unsplash fallback (always succeeds)
  const unsplash = getUnsplashFallback(place.name, place.category, place.id);
  return { url: unsplash, source: "unsplash" };
}
