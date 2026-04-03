import { getDb } from "./db";

const TORONTO_STREETS = [
  "queen", "king", "bloor", "dundas", "college", "bathurst", "ossington",
  "spadina", "yonge", "bay", "church", "jarvis", "parliament", "broadview",
  "danforth", "st clair", "eglinton", "lawrence", "dupont", "davenport",
  "harbord", "wellesley", "carlton", "gerrard", "front", "wellington",
  "adelaide", "richmond", "temperance", "lombard", "roncesvalles", "lansdowne",
  "dufferin", "dovercourt", "shaw", "crawford", "euclid", "palmerston",
];

export function extractRestaurantNames(
  title: string,
  selftext: string
): string[] {
  const text = `${title}\n${selftext}`;
  const names = new Set<string>();

  // Quoted names: "Restaurant Name" or 'Restaurant Name'
  const quoted = text.matchAll(/["']([A-Z][A-Za-z\s&'.-]{2,30})["']/g);
  for (const m of quoted) names.add(m[1].trim());

  // "at Name", "from Name", "called Name"
  const atFrom = text.matchAll(
    /(?:at|from|called|try|tried|visit|visited)\s+([A-Z][A-Za-z\s&'.-]{2,30})(?:[,.\s!?]|$)/g
  );
  for (const m of atFrom) {
    const name = m[1].trim().replace(/[.\s]+$/, "");
    if (name.split(/\s+/).length <= 5) names.add(name);
  }

  // "Name on Street"
  const streetPattern = new RegExp(
    `([A-Z][A-Za-z\\s&'.-]{2,25})\\s+on\\s+(${TORONTO_STREETS.join("|")})`,
    "gi"
  );
  const onStreet = text.matchAll(streetPattern);
  for (const m of onStreet) names.add(m[1].trim());

  // Filter out common false positives
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
  price_level: number | null;
}

export async function geocodeRestaurant(
  name: string
): Promise<PlaceResult | null> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
        name + " restaurant toronto"
      )}&key=${apiKey}`
    );
    const data = await res.json();
    if (!data.results?.length) return null;

    const place = data.results[0];
    return {
      name: place.name,
      place_id: place.place_id,
      address: place.formatted_address,
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
      rating: place.rating || null,
      reviews_count: place.user_ratings_total || null,
      price_level: place.price_level ?? null,
    };
  } catch {
    return null;
  }
}

export async function saveRestaurant(
  place: PlaceResult,
  postId: number,
  context: string,
  sentiment: string
): Promise<void> {
  const sql = getDb();

  // Upsert restaurant
  const rows = await sql`
    INSERT INTO restaurants (name, place_id, address, lat, lng, google_rating, google_reviews_count, price_level)
    VALUES (${place.name}, ${place.place_id}, ${place.address}, ${place.lat}, ${place.lng}, ${place.rating}, ${place.reviews_count}, ${place.price_level})
    ON CONFLICT (place_id) DO UPDATE SET
      google_rating = EXCLUDED.google_rating,
      google_reviews_count = EXCLUDED.google_reviews_count
    RETURNING id
  `;

  const restaurantId = rows[0].id;

  // Link post to restaurant
  await sql`
    INSERT INTO post_restaurants (post_id, restaurant_id, mention_context, sentiment)
    VALUES (${postId}, ${restaurantId}, ${context}, ${sentiment})
    ON CONFLICT (post_id, restaurant_id) DO NOTHING
  `;
}

export async function processPostForRestaurants(
  postId: number,
  title: string,
  selftext: string,
  sentiment: string
): Promise<number> {
  const names = extractRestaurantNames(title, selftext);
  let found = 0;

  for (const name of names.slice(0, 5)) {
    const place = await geocodeRestaurant(name);
    if (place) {
      await saveRestaurant(place, postId, title.slice(0, 200), sentiment);
      found++;
    }
  }

  return found;
}
