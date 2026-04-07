import { getDb, runMigrations } from "@/lib/db";
import { NextRequest } from "next/server";
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE, MAX_SEARCH_QUERY_LENGTH } from "@/lib/constants";

let migrated = false;

async function ensureMigrations() {
  if (migrated) return;
  try {
    await runMigrations();
  } catch (e) {
    console.error("Migration error (non-fatal):", e);
  }
  migrated = true;
}

export async function GET(request: NextRequest) {
  await ensureMigrations();

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

    // Try query with mentions_in_thread; fall back without it if column missing
    let restaurants;
    try {
      restaurants = await sql`
        SELECT
          r.id, r.name, r.place_id, r.address, r.lat, r.lng,
          r.google_rating, r.google_reviews_count, r.cuisine_type, r.price_level,
          r.category, r.photo_url, r.metadata,
          COUNT(DISTINCT pr.post_id) as mention_count,
          COALESCE(MAX(rp.created_utc), 0) as latest_mention,
          COALESCE(json_agg(json_build_object(
            'id', rp.id,
            'title', rp.title,
            'subreddit', rp.subreddit,
            'score', rp.score,
            'num_comments', rp.num_comments,
            'permalink', rp.permalink,
            'sentiment', pr.sentiment,
            'created_utc', rp.created_utc,
            'mentions_in_thread', COALESCE(pr.mentions_in_thread, 1)
          ) ORDER BY rp.created_utc DESC) FILTER (WHERE rp.id IS NOT NULL), '[]'::json) as posts
        FROM restaurants r
        LEFT JOIN post_restaurants pr ON pr.restaurant_id = r.id
        LEFT JOIN reddit_posts rp ON rp.id = pr.post_id
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
    } catch (innerErr) {
      console.error("Query with mentions_in_thread failed, falling back:", innerErr);
      // Fallback: query without mentions_in_thread
      restaurants = await sql`
        SELECT
          r.id, r.name, r.place_id, r.address, r.lat, r.lng,
          r.google_rating, r.google_reviews_count, r.cuisine_type, r.price_level,
          r.category, r.photo_url, r.metadata,
          COUNT(DISTINCT pr.post_id) as mention_count,
          COALESCE(MAX(rp.created_utc), 0) as latest_mention,
          COALESCE(json_agg(json_build_object(
            'id', rp.id,
            'title', rp.title,
            'subreddit', rp.subreddit,
            'score', rp.score,
            'num_comments', rp.num_comments,
            'permalink', rp.permalink,
            'sentiment', pr.sentiment,
            'created_utc', rp.created_utc
          ) ORDER BY rp.created_utc DESC) FILTER (WHERE rp.id IS NOT NULL), '[]'::json) as posts
        FROM restaurants r
        LEFT JOIN post_restaurants pr ON pr.restaurant_id = r.id
        LEFT JOIN reddit_posts rp ON rp.id = pr.post_id
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
    }

    return Response.json(restaurants);
  } catch (err) {
    console.error("GET /api/places error:", err);
    return Response.json([], { status: 200 });
  }
}
