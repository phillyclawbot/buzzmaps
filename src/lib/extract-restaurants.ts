import { getDb } from "./db";
import type { PlaceCategory } from "./types";

interface ExtractedVenue {
  name: string;
  category: PlaceCategory;
}

const VALID_CATEGORIES = new Set([
  "restaurant", "bar", "cafe", "club", "shop", "park", "gym", "venue", "market", "museum", "other",
]);

export async function extractVenuesWithAI(text: string): Promise<ExtractedVenue[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Fallback to empty if no API key
    return [];
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: `Extract ALL specifically named places in Toronto from this text — not just food. Include: restaurants, bars, cafes, clubs, parks, shops, gyms, music venues, markets, museums, galleries, bookstores, record stores, spas, skating rinks, beaches, trails, entertainment venues, sports facilities, community centres, hotels, theatres — anything with a real name that someone might visit. Do NOT include generic terms like "a restaurant" or "some bar". Only real named places.\n\nReturn JSON array: [{"name": "Exact Place Name", "category": "restaurant|bar|cafe|club|shop|park|gym|venue|market|museum|other"}]\nReturn [] if no specific named places found. Max 10. Return ONLY the JSON array.\n\nText:\n${text.slice(0, 4000)}`,
          },
        ],
      }),
    });

    if (!res.ok) return [];
    const data = await res.json();
    const content = data?.content?.[0]?.text || "[]";
    // Extract JSON array from response
    const match = content.match(/\[[\s\S]*\]/);
    if (!match) return [];

    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (v: { name?: string; category?: string }) =>
          v.name && typeof v.name === "string" && v.name.length > 2
      )
      .map((v: { name: string; category: string }) => ({
        name: v.name,
        category: VALID_CATEGORIES.has(v.category) ? (v.category as PlaceCategory) : "other",
      }))
      .slice(0, 8);
  } catch {
    return [];
  }
}

// Blocklist of Toronto non-venue proper nouns that commonly create noise
const NON_VENUE_BLOCKLIST = new Set([
  // Neighborhoods / cities
  "Scarborough", "Etobicoke", "North York", "East York", "York",
  "Mississauga", "Brampton", "Markham", "Richmond Hill", "Vaughan",
  "Oakville", "Burlington", "Hamilton", "Downtown", "Midtown", "Uptown",
  "The Annex", "Parkdale", "Leslieville", "Kensington", "Liberty Village",
  "Junction", "Beaches", "Danforth", "Roncesvalles", "Bloor West Village",
  "High Park", "Bedford Park", "Lawrence Park", "Rosedale", "Forest Hill",
  "Cabbagetown", "Regent Park", "Moss Park", "St. James Town",
  "Chinatown", "Koreatown", "Little Italy", "Little Portugal", "Greektown",
  // Subway stations (single-word ones are also in COMMON_ENGLISH_WORDS below)
  "College", "Dundas", "Queen", "King", "Union", "Bloor-Yonge", "St. George",
  "Spadina", "Bathurst", "Ossington", "Dufferin", "Lansdowne", "Keele",
  "Jane", "Runnymede", "Broadview", "Chester", "Pape", "Donlands",
  "Greenwood", "Coxwell", "Woodbine", "Main", "Victoria Park", "Warden",
  "Kennedy", "Finch", "Sheppard-Yonge", "York Mills", "Lawrence", "Eglinton",
  "Davisville", "St. Clair", "Summerhill", "Sherbourne", "Wellesley",
  "Bay", "Museum", "Dupont", "Christie",
  // Streets
  "Yonge Street", "Queen Street", "King Street", "Dundas Street",
  "Bloor Street", "College Street", "Bathurst Street", "Spadina Avenue",
  "University Avenue", "Bay Street", "Front Street", "Lakeshore",
  "Markham Street", "London Street", "Vancouver Avenue",
  // Other non-venues
  "TTC", "GO Transit", "TMU", "UofT", "Ryerson", "York University",
  "Toronto Police", "City Hall",
  // Generic false positives
  "Toronto", "Ontario", "Canada", "Reddit", "The", "This", "That",
  "Anyone", "Everyone", "Someone", "Does Anyone", "Has Anyone",
  "Looking For", "Best", "Good", "Great", "New", "Old",
]);

