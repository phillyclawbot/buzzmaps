import { getDb, runMigrations } from "@/lib/db";
import { fetchSubredditPosts, type RedditPost } from "@/lib/reddit";
import { processPostForRestaurants } from "@/lib/extract-restaurants";

async function savePosts(posts: RedditPost[]): Promise<number[]> {
  const sql = getDb();
  const ids: number[] = [];

  for (const p of posts) {
    if (!p.is_food_related) continue;
    try {
      const rows = await sql`
        INSERT INTO reddit_posts (reddit_id, subreddit, title, selftext, author, url, permalink, score, num_comments, is_food_related, sentiment, created_utc)
        VALUES (${p.reddit_id}, ${p.subreddit}, ${p.title}, ${p.selftext}, ${p.author}, ${p.url}, ${p.permalink}, ${p.score}, ${p.num_comments}, ${p.is_food_related}, ${p.sentiment}, ${p.created_utc})
        ON CONFLICT (reddit_id) DO UPDATE SET score = EXCLUDED.score, num_comments = EXCLUDED.num_comments
        RETURNING id
      `;
      ids.push(rows[0].id);
    } catch {
      // skip
    }
  }
  return ids;
}

export async function GET() {
  try {
    await runMigrations();
    const sql = getDb();

    const subreddits = await sql`SELECT name FROM subreddits`;
    let totalPosts = 0;
    let totalRestaurants = 0;
    const progress: Record<string, { posts: number; restaurants: number }> = {};

    for (const sub of subreddits) {
      let after: string | null = null;
      let fetched = 0;
      progress[sub.name] = { posts: 0, restaurants: 0 };

      while (fetched < 500) {
        try {
          const result = await fetchSubredditPosts(sub.name, 100, after || undefined);
          if (!result.posts.length) break;

          const savedIds = await savePosts(result.posts);
          totalPosts += savedIds.length;
          progress[sub.name].posts += savedIds.length;

          for (const id of savedIds) {
            const rows = await sql`SELECT title, selftext, sentiment FROM reddit_posts WHERE id = ${id}`;
            if (rows.length) {
              const found = await processPostForRestaurants(id, rows[0].title, rows[0].selftext || "", rows[0].sentiment);
              totalRestaurants += found;
              progress[sub.name].restaurants += found;
            }
          }

          after = result.after;
          fetched += result.posts.length;
          if (!after) break;

          await new Promise((r) => setTimeout(r, 1000));
        } catch {
          break;
        }
      }

      await sql`UPDATE subreddits SET last_scraped_at = NOW() WHERE name = ${sub.name}`;
    }

    return Response.json({
      success: true,
      total_posts: totalPosts,
      total_restaurants: totalRestaurants,
      progress,
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
