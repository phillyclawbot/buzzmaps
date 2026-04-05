import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const sql = getDb();

    const [restaurantCount] = await sql`SELECT COUNT(*)::int as count FROM restaurants`;
    const [postCount] = await sql`SELECT COUNT(*)::int as count FROM reddit_posts`;
    const [lastScraped] = await sql`SELECT MAX(last_scraped_at) as last_scraped FROM subreddits`;

    return Response.json({
      restaurants: restaurantCount.count,
      posts: postCount.count,
      last_scraped: lastScraped.last_scraped,
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
