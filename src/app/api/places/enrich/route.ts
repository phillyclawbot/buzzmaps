import { getDb } from "@/lib/db";
import { enrichPhoto } from "@/lib/photos";
import type { PhotoSource } from "@/lib/photos";
import { delay } from "@/lib/utils";

export const maxDuration = 60;

export async function GET(req: Request) {
  const sql = getDb();
  const url = new URL(req.url);
  const limit = Math.min(Math.max(1, parseInt(url.searchParams.get("limit") || "15", 10) || 15), 50);
  const city = url.searchParams.get("city") || "toronto";
  const force = url.searchParams.get("force") === "true";

  try {
    // Find places to enrich
    const places = force
      ? await sql`
          SELECT id, name, lat, lng, category, photo_url FROM restaurants
          ORDER BY first_seen_at DESC
          LIMIT ${limit}
        `
      : await sql`
          SELECT id, name, lat, lng, category, photo_url FROM restaurants
          WHERE photo_url IS NULL
             OR photo_url LIKE '%unsplash.com%'
             OR photo_url LIKE '%wikimedia.org%'
          ORDER BY first_seen_at DESC
          LIMIT ${limit}
        `;

    let enriched = 0;
    let upgraded = 0;
    const sources: Record<PhotoSource, number> = {
      wikidata: 0,
      wikipedia: 0,
      foursquare: 0,
      wikimedia: 0,
      yelp: 0,
      unsplash: 0,
    };

    // Source priority for upgrade decisions (lower = better)
    const priority: Record<string, number> = {
      wikidata: 0,
      wikipedia: 1,
      foursquare: 2,
      wikimedia: 3,
      yelp: 4,
      unsplash: 5,
    };

    for (const p of places) {
      const result = await enrichPhoto(
        { id: p.id, name: p.name, lat: p.lat, lng: p.lng, category: p.category || "other" },
        city
      );

      sources[result.source]++;

      // Determine current source from URL
      const currentUrl: string | null = p.photo_url;
      let currentPriority = 6; // no photo
      if (currentUrl) {
        // Special:FilePath URLs come from Wikidata SPARQL results
        if (currentUrl.includes("Special:FilePath")) currentPriority = priority.wikidata;
        else if (currentUrl.includes("wikipedia.org")) currentPriority = priority.wikipedia;
        else if (currentUrl.includes("4sqi.net") || currentUrl.includes("foursquare")) currentPriority = priority.foursquare;
        else if (currentUrl.includes("wikimedia.org")) currentPriority = priority.wikimedia;
        else if (currentUrl.includes("yelpcdn.com")) currentPriority = priority.yelp;
        else if (currentUrl.includes("unsplash.com")) currentPriority = priority.unsplash;
      }

      const newPriority = priority[result.source] ?? 4;

      // Update if: no photo, or new source is better priority
      if (!currentUrl || newPriority < currentPriority) {
        await sql`UPDATE restaurants SET photo_url = ${result.url} WHERE id = ${p.id}`;
        if (result.source !== "unsplash") enriched++;
        if (currentUrl && newPriority < currentPriority) upgraded++;
      }

      await delay(1500); // respect rate limits across all sources
    }

    return Response.json({
      enriched,
      upgraded,
      total_checked: places.length,
      sources,
    });
  } catch (err) {
    console.error("GET /api/places/enrich error:", err);
    return Response.json({ error: "Failed to enrich photos" }, { status: 500 });
  }
}
