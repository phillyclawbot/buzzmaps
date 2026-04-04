import { getDb, runMigrations } from "@/lib/db";
import { fetchSubredditPosts, extractSentiment, type RedditPost } from "@/lib/reddit";
import {
  extractVenuesWithAI,
  extractRestaurantNames,
  geocodeRestaurant,
  saveRestaurant,
  fetchPostComments,
} from "@/lib/extract-restaurants";

async function savePosts(posts: RedditPost[]): Promise<number[]> {
  const sql = getDb();
  const ids: number[] = [];

  for (const p of posts) {
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
    let totalPlaces = 0;
    const progress: Record<string, { posts: number; places: number }> = {};

    for (const sub of subreddits) {
      let after: string | null = null;
      let fetched = 0;
      progress[sub.name] = { posts: 0, places: 0 };

      while (fetched < 500) {
        try {
          const result = await fetchSubredditPosts(sub.name, 100, after || undefined);
          if (!result.posts.length) break;

          const savedIds = await savePosts(result.posts);
          totalPosts += savedIds.length;
          progress[sub.name].posts += savedIds.length;

          for (const id of savedIds) {
            const rows = await sql`SELECT title, selftext, sentiment, subreddit, reddit_id FROM reddit_posts WHERE id = ${id}`;
            if (rows.length) {
              const row = rows[0];
              const commentText = await fetchPostComments(row.subreddit, row.reddit_id);
              await new Promise((r) => setTimeout(r, 1000));

              const combinedText = `${row.title}\n${row.selftext || ""}\n${commentText}`;

              let venues = await extractVenuesWithAI(combinedText);
              if (venues.length === 0) {
                const names = extractRestaurantNames(row.title, combinedText);
                venues = names.map((name) => ({ name, category: "restaurant" as const }));
              }

              const sentiment = extractSentiment(row.title, combinedText);

              for (const venue of venues.slice(0, 8)) {
                const place = await geocodeRestaurant(venue.name, venue.category);
                if (place) {
                  await saveRestaurant(place, id, row.title.slice(0, 200), sentiment, venue.category);
                  totalPlaces++;
                  progress[sub.name].places++;
                }
              }
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
      total_places: totalPlaces,
      progress,
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
