import { getDb } from "@/lib/db";
import { PUBLICATION_NAMES } from "@/lib/constants";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;

  const sql = getDb();

  // 1. Count posts by source type
  const [totals] = await sql`
    SELECT
      COUNT(*) FILTER (WHERE reddit_id LIKE 'pub_%') AS publication_posts,
      COUNT(*) FILTER (WHERE reddit_id NOT LIKE 'pub_%') AS reddit_posts,
      COUNT(*) AS total_posts
    FROM reddit_posts
  `;

  // 2. Publication posts broken down by publication name, with linked places
  const pubBreakdown = await sql`
    SELECT
      rp.subreddit AS source,
      COUNT(DISTINCT rp.id) AS articles,
      COUNT(DISTINCT pr.restaurant_id) AS linked_places
    FROM reddit_posts rp
    LEFT JOIN post_restaurants pr ON pr.post_id = rp.id
    WHERE rp.reddit_id LIKE 'pub_%'
    GROUP BY rp.subreddit
    ORDER BY articles DESC
  `;

  // 3. Sample places that have at least one publication mention
  const samplePlaces = await sql`
    SELECT DISTINCT r.name, r.category, rp.subreddit AS source, rp.title AS article_title
    FROM restaurants r
    JOIN post_restaurants pr ON pr.restaurant_id = r.id
    JOIN reddit_posts rp ON rp.id = pr.post_id
    WHERE rp.reddit_id LIKE 'pub_%'
    ORDER BY r.name
    LIMIT 20
  `;

  // 4. Which publication names in the DB are not in PUBLICATION_NAMES set (would show as Reddit)
  const allPubSources = await sql`
    SELECT DISTINCT subreddit FROM reddit_posts WHERE reddit_id LIKE 'pub_%' ORDER BY subreddit
  `;
  const unrecognised = (allPubSources as Record<string, string>[])
    .map((r) => r.subreddit)
    .filter((s) => !PUBLICATION_NAMES.has(s));

  return Response.json({
    summary: {
      publication_posts: Number(totals.publication_posts),
      reddit_posts: Number(totals.reddit_posts),
      total_posts: Number(totals.total_posts),
    },
    by_publication: (pubBreakdown as Record<string, unknown>[]).map((r) => ({
      source: r.source,
      articles: Number(r.articles),
      linked_places: Number(r.linked_places),
    })),
    sample_places_with_publication_mentions: samplePlaces,
    unrecognised_as_publications: unrecognised,
    note: "Unrecognised sources will display as Reddit posts (r/...) instead of publication badge",
  });
}
