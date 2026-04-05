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
  // Neighbourhood-specific — core / well-known
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
  // Neighbourhood-specific — west end & west-central
  "best the junction toronto",
  "best junction triangle",
  "best bloor west village",
  "best high park toronto",
  "best parkdale toronto",
  "best west queen west",
  "best trinity-bellwoods",
  "best little portugal toronto",
  "things to do high park",
  "parkdale restaurant",
  "hidden gem the junction",
  // Neighbourhood-specific — central & downtown
  "best yorkville toronto",
  "best harbord village",
  "best casa loma toronto",
  "best yonge corridor",
  "best st. james town",
  "best financial district toronto",
  "best entertainment district toronto",
  "best st. lawrence market toronto",
  "best old town toronto",
  "best garden district toronto",
  "best waterfront toronto",
  "best koreatown toronto",
  "things to do waterfront toronto",
  "things to do yorkville",
  "hidden gem koreatown toronto",
  // Neighbourhood-specific — east
  "best corktown toronto",
  "best riverside toronto",
  "best the beaches toronto",
  "best greektown toronto",
  "best east chinatown toronto",
  "best broadview north",
  "things to do the beaches",
  "things to do greektown toronto",
  "greektown restaurant",
  "corktown restaurant",
  "riverside restaurant toronto",
  "hidden gem leslieville",
  "hidden gem the beaches",
  // Neighbourhood-specific — east expansion (East York / inner Scarborough)
  "best east danforth toronto",
  "best old east york",
  "things to do east danforth",
  "things to do old east york",
  "old east york restaurant",
  "east danforth restaurant",
  "hidden gem east york",
  "best birchcliffe-cliffside",
  "things to do birchcliffe cliffside",
  "best taylor-massey toronto",
  "best east york north",
  "things to do flemingdon park",
  "flemingdon park restaurant",
  "best victoria village toronto",
  "things to do victoria village toronto",
  "best kennedy park toronto",
  "kennedy park restaurant",
  "best wexford toronto",
  "wexford restaurant",
  "things to do wexford",
  "best eglinton east toronto",
  "eglinton east restaurant",
  "hidden gem east york toronto",
  // Neighbourhood-specific — north
  "best corso italia toronto",
  "best st. clair west toronto",
  "best oakwood village toronto",
  "best midtown toronto",
  "best yonge-st. clair",
  "best forest hill toronto",
  "best north toronto",
  "best bedford park toronto",
  "best leaside toronto",
  "things to do midtown toronto",
  "things to do leaside",
  "st. clair west restaurant",
  "corso italia restaurant",
  "midtown restaurant toronto",
  "hidden gem midtown toronto",
  "hidden gem forest hill",
  // Neighbourhood-specific — North York (expanded)
  "best north york toronto",
  "best yorkdale toronto",
  "best downsview toronto",
  "best st. andrew-windfields",
  "best bayview village toronto",
  "best parkwoods toronto",
  "best pleasant view toronto",
  "best bathurst manor toronto",
  "best bayview woods toronto",
  "things to do north york",
  "things to do downsview toronto",
  "things to do bayview village",
  "north york restaurant",
  "yorkdale restaurant",
  "downsview restaurant",
  "bayview village restaurant",
  "hidden gem north york",
  "hidden gem downsview",
  // Neighbourhood-specific — west expansion
  "best caledonia-fairbank toronto",
  "best keelesdale toronto",
  "best mount dennis toronto",
  "best weston toronto",
  "best humber bay shores",
  "best kingsway toronto",
  "best princess-rosethorn",
  "best long branch toronto",
  "best markland wood toronto",
  "things to do mount dennis toronto",
  "things to do weston toronto",
  "things to do long branch toronto",
  "things to do humber bay shores",
  "mount dennis restaurant",
  "weston restaurant toronto",
  "long branch restaurant",
  "humber bay shores restaurant",
  "hidden gem long branch",
  "hidden gem weston toronto",
  // Neighbourhood-specific — Etobicoke / far west
  "best etobicoke toronto",
  "best west etobicoke",
  "best rexdale toronto",
  "best humber summit toronto",
  "best pelmo park toronto",
  "best glenfield-jane heights",
  "best york university area",
  "things to do etobicoke",
  "things to do rexdale",
  "things to do humber summit",
  "things to do glenfield-jane heights",
  "etobicoke restaurant",
  "rexdale restaurant",
  "humber summit restaurant",
  "glenfield-jane heights restaurant",
  "hidden gem etobicoke",
  "hidden gem rexdale",
  // Neighbourhood-specific — Scarborough (expanded)
  "best scarborough toronto",
  "best scarborough west",
  "best tam o'shanter toronto",
  "best agincourt toronto",
  "best steeles toronto",
  "best malvern toronto",
  "best scarborough south",
  "best guildwood toronto",
  "best highland creek toronto",
  "best morningside toronto",
  "things to do scarborough",
  "things to do agincourt",
  "things to do malvern toronto",
  "things to do highland creek",
  "things to do guildwood",
  "things to do morningside toronto",
  "scarborough restaurant",
  "agincourt restaurant",
  "malvern restaurant",
  "highland creek restaurant",
  "guildwood restaurant",
  "morningside restaurant toronto",
  "hidden gem scarborough",
  "hidden gem agincourt",
  "hidden gem malvern",
  "hidden gem highland creek",
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

export const maxDuration = 120;

export async function GET(req: Request) {
  try {
    await runMigrations();
    const sql = getDb();

    const url = new URL(req.url);
    const maxPerQuery = parseInt(url.searchParams.get("max") || "200");
    const queryLimit = parseInt(url.searchParams.get("queries") || "15");
    const startFrom = parseInt(url.searchParams.get("offset") || "0");

    let totalPosts = 0;
    let totalNew = 0;
    let totalPlaces = 0;
    let queriesRun = 0;
    const totalQueries = SUBREDDITS.length * SEARCH_QUERIES.length;

    for (const subreddit of SUBREDDITS) {
      for (let qi = 0; qi < SEARCH_QUERIES.length; qi++) {
        const globalIdx = SUBREDDITS.indexOf(subreddit) * SEARCH_QUERIES.length + qi;
        if (globalIdx < startFrom) continue;
        if (queriesRun >= queryLimit) break;
        const query = SEARCH_QUERIES[qi];
        queriesRun++;
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
        if (queriesRun >= queryLimit) break;
      }
      if (queriesRun >= queryLimit) break;
    }

    const nextOffset = startFrom + queriesRun;
    return Response.json({
      success: true,
      posts_seen: totalPosts,
      posts_new: totalNew,
      places_found: totalPlaces,
      queries_run: queriesRun,
      total_queries: totalQueries,
      next_offset: nextOffset < totalQueries ? nextOffset : null,
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
