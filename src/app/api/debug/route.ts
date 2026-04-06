import { getDb } from "@/lib/db";
import { extractVenuesWithAI, extractRestaurantNames, geocodeRestaurant } from "@/lib/extract-places";
import { extractSentiment } from "@/lib/reddit";

export async function GET() {
  const sql = getDb();
  
  // Get one promising unprocessed post
  const posts = await sql`
    SELECT rp.id, rp.title, rp.selftext, rp.score, rp.subreddit
    FROM reddit_posts rp
    WHERE NOT EXISTS (SELECT 1 FROM post_restaurants pm WHERE pm.post_id = rp.id)
    AND rp.subreddit IN ('askTO', 'torontofood', 'FoodToronto')
    AND rp.score >= 5
    ORDER BY rp.score DESC
    LIMIT 1
  `;
  
  if (!posts.length) return Response.json({ error: "No posts found" });
  const p = posts[0];
  
  const text = `${p.title}\n${p.selftext || ""}`;
  const venues = await extractVenuesWithAI(text);
  const regexNames = extractRestaurantNames(p.title, p.selftext || "");
  
  let geoResult = null;
  if (venues[0]) {
    geoResult = await geocodeRestaurant(venues[0].name, venues[0].category);
  }
  
  return Response.json({
    post: { id: p.id, title: p.title.slice(0,100), subreddit: p.subreddit, score: p.score },
    venues_from_ai: venues,
    names_from_regex: regexNames,
    geocode_test: geoResult,
  });
}
