import { getDb } from "./db";
import type { PlaceCategory } from "./types";
import { VALID_CATEGORIES } from "./constants";
import { delay, isInToronto } from "./utils";

interface ExtractedVenue {
  name: string;
  category: PlaceCategory;
}

const VALID_CATEGORIES_SET = new Set(VALID_CATEGORIES);

const EXTRACTION_PROMPT = (text: string) =>
  `Extract ALL specifically named places in Toronto from this text — not just food. Include: restaurants, bars, cafes, clubs, parks, shops, gyms, music venues, markets, museums, galleries, bookstores, record stores, spas, skating rinks, beaches, trails, entertainment venues, sports facilities, community centres, hotels, theatres — anything with a real name that someone might visit. Do NOT include generic terms like "a restaurant" or "some bar". Only real named places.\n\nReturn JSON array: [{"name": "Exact Place Name", "category": "restaurant|bar|cafe|club|shop|park|gym|venue|market|museum|other"}]\nReturn [] if no specific named places found. Max 10. Return ONLY the JSON array.\n\nText:\n${text.slice(0, 4000)}`;

function parseVenueResponse(content: string): ExtractedVenue[] {
  const match = content.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
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

export async function extractVenuesWithAI(text: string): Promise<ExtractedVenue[]> {
  const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
  const ollamaModel = process.env.OLLAMA_MODEL || "gemma4:e4b";
  const prompt = EXTRACTION_PROMPT(text);

  // Try Ollama first
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const res = await fetch(`${ollamaUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ollamaModel,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (res.ok) {
      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content || "[]";
      const venues = parseVenueResponse(content);
      if (venues.length > 0) {
        console.log(`[Ollama/${ollamaModel}] extracted ${venues.length} venues`);
        return venues;
      }
    }
  } catch {
    // Ollama unavailable or timed out — fall through to Anthropic
  }

  // Fall back to Anthropic
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return [];

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
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) return [];
    const data = await res.json();
    const content = data?.content?.[0]?.text || "[]";
    return parseVenueResponse(content);
  } catch {
    return [];
  }
}


export function extractVenuesFromText(text: string): string[] {
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

  const wentTo = text.matchAll(/went to\s+([A-Z][A-Za-z\s&'.-]{2,30})(?:[,.\s!?]|$)/g);
  for (const m of wentTo) {
    const name = m[1].trim().replace(/[.\s]+$/, "");
    if (name.split(/\s+/).length <= 5) names.add(name);
  }

  const love = text.matchAll(/(?:love|loved|loving)\s+([A-Z][A-Za-z\s&'.-]{2,30})(?:[,.\s!?]|$)/g);
  for (const m of love) {
    const name = m[1].trim().replace(/[.\s]+$/, "");
    if (name.split(/\s+/).length <= 5) names.add(name);
  }

  const recommend = text.matchAll(/(?:recommend|suggesting|check out|hit up)\s+([A-Z][A-Za-z\s&'.-]{2,30})(?:[,.\s!?]|$)/g);
  for (const m of recommend) {
    const name = m[1].trim().replace(/[.\s]+$/, "");
    if (name.split(/\s+/).length <= 5) names.add(name);
  }

  const isGreat = text.matchAll(/([A-Z][A-Za-z\s&'.-]{2,30})\s+is\s+(?:great|amazing|good|awesome|excellent|fantastic|incredible|outstanding|wonderful)/g);
  for (const m of isGreat) {
    const name = m[1].trim().replace(/[.\s]+$/, "");
    if (name.split(/\s+/).length <= 5) names.add(name);
  }

  const mealAt = text.matchAll(/(?:ate at|eating at|dinner at|lunch at|brunch at|breakfast at)\s+([A-Z][A-Za-z\s&'.-]{2,30})(?:[,.\s!?]|$)/g);
  for (const m of mealAt) {
    const name = m[1].trim().replace(/[.\s]+$/, "");
    if (name.split(/\s+/).length <= 5) names.add(name);
  }

  // Publication headline patterns
  // "X is opening/closing/now open in Toronto"
  const openingClosing = text.matchAll(
    /([A-Z][A-Za-z\s&'.-]{2,40})\s+(?:is|has|will|just)\s+(?:opening|closing|opened|closed|now open|coming)/g
  );
  for (const m of openingClosing) {
    const name = m[1].trim().replace(/[.\s]+$/, "");
    if (name.split(/\s+/).length <= 6) names.add(name);
  }

  // "X just opened in [neighbourhood/Toronto]"
  const justOpened = text.matchAll(
    /([A-Z][A-Za-z\s&'.-]{2,40})\s+(?:just|has just|recently)\s+opened/g
  );
  for (const m of justOpened) {
    const name = m[1].trim().replace(/[.\s]+$/, "");
    if (name.split(/\s+/).length <= 6) names.add(name);
  }

  // "Toronto's X is..." — possessive headline form
  const torontosPossessive = text.matchAll(/Toronto['']s\s+([A-Z][A-Za-z\s&'.-]{2,40})\s+is\b/g);
  for (const m of torontosPossessive) {
    const name = m[1].trim().replace(/[.\s]+$/, "");
    if (name.split(/\s+/).length <= 6) names.add(name);
  }

  // "Why X is Toronto's best/favourite..."
  const whyX = text.matchAll(/[Ww]hy\s+([A-Z][A-Za-z\s&'.-]{2,40})\s+is\s+Toronto['']s/g);
  for (const m of whyX) {
    const name = m[1].trim().replace(/[.\s]+$/, "");
    if (name.split(/\s+/).length <= 6) names.add(name);
  }

  // "new X in Toronto/[neighbourhood]" where X starts with uppercase
  const newIn = text.matchAll(/[Nn]ew\s+([A-Z][A-Za-z\s&'.-]{2,40})\s+(?:in|opens in|coming to)\s+(?:Toronto|[A-Z])/g);
  for (const m of newIn) {
    const name = m[1].trim().replace(/[.\s]+$/, "");
    if (name.split(/\s+/).length <= 6) names.add(name);
  }

  return [...names].filter((n) => {
    if (n.length < 3) return false;
    if (n.split(/\s+/).length > 5) return false;
    return true;
  });
}

/** @deprecated Use extractVenuesFromText instead */
export function extractRestaurantNames(title: string, selftext: string): string[] {
  return extractVenuesFromText(`${title}\n${selftext}`);
}

export interface PlaceResult {
  name: string;
  place_id: string;
  address: string;
  lat: number;
  lng: number;
  rating: number | null;
  reviews_count: number | null;
}

export async function geocodePlace(
  name: string,
  _category: PlaceCategory = "other"
): Promise<PlaceResult | null> {
  try {
    const q = encodeURIComponent(`${name} Toronto`);
    const res = await fetch(
      `https://photon.komoot.io/api/?q=${q}&lat=43.6532&lon=-79.3832&limit=1`,
      { headers: { "User-Agent": "BuzzMaps/1.0" } }
    );
    const data = await res.json();
    if (!data?.features?.length) return null;

    const feature = data.features[0];
    const [lng, lat] = feature.geometry.coordinates;
    if (!isInToronto(lat, lng)) return null;

    const props = feature.properties;
    const shortName: string = props.name || name;
    const addressParts = [props.housenumber, props.street, props.city || "Toronto"].filter(Boolean);
    const displayName = addressParts.length > 1 ? addressParts.join(" ") : shortName;
    await delay(1100);

    return {
      name: shortName,
      place_id: `osm_${props.osm_id}`,
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

/** @deprecated Use geocodePlace instead */
export const geocodeRestaurant = geocodePlace;

export async function savePlace(
  place: PlaceResult,
  postId: number,
  context: string,
  sentiment: string,
  category: PlaceCategory = "other",
  metadata?: Record<string, string>,
  mentionsInThread: number = 1
): Promise<void> {
  const sql = getDb();
  const metadataJson = metadata ? JSON.stringify(metadata) : null;

  let placeId: number;
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
    placeId = rows[0].id;
  } catch {
    const rows = await sql`
      INSERT INTO restaurants (name, place_id, address, lat, lng, google_rating, google_reviews_count)
      VALUES (${place.name}, ${place.place_id}, ${place.address}, ${place.lat}, ${place.lng}, ${place.rating}, ${place.reviews_count})
      ON CONFLICT (place_id) DO UPDATE SET
        name = EXCLUDED.name,
        address = EXCLUDED.address
      RETURNING id
    `;
    placeId = rows[0].id;
  }

  try {
    await sql`
      INSERT INTO post_restaurants (post_id, restaurant_id, mention_context, sentiment, mentions_in_thread)
      VALUES (${postId}, ${placeId}, ${context}, ${sentiment}, ${mentionsInThread})
      ON CONFLICT (post_id, restaurant_id) DO UPDATE SET
        mentions_in_thread = GREATEST(post_restaurants.mentions_in_thread, EXCLUDED.mentions_in_thread)
    `;
  } catch {
    await sql`
      INSERT INTO post_restaurants (post_id, restaurant_id, mention_context, sentiment)
      VALUES (${postId}, ${placeId}, ${context}, ${sentiment})
      ON CONFLICT (post_id, restaurant_id) DO NOTHING
    `;
  }
}

/** @deprecated Use savePlace instead */
export const saveRestaurant = savePlace;

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
