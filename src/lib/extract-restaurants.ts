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

// Keep old regex extraction as fallback
export function extractRestaurantNames(
  title: string,
  selftext: string
): string[] {
  const text = `${title}\n${selftext}`;
  const names = new Set<string>();

  const quoted = text.matchAll(/["']([A-Z][A-Za-z\s&'.-]{2,30})["']/g);
  for (const m of quoted) names.add(m[1].trim());

  const atFrom = text.matchAll(
    /(?:at|from|called|try|tried|visit|visited)\s+([A-Z][A-Za-z\s&'.-]{2,30})(?:[,.\s!?]|$)/g
  );
  for (const m of atFrom) {
    const name = m[1].trim().replace(/[.\s]+$/, "");
    if (name.split(/\s+/).length <= 5) names.add(name);
  }

  const falsePositives = new Set([
    "Toronto", "Ontario", "Canada", "Reddit", "The", "This", "That",
    "Anyone", "Everyone", "Someone", "Does Anyone", "Has Anyone",
    "Looking For", "Best", "Good", "Great", "New", "Old",
  ]);

  return [...names].filter(
    (n) => !falsePositives.has(n) && n.length > 2 && n.split(/\s+/).length <= 5
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
