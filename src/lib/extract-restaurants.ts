import { getDb } from "./db";
import type { PlaceCategory } from "./types";
import { VALID_CATEGORIES } from "./constants";
import { delay, isInToronto } from "./utils";

interface ExtractedVenue {
  name: string;
  category: PlaceCategory;
}

const VALID_CATEGORIES_SET = new Set(VALID_CATEGORIES);

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
        category: VALID_CATEGORIES_SET.has(v.category as PlaceCategory) ? (v.category as PlaceCategory) : "other",
      }))
      .slice(0, 8);
  } catch {
    return [];
  }
}

const BLOCKLIST = new Set([
  // Neighbourhoods
  "Scarborough", "Etobicoke", "North York", "Parkdale", "Leslieville",
  "Kensington", "Liberty Village", "Junction", "Beaches", "Danforth",
  "Roncesvalles", "Bedford Park", "Rosedale", "Forest Hill", "Cabbagetown",
  "Chinatown", "Koreatown", "Little Italy", "Greektown",
  // Subway stations
  "College", "Dundas", "Queen", "King", "Union", "Bloor-Yonge", "St. George",
  "Spadina", "Bathurst", "Ossington", "Dufferin", "Broadview", "Pape",
  "Woodbine", "Finch", "Sheppard-Yonge", "York Mills", "Lawrence", "Eglinton",
  "St. Clair", "Wellesley", "Bay", "Museum",
  // Streets
  "Yonge Street", "Queen Street", "King Street", "Bloor Street",
  "College Street", "Spadina Avenue", "Bay Street", "Front Street",
  // Other
  "TTC", "GO Transit", "TMU", "UofT", "Toronto Police", "City Hall", "Levi's",
  // Common false positives
  "Toronto", "Ontario", "Canada", "Reddit", "The", "This", "That",
  "Anyone", "Everyone", "Someone", "Does Anyone", "Has Anyone",
  "Looking For", "Best", "Good", "Great", "New", "Old",
]);

// Single common words that are street/station names but not venues
const COMMON_SINGLE_WORDS = new Set([
  "College", "Queen", "King", "Union", "Bay", "Church", "Front",
  "Main", "Park", "Market", "Lawrence", "Finch", "Jane",
]);

