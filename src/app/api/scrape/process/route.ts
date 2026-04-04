import { getDb } from "@/lib/db";
import { extractVenuesWithAI, extractRestaurantNames, geocodeRestaurant, saveRestaurant } from "@/lib/extract-restaurants";
import { extractSentiment } from "@/lib/reddit";

export const maxDuration = 60;

export async function GET(req: Request) {
  const sql = getDb();
  const url = new URL(req.url);
  const batch = parseInt(url.searchParams.get("batch") || "15");

  const posts = await sql`
    SELECT rp.id, rp.title, rp.selftext, rp.created_utc, rp.sentiment, rp.score, rp.subreddit
    FROM reddit_posts rp
    WHERE NOT EXISTS (
      SELECT 1 FROM post_restaurants pm WHERE pm.post_id = rp.id
    )
    AND rp.score >= 3
    ORDER BY
      CASE WHEN rp.subreddit IN ('torontofood','FoodToronto','torontofood') THEN 0 ELSE 1 END,
      rp.score DESC
    LIMIT ${batch}
  `;

  let processed = 0, placed = 0;

  for (const p of posts) {
    let venues = await extractVenuesWithAI(`${p.title}\n${p.selftext || ""}`);
    if (venues.length === 0) {
      const names = extractRestaurantNames(p.title, p.selftext || "");
      venues = names.map(name => ({ name, category: "restaurant" as const }));
    }

    const sentiment = extractSentiment(p.title, p.selftext || "");
    for (const venue of venues.slice(0, 6)) {
      const place = await geocodeRestaurant(venue.name, venue.category);
      if (place) {
        await saveRestaurant(place, p.id, p.title.slice(0, 200), sentiment, venue.category);
        placed++;
      }
    }
    processed++;
  }

  const [r, rem] = await Promise.all([
    sql`SELECT COUNT(*) as n FROM restaurants`,
    sql`SELECT COUNT(*) as n FROM reddit_posts rp WHERE NOT EXISTS (SELECT 1 FROM post_restaurants pm WHERE pm.post_id = rp.id) AND rp.score >= 5`
  ]);

  return Response.json({ processed, placed, total_places: Number(r[0].n), remaining: Number(rem[0].n) });
}
