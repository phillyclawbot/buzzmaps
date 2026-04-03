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
      // skip duplicates or errors
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

    for (const sub of subreddits) {
      try {
        const { posts } = await fetchSubredditPosts(sub.name, 100);
        const savedIds = await savePosts(posts);
        totalPosts += savedIds.length;

        for (const id of savedIds) {
          const post = posts.find(
            (_, i) =>
              posts.filter((p) => p.is_food_related).indexOf(posts.filter((p) => p.is_food_related)[i]) !== -1
          );
          // Re-fetch the saved post to get title/selftext
          const rows = await sql`SELECT title, selftext, sentiment FROM reddit_posts WHERE id = ${id}`;
          if (rows.length) {
            const found = await processPostForRestaurants(
              id,
              rows[0].title,
              rows[0].selftext || "",
              rows[0].sentiment
            );
            totalRestaurants += found;
          }
        }

        // Update last scraped
        await sql`
          UPDATE subreddits SET last_scraped_at = NOW() WHERE name = ${sub.name}
        `;
      } catch {
        // continue with next subreddit
      }
    }

    return Response.json({
      success: true,
      posts_saved: totalPosts,
      restaurants_found: totalRestaurants,
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