export function extractVenuesFromText(text: string): string[] {
  const names = new Set<string>();

  // Quoted names
  const quoted = text.matchAll(/["']([A-Z][A-Za-z\s&'.-]{2,30})["']/g);
  for (const m of quoted) names.add(m[1].trim());

  // at/from/called/try/visit patterns
  const atFrom = text.matchAll(
    /(?:at|from|called|try|tried|visit|visited)\s+([A-Z][A-Za-z\s&'.-]{2,30})(?:[,.\s!?]|$)/g
  );
  for (const m of atFrom) {
    const name = m[1].trim().replace(/[.\s]+$/, "");
    if (name.split(/\s+/).length <= 5) names.add(name);
  }

  // "went to X"
  const wentTo = text.matchAll(/went to\s+([A-Z][A-Za-z\s&'.-]{2,30})(?:[,.\s!?]|$)/g);
  for (const m of wentTo) {
    const name = m[1].trim().replace(/[.\s]+$/, "");
    if (name.split(/\s+/).length <= 5) names.add(name);
  }

  // "love X"
  const love = text.matchAll(/(?:love|loved|loving)\s+([A-Z][A-Za-z\s&'.-]{2,30})(?:[,.\s!?]|$)/g);
  for (const m of love) {
    const name = m[1].trim().replace(/[.\s]+$/, "");
    if (name.split(/\s+/).length <= 5) names.add(name);
  }

  // "recommend X" / "check out X" / "hit up X"
  const recommend = text.matchAll(/(?:recommend|suggesting|check out|hit up)\s+([A-Z][A-Za-z\s&'.-]{2,30})(?:[,.\s!?]|$)/g);
  for (const m of recommend) {
    const name = m[1].trim().replace(/[.\s]+$/, "");
    if (name.split(/\s+/).length <= 5) names.add(name);
  }

  // "X is great/amazing/good/awesome"
  const isGreat = text.matchAll(/([A-Z][A-Za-z\s&'.-]{2,30})\s+is\s+(?:great|amazing|good|awesome|excellent|fantastic|incredible|outstanding|wonderful)/g);
  for (const m of isGreat) {
    const name = m[1].trim().replace(/[.\s]+$/, "");
    if (name.split(/\s+/).length <= 5) names.add(name);
  }

  // "ate at X" / "dinner at X" / "lunch at X" / "brunch at X"
  const mealAt = text.matchAll(/(?:ate at|eating at|dinner at|lunch at|brunch at|breakfast at)\s+([A-Z][A-Za-z\s&'.-]{2,30})(?:[,.\s!?]|$)/g);
  for (const m of mealAt) {
    const name = m[1].trim().replace(/[.\s]+$/, "");
    if (name.split(/\s+/).length <= 5) names.add(name);
  }

  return [...names].filter((n) => {
    if (n.length < 3) return false;
    if (BLOCKLIST.has(n)) return false;
    if (n.split(/\s+/).length === 1 && COMMON_SINGLE_WORDS.has(n)) return false;
    if (n.split(/\s+/).length > 5) return false;
    return true;
  });
}

// Keep old regex extraction as fallback
export function extractRestaurantNames(
  title: string,
  selftext: string
): string[] {
  const text = `${title}\n${selftext}`;
  return extractVenuesFromText(text);
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
    if (!isInToronto(lat, lng)) return null;

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
  category: PlaceCategory = "restaurant",
  metadata?: Record<string, string>,
  mentionsInThread: number = 1
): Promise<void> {
  const sql = getDb();

  const metadataJson = metadata ? JSON.stringify(metadata) : null;

  let restaurantId: number;
  try {
    const rows = await sql`
      INSERT INTO restaurants (name, place_id, address, lat, lng, google_rating, google_reviews_count, category, metadata)
      VALUES (${place.name}, ${place.place_id}, ${place.address}, ${place.lat}, ${place.lng}, ${place.rating}, ${place.reviews_count}, ${category}, ${metadataJson}::jsonb)
      ON CONFLICT (place_id) DO UPDATE SET
        name = EXCLUDED.name,
        address = EXCLUDED.address,
        category = EXCLUDED.category,
        metadata = COALESCE(EXCLUDED.metadata, restaurants.metadata)
      RETURNING id
    `;
    restaurantId = rows[0].id;
  } catch {
    // Fallback if category/metadata columns don't exist yet
    const rows = await sql`
      INSERT INTO restaurants (name, place_id, address, lat, lng, google_rating, google_reviews_count)
      VALUES (${place.name}, ${place.place_id}, ${place.address}, ${place.lat}, ${place.lng}, ${place.rating}, ${place.reviews_count})
      ON CONFLICT (place_id) DO UPDATE SET
        name = EXCLUDED.name,
        address = EXCLUDED.address
      RETURNING id
    `;
    restaurantId = rows[0].id;
  }

  try {
    await sql`
      INSERT INTO post_restaurants (post_id, restaurant_id, mention_context, sentiment, mentions_in_thread)
      VALUES (${postId}, ${restaurantId}, ${context}, ${sentiment}, ${mentionsInThread})
      ON CONFLICT (post_id, restaurant_id) DO UPDATE SET
        mentions_in_thread = GREATEST(post_restaurants.mentions_in_thread, EXCLUDED.mentions_in_thread)
    `;
  } catch {
    // Fallback if mentions_in_thread column doesn't exist yet
    await sql`
      INSERT INTO post_restaurants (post_id, restaurant_id, mention_context, sentiment)
      VALUES (${postId}, ${restaurantId}, ${context}, ${sentiment})
      ON CONFLICT (post_id, restaurant_id) DO NOTHING
    `;
  }
}

/**
 * Count case-insensitive occurrences of a name in text.
 */
export function countMentions(name: string, text: string): number {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\b${escaped}\\b`, "gi");
  return (text.match(re) || []).length;
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
