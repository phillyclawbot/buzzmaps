import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { TORONTO_BOUNDS, VALID_CATEGORIES } from "@/lib/constants";
import { delay, isInToronto } from "@/lib/utils";

async function geocodeAddress(address: string, name: string): Promise<{ lat: number; lng: number; displayName: string } | null> {
  try {
    const q = encodeURIComponent(`${address} Toronto Ontario Canada`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=ca`,
      { headers: { "User-Agent": "BuzzMaps/1.0" } }
    );
    const data = await res.json();
    if (!data?.length) {
      // Try just the name if address failed
      const q2 = encodeURIComponent(`${name} Toronto Ontario`);
      await delay(1100);
      const res2 = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${q2}&format=json&limit=1&countrycodes=ca`,
        { headers: { "User-Agent": "BuzzMaps/1.0" } }
      );
      const data2 = await res2.json();
      if (!data2?.length) return null;
      const place = data2[0];
      const lat = parseFloat(place.lat);
      const lng = parseFloat(place.lon);
      if (!isInToronto(lat, lng)) return null;
      return { lat, lng, displayName: place.display_name || address };
    }
    const place = data[0];
    const lat = parseFloat(place.lat);
    const lng = parseFloat(place.lon);
    if (!isInToronto(lat, lng)) return null;
    return { lat, lng, displayName: place.display_name || address };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, category, address, reason, eventDate, ticketUrl } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Place name is required" }, { status: 400 });
    }
    if (name.trim().length > 100) {
      return NextResponse.json({ error: "Place name must be 100 characters or less" }, { status: 400 });
    }
    if (address && typeof address === "string" && address.length > 300) {
      return NextResponse.json({ error: "Address must be 300 characters or less" }, { status: 400 });
    }
    if (reason && typeof reason === "string" && reason.length > 500) {
      return NextResponse.json({ error: "Reason must be 500 characters or less" }, { status: 400 });
    }

    const sql = getDb();

    // Geocode the address
    const geo = await geocodeAddress(address || name, name.trim());

    let lat: number;
    let lng: number;
    let displayAddress: string;

    if (geo) {
      lat = geo.lat;
      lng = geo.lng;
      displayAddress = geo.displayName;
    } else {
      // Default to downtown Toronto if geocoding fails
      lat = 43.6532 + (Math.random() - 0.5) * 0.05;
      lng = -79.3832 + (Math.random() - 0.5) * 0.05;
      displayAddress = address || "Toronto, ON";
    }

    const placeId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const safeCategory = (VALID_CATEGORIES as readonly string[]).includes(category) ? category : "other";

    // Build metadata for events
    const metadata: Record<string, string> = {};
    if (safeCategory === "event") {
      if (eventDate && typeof eventDate === "string") metadata.event_date = eventDate;
      if (ticketUrl && typeof ticketUrl === "string") metadata.ticket_url = ticketUrl;
    }
    const metadataJson = Object.keys(metadata).length > 0 ? JSON.stringify(metadata) : null;

    // Save to restaurants table
    const restaurantRows = await sql`
      INSERT INTO restaurants (name, place_id, address, lat, lng, category, metadata)
      VALUES (${name.trim()}, ${placeId}, ${displayAddress}, ${lat}, ${lng}, ${safeCategory}, ${metadataJson}::jsonb)
      ON CONFLICT (place_id) DO UPDATE SET
        name = EXCLUDED.name,
        address = EXCLUDED.address,
        metadata = COALESCE(EXCLUDED.metadata, restaurants.metadata)
      RETURNING id, name, place_id, address, lat, lng, category
    `;
    const restaurant = restaurantRows[0];

    // Create a reddit_posts row for the user submission
    const titleText = reason
      ? `User submission: ${name.trim()} — ${reason.slice(0, 100)}`
      : `User submission: ${name.trim()}`;

    const postRows = await sql`
      INSERT INTO reddit_posts (reddit_id, subreddit, title, selftext, author, url, permalink, score, num_comments, is_food_related, sentiment, created_utc)
      VALUES (
        ${placeId},
        'user_submission',
        ${titleText},
        ${reason || ""},
        'BuzzMaps User',
        ${"https://buzzmaps.vercel.app"},
        ${"/user_submission"},
        5,
        0,
        true,
        'positive',
        ${Math.floor(Date.now() / 1000)}
      )
      ON CONFLICT (reddit_id) DO NOTHING
      RETURNING id
    `;

    if (postRows.length > 0) {
      const postId = postRows[0].id;
      // Link post to restaurant
      await sql`
        INSERT INTO post_restaurants (post_id, restaurant_id, mention_context, sentiment)
        VALUES (${postId}, ${restaurant.id}, ${reason || "User submitted place"}, 'positive')
        ON CONFLICT (post_id, restaurant_id) DO NOTHING
      `;
    }

    return NextResponse.json({
      success: true,
      place: {
        id: restaurant.id,
        name: restaurant.name,
        address: restaurant.address,
        lat: restaurant.lat,
        lng: restaurant.lng,
        category: restaurant.category,
      },
    });
  } catch (err) {
    console.error("Submit place error:", err);
    return NextResponse.json({ error: "Failed to save place" }, { status: 500 });
  }
}
