import { getDb, runMigrations } from "@/lib/db";
import { extractSentiment, isPlaceRelated, type RedditPost } from "@/lib/reddit";
import {
  extractVenuesWithAI,
  extractRestaurantNames,
  geocodeRestaurant,
  saveRestaurant,
  fetchPostComments,
} from "@/lib/extract-restaurants";

const SUBREDDITS = ["askTO", "toronto", "torontofood", "FoodToronto", "askToronto", "torontoevents"];

// Search queries — any Toronto place worth visiting
const SEARCH_QUERIES = [
  // General recommendation signals
  "recommendation toronto",
  "best place in toronto",
  "where to go toronto",
  "things to do toronto",
  "worth visiting toronto",
  "underrated toronto",
  "must visit toronto",
  "new opening toronto",
  "hidden gem toronto",
  "just opened toronto",
  "favourite spot toronto",
  "best neighbourhood toronto",
  "things to do this weekend toronto",
  "where to take visitors toronto",
  "locals recommend toronto",
  "moving to toronto",
  "new to toronto",
  // Food & drink
  "best restaurant toronto",
  "where to eat toronto",
  "best brunch toronto",
  "best ramen toronto",
  "best sushi toronto",
  "best pizza toronto",
  "best burger toronto",
  "best pho toronto",
  "best dim sum toronto",
  "cheap eats toronto",
  "best cafe toronto",
  "best coffee toronto",
  "best dessert toronto",
  "best bakery toronto",
  "best ice cream toronto",
  "best tacos toronto",
  "best wings toronto",
  "best shawarma toronto",
  "best date night restaurant",
  "best late night food toronto",
  "best new restaurant toronto",
  // Bars & nightlife
  "best bar toronto",
  "best cocktail bar toronto",
  "best rooftop bar toronto",
  "best patio toronto",
  "best nightclub toronto",
  "best live music toronto",
  "best dive bar toronto",
  "best brewery toronto",
  "best wine bar toronto",
  "best karaoke toronto",
  // Shopping & retail
  "best shop toronto",
  "best vintage store toronto",
  "best bookstore toronto",
  "best market toronto",
  "best record store toronto",
  "best thrift store toronto",
  "best plant shop toronto",
  // Parks & outdoors
  "best park toronto",
  "best trail toronto",
  "best beach toronto",
  "best outdoor spot toronto",
  "best skating rink toronto",
  "best dog park toronto",
  "best picnic spot toronto",
  "best ravine toronto",
  // Activities & entertainment
  "best gym toronto",
  "best yoga studio toronto",
  "best climbing gym toronto",
  "best museum toronto",
  "best art gallery toronto",
  "best escape room toronto",
  "best bowling toronto",
  "best arcade toronto",
  "best spa toronto",
  "best comedy club toronto",
  "best theatre toronto",
  "best pool hall toronto",
  "best board game cafe toronto",
  // Neighbourhood-specific
  "best kensington market",
  "best queen west toronto",
  "best ossington bar",
  "best leslieville cafe",
  "best distillery district",
  "best annex toronto",
  "best little italy toronto",
  "best chinatown toronto",
  "best roncesvalles",
  "best liberty village",
  "best dundas west",
  // Services & community
  "best barber toronto",
  "best hair salon toronto",
  "best tattoo toronto",
  "best coworking space toronto",
  "best community centre toronto",
];

async function searchReddit(
  subreddit: string,
  query: string,
  after?: string
): Promise<{ posts: RedditPost[]; after: string | null }> {
  const q = encodeURIComponent(query);
  let url = `https://www.reddit.com/r/${subreddit}/search.json?q=${q}&restrict_sr=1&sort=top&t=all&limit=100`;
  if (after) url += `&after=${after}`;

  const res = await fetch(url, {
    headers: { "User-Agent": "BuzzMaps/1.0 toronto places map" },
  });

  if (!res.ok) throw new Error(`Reddit search error: ${res.status}`);

  const data = await res.json();
  const children = data?.data?.children || [];

  const posts: RedditPost[] = children.map(
    (child: { data: Record<string, unknown> }) => {
      const d = child.data;
      const title = (d.title as string) || "";
      const selftext = (d.selftext as string) || "";
      return {
        reddit_id: d.name as string,
        subreddit,
        title,
        selftext,
        author: (d.author as string) || "[deleted]",
        url: (d.url as string) || "",
        permalink: (d.permalink as string) || "",
        score: (d.score as number) || 0,
        num_comments: (d.num_comments as number) || 0,
        created_utc: (d.created_utc as number) || 0,
        is_food_related: isPlaceRelated(title, selftext),
        sentiment: extractSentiment(title, selftext),
      };
    }
  );

  return { posts, after: data?.data?.after || null };
}

export async function GET(req: Request) {
  try {
    await runMigrations();
    const sql = getDb();

    const url = new URL(req.url);
    const maxPerQuery = parseInt(url.searchParams.get("max") || "200");

    let totalPosts = 0;
    let totalNew = 0;
    let totalPlaces = 0;

    for (const subreddit of SUBREDDITS) {
      for (const query of SEARCH_QUERIES) {
        let after: string | null = null;
        let fetched = 0;

        while (fetched < maxPerQuery) {
          try {
            const result = await searchReddit(subreddit, query, after || undefined);
            if (!result.posts.length) break;

            for (const p of result.posts) {
              totalPosts++;

              try {
                const rows = await sql`
                  INSERT INTO reddit_posts (reddit_id, subreddit, title, selftext, author, url, permalink, score, num_comments, is_food_related, sentiment, created_utc)
                  VALUES (${p.reddit_id}, ${p.subreddit}, ${p.title}, ${p.selftext}, ${p.author}, ${p.url}, ${p.permalink}, ${p.score}, ${p.num_comments}, ${p.is_food_related}, ${p.sentiment}, ${p.created_utc})
                  ON CONFLICT (reddit_id) DO NOTHING
                  RETURNING id
                `;

                if (!rows.length) continue; // already exists
                const postId = rows[0].id;
                totalNew++;

                // Skip very low quality posts
                if (p.score < 3) continue;

                const commentText = await fetchPostComments(subreddit, p.reddit_id);
                await new Promise((r) => setTimeout(r, 800));

                const combinedText = `${p.title}\n${p.selftext || ""}\n${commentText}`;

                let venues = await extractVenuesWithAI(combinedText);
                if (venues.length === 0) {
                  const names = extractRestaurantNames(p.title, combinedText);
                  venues = names.map((name) => ({ name, category: "restaurant" as const }));
                }

                const sentiment = extractSentiment(p.title, combinedText);

                for (const venue of venues.slice(0, 8)) {
                  const place = await geocodeRestaurant(venue.name, venue.category);
                  if (place) {
                    await saveRestaurant(place, postId, p.title.slice(0, 200), sentiment, venue.category);
                    totalPlaces++;
                  }
                }
              } catch {
                // skip individual post errors
              }
            }

            after = result.after;
            fetched += result.posts.length;
            if (!after) break;

            await new Promise((r) => setTimeout(r, 1500));
          } catch {
            break;
          }
        }

        // Small delay between queries
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    return Response.json({
      success: true,
      posts_seen: totalPosts,
      posts_new: totalNew,
      places_found: totalPlaces,
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
