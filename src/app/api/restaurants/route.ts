import { getDb } from "@/lib/db";
import { NextRequest } from "next/server";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, MAX_SEARCH_QUERY_LENGTH } from "@/lib/constants";

export async function GET(request: NextRequest) {
  try {
    const sql = getDb();
    const params = request.nextUrl.searchParams;

    const since = params.get("since") || "all";
    const sentiment = params.get("sentiment") || "all";
    const subreddit = params.get("subreddit") || "all";
    const category = params.get("category") || "all";
    const q = (params.get("q") || "").slice(0, MAX_SEARCH_QUERY_LENGTH);
    const limit = Math.min(
      Math.max(1, parseInt(params.get("limit") || String(DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE),
      MAX_PAGE_SIZE
    );
    const offset = Math.max(0, parseInt(params.get("offset") || "0", 10) || 0);

    const restaurants = await sql`
      SELECT
        r.id, r.name, r.place_id, r.address, r.lat, r.lng,
        r.google_rating, r.google_reviews_count, r.cuisine_type, r.price_level,
        r.category, r.photo_url,
        COUNT(DISTINCT pr.post_id) as mention_count,
        MAX(rp.created_utc) as latest_mention,
        json_agg(json_build_object(
          'id', rp.id,
          'title', rp.title,
          'subreddit', rp.subreddit,
          'score', rp.score,
          'num_comments', rp.num_comments,
          'permalink', rp.permalink,
          'sentiment', pr.sentiment,
          'created_utc', rp.created_utc
        ) ORDER BY rp.created_utc DESC) as posts
      FROM restaurants r
      JOIN post_restaurants pr ON pr.restaurant_id = r.id
      JOIN reddit_posts rp ON rp.id = pr.post_id
      WHERE 1=1
        ${q ? sql`AND r.name ILIKE ${"%" + q + "%"}` : sql``}
        ${sentiment !== "all" ? sql`AND pr.sentiment = ${sentiment}` : sql``}
        ${subreddit !== "all" ? sql`AND rp.subreddit = ${subreddit}` : sql``}
        ${category !== "all" ? sql`AND r.category = ${category}` : sql``}
        ${since === "24h" ? sql`AND rp.created_utc > EXTRACT(EPOCH FROM NOW() - INTERVAL '24 hours')` : sql``}
        ${since === "7d" ? sql`AND rp.created_utc > EXTRACT(EPOCH FROM NOW() - INTERVAL '7 days')` : sql``}
        ${since === "30d" ? sql`AND rp.created_utc > EXTRACT(EPOCH FROM NOW() - INTERVAL '30 days')` : sql``}
      GROUP BY r.id
      ORDER BY latest_mention DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    return Response.json(restaurants);
  } catch (err) {
    console.error("GET /api/restaurants error:", err);
    return Response.json({ error: "Failed to fetch restaurants" }, { status: 500 });
  }
}
