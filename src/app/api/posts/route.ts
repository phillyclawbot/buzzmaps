import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const sql = getDb();

    const posts = await sql`
      SELECT
        rp.id, rp.title, rp.subreddit, rp.score, rp.num_comments,
        rp.permalink, rp.sentiment, rp.created_utc, rp.author,
        json_agg(json_build_object(
          'id', r.id,
          'name', r.name,
          'lat', r.lat,
          'lng', r.lng,
          'sentiment', pr.sentiment
        )) FILTER (WHERE r.id IS NOT NULL) as restaurants
      FROM reddit_posts rp
      LEFT JOIN post_restaurants pr ON pr.post_id = rp.id
      LEFT JOIN restaurants r ON r.id = pr.restaurant_id
      WHERE rp.is_food_related = true
      GROUP BY rp.id
      ORDER BY rp.created_utc DESC
      LIMIT 200
    `;

    return Response.json(posts);
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
