import { getDb } from "@/lib/db";
import { enrichPhoto } from "@/lib/photos";
import { delay } from "@/lib/utils";

export const maxDuration = 60;

export async function GET(req: Request) {
  const sql = getDb();
  const url = new URL(req.url);
  const limit = Math.min(Math.max(1, parseInt(url.searchParams.get("limit") || "15", 10) || 15), 50);
  const city = url.searchParams.get("city") || "toronto";

  try {
    // Find places missing photos or still using generic Unsplash fallbacks
    const places = await sql`
      SELECT id, name, lat, lng, category FROM restaurants
      WHERE photo_url IS NULL OR photo_url LIKE '%unsplash.com%'
      ORDER BY first_seen_at DESC
      LIMIT ${limit}
    `;

    let enriched = 0;
    const sources: Record<string, number> = { wikimedia: 0, yelp: 0, unsplash: 0 };

    for (const p of places) {
      const result = await enrichPhoto(
        { id: p.id, name: p.name, lat: p.lat, lng: p.lng, category: p.category || "other" },
        city
      );

      // Only count as enriched if we found a real photo (not Unsplash fallback)
      if (result.source !== "unsplash" || !p.photo_url) {
        await sql`UPDATE restaurants SET photo_url = ${result.url} WHERE id = ${p.id}`;
        if (result.source !== "unsplash") enriched++;
      }

      sources[result.source]++;
      await delay(1500); // respect rate limits across all sources
    }

    return Response.json({
      enriched,
      total_checked: places.length,
      sources,
    });
  } catch (err) {
    console.error("GET /api/places/enrich error:", err);
    return Response.json({ error: "Failed to enrich photos" }, { status: 500 });
  }
}