// Single common English words that are likely not venue names on their own
const COMMON_ENGLISH_WORDS = new Set([
  "College", "Queen", "King", "Union", "Bay", "Main", "Jane",
  "Museum", "Junction", "Beaches", "Village", "Market", "Park",
  "Club", "Bar", "Pub", "Grill", "Diner", "Cafe", "Shop", "Store",
  "Place", "House", "Room", "Corner", "Garden", "Kitchen", "Table",
  "Station", "Square", "Court", "Lane", "Walk", "Way", "Drive",
]);

function looksLikeVenue(name: string): boolean {
  const trimmed = name.trim();
  // Reject names shorter than 3 chars
  if (trimmed.length < 3) return false;
  // Reject blocklisted names
  if (NON_VENUE_BLOCKLIST.has(trimmed)) return false;
  // Reject single common English words (not venue-specific enough)
  const words = trimmed.split(/\s+/);
  if (words.length === 1 && COMMON_ENGLISH_WORDS.has(trimmed)) return false;
  return true;
}

// Keep old regex extraction as fallback
export function extractRestaurantNames(
  title: string,
  selftext: string
): string[] {
  const text = `${title}\n${selftext}`;
  const names = new Set<string>();

  // Quoted names
  const quoted = text.matchAll(/["']([A-Z][A-Za-z\s&'.-]{2,30})["']/g);
  for (const m of quoted) names.add(m[1].trim());

  // Classic preposition patterns
  const atFrom = text.matchAll(
    /(?:at|from|called|try|tried|visit|visited)\s+([A-Z][A-Za-z\s&'.-]{2,30})(?:[,.\s!?]|$)/g
  );
  for (const m of atFrom) {
    const name = m[1].trim().replace(/[.\s]+$/, "");
    if (name.split(/\s+/).length <= 5) names.add(name);
  }

  // "went to X", "love X", "recommend X", "check out X", "hit up X"
  const recVerbs = text.matchAll(
    /(?:went to|love|recommend|check out|hit up)\s+([A-Z][A-Za-z\s&'.-]{2,30})(?:[,.\s!?]|$)/g
  );
  for (const m of recVerbs) {
    const name = m[1].trim().replace(/[.\s]+$/, "");
    if (name.split(/\s+/).length <= 5) names.add(name);
  }

  // "ate at X", "dinner at X", "lunch at X", "brunch at X", "drinks at X"
  const mealAt = text.matchAll(
    /(?:ate at|dinner at|lunch at|brunch at|drinks at|eating at|dined at)\s+([A-Z][A-Za-z\s&'.-]{2,30})(?:[,.\s!?]|$)/g
  );
  for (const m of mealAt) {
    const name = m[1].trim().replace(/[.\s]+$/, "");
    if (name.split(/\s+/).length <= 5) names.add(name);
  }

  // "X is great/amazing/good/awesome/solid/fire/bussin"
  const qualityAdj = text.matchAll(
    /([A-Z][A-Za-z\s&'.-]{2,30})\s+is\s+(?:great|amazing|good|awesome|solid|fire|bussin|fantastic|excellent|incredible|delicious|the best)/g
  );
  for (const m of qualityAdj) {
    const name = m[1].trim().replace(/[.\s]+$/, "");
    if (name.split(/\s+/).length <= 5) names.add(name);
  }

  // "X on [Street/Ave/etc]" — e.g. "Pai on Duncan"
  const onStreet = text.matchAll(
    /([A-Z][A-Za-z\s&'.-]{2,25})\s+on\s+(?:[A-Z][A-Za-z]+(?:\s+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Boulevard|Blvd|Way|Lane|Ln))?)/g
  );
  for (const m of onStreet) {
    const name = m[1].trim().replace(/[.\s]+$/, "");
    if (name.split(/\s+/).length <= 4) names.add(name);
  }

  // "X in [Neighborhood]" — e.g. "Gusto in the Annex"
  const inNeighbourhood = text.matchAll(
    /([A-Z][A-Za-z\s&'.-]{2,25})\s+in\s+(?:the\s+)?(?:Annex|Parkdale|Leslieville|Kensington|Danforth|Roncesvalles|Junction|Beaches|Chinatown|Koreatown|Greektown|Cabbagetown|Rosedale|Yorkville|Distillery)/gi
  );
  for (const m of inNeighbourhood) {
    const name = m[1].trim().replace(/[.\s]+$/, "");
    if (name.split(/\s+/).length <= 4) names.add(name);
  }

  return [...names].filter(
    (n) => n.length >= 3 && n.split(/\s+/).length <= 5 && looksLikeVenue(n)
  );
}

interface PlaceResult {
  name: string;
  place_id: string;
  address: string;
  lat: number;
  lng: number;
  rating: number | null;
  reviews_count: number | null;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function geocodeRestaurant(
  name: string,
  category: PlaceCategory = "restaurant"
): Promise<PlaceResult | null> {
  return geocodeWithNominatim(name);
}

async function geocodeWithNominatim(name: string): Promise<PlaceResult | null> {
  try {
    const q = encodeURIComponent(`${name} Toronto Ontario`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=ca`,
      { headers: { "User-Agent": "BuzzMaps/1.0" } }
    );
    const data = await res.json();
    if (!data?.length) return null;

    const place = data[0];
    const lat = parseFloat(place.lat);
    const lng = parseFloat(place.lon);
    if (lat < 43.4 || lat > 44.0 || lng < -79.8 || lng > -78.8) return null;

    const displayName: string = place.display_name || name;
    const shortName = displayName.split(",")[0].trim();
    await delay(1100);

    return {
      name: shortName,
      place_id: `osm_${place.osm_id}`,
      address: displayName,
      lat,
      lng,
      rating: null,
      reviews_count: null,
    };
  } catch {
    return null;
  }
}

export async function saveRestaurant(
  place: PlaceResult,
  postId: number,
  context: string,
  sentiment: string,
  category: PlaceCategory = "restaurant"
): Promise<void> {
  const sql = getDb();

  const rows = await sql`
    INSERT INTO restaurants (name, place_id, address, lat, lng, google_rating, google_reviews_count, category)
    VALUES (${place.name}, ${place.place_id}, ${place.address}, ${place.lat}, ${place.lng}, ${place.rating}, ${place.reviews_count}, ${category})
    ON CONFLICT (place_id) DO UPDATE SET
      name = EXCLUDED.name,
      address = EXCLUDED.address,
      category = EXCLUDED.category
    RETURNING id
  `;

  const restaurantId = rows[0].id;

  await sql`
    INSERT INTO post_restaurants (post_id, restaurant_id, mention_context, sentiment)
    VALUES (${postId}, ${restaurantId}, ${context}, ${sentiment})
    ON CONFLICT (post_id, restaurant_id) DO NOTHING
  `;
}

export async function fetchPostComments(
  subreddit: string,
  redditId: string
): Promise<string> {
  try {
    const id = redditId.startsWith("t3_") ? redditId.slice(3) : redditId;
    const res = await fetch(
      `https://www.reddit.com/r/${subreddit}/comments/${id}/.json?limit=30`,
      { headers: { "User-Agent": "BuzzMaps/1.0" } }
    );
    if (!res.ok) return "";
    const data = await res.json();
    const comments = data?.[1]?.data?.children || [];
    return comments
      .map((c: { data: { body?: string } }) => c.data?.body || "")
      .join("\n");
  } catch {
    return "";
  }
}

export async function enrichWithGoogleRating(name: string, lat: number, lng: number): Promise<{ rating: number | null; reviews_count: number | null }> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return { rating: null, reviews_count: null };
  try {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=150&keyword=${encodeURIComponent(name)}&key=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const data = await res.json();
    const result = data?.results?.[0];
    if (!result) return { rating: null, reviews_count: null };
    return { rating: result.rating ?? null, reviews_count: result.user_ratings_total ?? null };
  } catch {
    return { rating: null, reviews_count: null };
  }
}
