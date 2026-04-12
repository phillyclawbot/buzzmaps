import { getDb, runMigrations } from "@/lib/db";
import { fetchSubredditPosts, extractSentiment } from "@/lib/reddit";
import {
  extractVenuesWithAI,
  extractRestaurantNames,
  geocodeRestaurant,
  saveRestaurant,
  fetchPostComments,
  countMentions,
} from "@/lib/extract-places";
import { scrapePublications } from "@/lib/scrape-publications";
import { requireAdmin } from "@/lib/admin-auth";

export const maxDuration = 60;

export async function GET(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  try {
    await runMigrations();
    const sql = getDb();

    const subreddits = await sql`SELECT name FROM subreddits`;
    let totalPosts = 0;
    let totalPlaces = 0;

    for (const sub of subreddits) {
      try {
        const { posts } = await fetchSubredditPosts(sub.name, 100);

        for (const p of posts) {
          // Save every post (no longer filtering by is_food_related only)
          let postId: number;
          try {
            const rows = await sql`
              INSERT INTO reddit_posts (reddit_id, subreddit, title, selftext, author, url, permalink, score, num_comments, is_food_related, sentiment, created_utc)
              VALUES (${p.reddit_id}, ${p.subreddit}, ${p.title}, ${p.selftext}, ${p.author}, ${p.url}, ${p.permalink}, ${p.score}, ${p.num_comments}, ${p.is_food_related}, ${p.sentiment}, ${p.created_utc})
              ON CONFLICT (reddit_id) DO UPDATE SET score = EXCLUDED.score, num_comments = EXCLUDED.num_comments
              RETURNING id
            `;
            postId = rows[0].id;
          } catch {
            continue;
          }
          totalPosts++;

          // Fetch comments for this post
          const commentText = await fetchPostComments(sub.name, p.reddit_id);
          // Rate limit Reddit
          await new Promise((r) => setTimeout(r, 1000));

          // Combine title + selftext + comments for extraction
          const combinedText = `${p.title}\n${p.selftext}\n${commentText}`;

          // Try AI extraction first, fall back to regex
          let venues = await extractVenuesWithAI(combinedText);
          if (venues.length === 0) {
            const names = extractRestaurantNames(p.title, combinedText);
            venues = names.map((name) => ({ name, category: "restaurant" as const }));
          }

          const sentiment = extractSentiment(p.title, combinedText);

          for (const venue of venues.slice(0, 8)) {
            const place = await geocodeRestaurant(venue.name, venue.category);
            if (place) {
              const threadCount = countMentions(venue.name, combinedText);
              await saveRestaurant(place, postId, p.title.slice(0, 200), sentiment, venue.category, undefined, threadCount);
              totalPlaces++;
            }
          }
        }

        await sql`UPDATE subreddits SET last_scraped_at = NOW() WHERE name = ${sub.name}`;
      } catch {
        // continue with next subreddit
      }
    }

    const pubResults = await scrapePublications();

    return Response.json({
      success: true,
      reddit: { posts_saved: totalPosts, places_found: totalPlaces },
      publications: pubResults,
      totals: {
        posts_saved: totalPosts + pubResults.posts_saved,
        places_found: totalPlaces + pubResults.places_found,
      },
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
