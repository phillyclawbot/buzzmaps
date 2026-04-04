import { getDb } from "@/lib/db";
import { enrichWithGoogleRating } from "@/lib/extract-restaurants";

export const maxDuration = 60;

async function fetchPhotoUrl(photoReference: string, apiKey: string): Promise<string | null> {
  try {
    const photoApiUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${encodeURIComponent(photoReference)}&key=${apiKey}`;
    const res = await fetch(photoApiUrl, { redirect: "follow", signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    // The final URL after redirect is the actual photo
    return res.url || null;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const sql = getDb();
  const url = new URL(req.url);
  const limit = parseInt(url.searchParams.get("limit") || "15");
  const photos = url.searchParams.get("photos") === "true";

  if (photos) {
    // Photo enrichment mode
    const apiKey = process.env.GOOGLE_PLACES_API_KEY;
    if (!apiKey) return Response.json({ error: "No API key" }, { status: 500 });

    const places = await sql`
      SELECT id, name, lat, lng FROM restaurants
      WHERE photo_url IS NULL AND photo_reference IS NOT NULL
      ORDER BY mention_count DESC
      LIMIT ${limit}
    `;

    let enriched = 0;
    for (const p of places) {
      // First get the photo_reference from Google Places
      const searchUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${p.lat},${p.lng}&radius=150&keyword=${encodeURIComponent(p.name)}&key=${apiKey}`;
      try {
        const res = await fetch(searchUrl, { signal: AbortSignal.timeout(5000) });
        const data = await res.json();
        const result = data?.results?.[0];
        const photoRef = result?.photos?.[0]?.photo_reference;
        if (photoRef) {
          const photoUrl = await fetchPhotoUrl(photoRef, apiKey);
          if (photoUrl) {
            await sql`UPDATE restaurants SET photo_url = ${photoUrl} WHERE id = ${p.id}`;
            enriched++;
          }
        }
      } catch {
        // Skip on error
      }
      await new Promise(r => setTimeout(r, 300));
    }

    return Response.json({ enriched, total_checked: places.length, mode: "photos" });
  }

  // Default: rating + photo enrichment
  const places = await sql`
    SELECT id, name, lat, lng FROM restaurants
    WHERE google_rating IS NULL
    ORDER BY mention_count DESC
    LIMIT ${limit}
  `;

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  let enriched = 0;
  for (const p of places) {
    const { rating, reviews_count } = await enrichWithGoogleRating(p.name, p.lat, p.lng);
    if (rating !== null) {
      await sql`UPDATE restaurants SET google_rating = ${rating}, google_reviews_count = ${reviews_count} WHERE id = ${p.id}`;
      enriched++;
    }

    // Also try to grab a photo while we're here
    if (apiKey) {
      try {
        const searchUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${p.lat},${p.lng}&radius=150&keyword=${encodeURIComponent(p.name)}&key=${apiKey}`;
        const res = await fetch(searchUrl, { signal: AbortSignal.timeout(5000) });
        const data = await res.json();
        const result = data?.results?.[0];
        const photoRef = result?.photos?.[0]?.photo_reference;
        if (photoRef) {
          const photoUrl = await fetchPhotoUrl(photoRef, apiKey);
          if (photoUrl) {
            await sql`UPDATE restaurants SET photo_url = ${photoUrl} WHERE id = ${p.id}`;
          }
        }
      } catch {
        // Skip photo on error
      }
    }

    await new Promise(r => setTimeout(r, 300));
  }

  return Response.json({ enriched, total_checked: places.length });
}
