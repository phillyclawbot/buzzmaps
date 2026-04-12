import { getDb } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { extractSentiment } from "@/lib/reddit";
import {
  extractVenuesWithAI,
  extractRestaurantNames,
  geocodeRestaurant,
  saveRestaurant,
  countMentions,
} from "@/lib/extract-places";
import type { PlaceCategory } from "@/lib/types";

export const maxDuration = 60;

/**
 * Curated "best of" list URLs from popular Toronto publications.
 * These are evergreen listicles that mention many places at once —
 * high-value targets for extracting place names.
 */
const CURATED_LIST_URLS = [
  // BlogTO listicles
  { name: "BlogTO", url: "https://www.blogto.com/eat_drink/2024/01/best-restaurants-toronto/" },
  { name: "BlogTO", url: "https://www.blogto.com/eat_drink/2024/01/best-new-restaurants-toronto/" },
  { name: "BlogTO", url: "https://www.blogto.com/eat_drink/2024/01/best-brunch-toronto/" },
  { name: "BlogTO", url: "https://www.blogto.com/eat_drink/2024/01/best-cheap-eats-toronto/" },
  { name: "BlogTO", url: "https://www.blogto.com/eat_drink/2024/01/best-patios-toronto/" },
  { name: "BlogTO", url: "https://www.blogto.com/eat_drink/2024/01/best-bars-toronto/" },
  { name: "BlogTO", url: "https://www.blogto.com/eat_drink/2024/01/best-coffee-shops-toronto/" },
  { name: "BlogTO", url: "https://www.blogto.com/eat_drink/2024/01/best-bakeries-toronto/" },
  { name: "BlogTO", url: "https://www.blogto.com/eat_drink/2024/01/best-pizza-toronto/" },
  { name: "BlogTO", url: "https://www.blogto.com/eat_drink/2024/01/best-ramen-toronto/" },
  { name: "BlogTO", url: "https://www.blogto.com/eat_drink/2024/01/best-sushi-toronto/" },
  { name: "BlogTO", url: "https://www.blogto.com/eat_drink/2024/01/best-burgers-toronto/" },
  { name: "BlogTO", url: "https://www.blogto.com/sports_play/2024/01/best-parks-toronto/" },
  // Eater Toronto maps (curated best-of lists)
  { name: "Eater Toronto", url: "https://toronto.eater.com/maps/best-restaurants-toronto" },
  { name: "Eater Toronto", url: "https://toronto.eater.com/maps/best-new-restaurants-toronto" },
  { name: "Eater Toronto", url: "https://toronto.eater.com/maps/best-bars-toronto" },
  { name: "Eater Toronto", url: "https://toronto.eater.com/maps/best-brunch-toronto" },
  { name: "Eater Toronto", url: "https://toronto.eater.com/maps/best-cheap-eats-toronto" },
  // Toronto Life lists
  { name: "Toronto Life", url: "https://torontolife.com/food/best-new-restaurants-toronto/" },
  { name: "Toronto Life", url: "https://torontolife.com/food/best-restaurants-toronto/" },
  { name: "Toronto Life", url: "https://torontolife.com/food/best-bars-toronto/" },
  // Narcity listicles
  { name: "Narcity", url: "https://www.narcity.com/toronto/best-restaurants-toronto" },
  { name: "Narcity", url: "https://www.narcity.com/toronto/best-patios-toronto" },
  { name: "Narcity", url: "https://www.narcity.com/toronto/best-cafes-toronto" },
];

function extractOgDescription(html: string): string {
  const matchers = [
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
  ];
  for (const re of matchers) {
    const m = html.match(re);
    if (m) return m[1];
  }
  return "";
}

function extractTitle(html: string): string {
  const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return m ? m[1].replace(/\s+/g, " ").trim() : "";
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<nav[\s\S]*?<\/nav>/gi, "")
    .replace(/<footer[\s\S]*?<\/footer>/gi, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").slice(0, 60);
}

export async function GET(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  try {
    const sql = getDb();
    let totalPosts = 0;
    let totalPlaces = 0;
    const results: { url: string; name: string; places: number; error?: string }[] = [];

    for (const source of CURATED_LIST_URLS) {
      let html: string;
      try {
        const res = await fetch(source.url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          },
          signal: AbortSignal.timeout(12000),
          redirect: "follow",
        });
        if (!res.ok) {
          results.push({ url: source.url, name: source.name, places: 0, error: `HTTP ${res.status}` });
          continue;
        }
        html = await res.text();
      } catch (e) {
        results.push({ url: source.url, name: source.name, places: 0, error: String(e).slice(0, 80) });
        continue;
      }

      const title = extractTitle(html) || source.url;
      const description = extractOgDescription(html);
      const bodyText = stripHtml(html).slice(0, 8000);
      const combinedText = `${title}\n${description}\n${bodyText}`;

      // Create a synthetic post for this listicle
      const redditId = `list_${slugify(title)}_${Date.now()}`;
      const pubTs = Math.floor(Date.now() / 1000);

      let postId: number;
      try {
        const rows = await sql`
          INSERT INTO reddit_posts (reddit_id, subreddit, title, selftext, author, url, permalink, score, num_comments, is_food_related, sentiment, created_utc)
          VALUES (${redditId}, ${source.name}, ${title.slice(0, 500)}, ${bodyText.slice(0, 5000)}, ${source.name}, ${source.url}, ${source.url}, 20, 0, true, 'positive', ${pubTs})
          ON CONFLICT (reddit_id) DO NOTHING
          RETURNING id
        `;
        if (!rows?.length) {
          results.push({ url: source.url, name: source.name, places: 0 });
          continue;
        }
        postId = rows[0].id;
      } catch {
        results.push({ url: source.url, name: source.name, places: 0, error: "DB insert failed" });
        continue;
      }

      totalPosts++;

      // Extract venues — use larger limit since listicles mention many places
      let venues = await extractVenuesWithAI(combinedText);
      if (!venues.length) {
        const names = extractRestaurantNames(title, bodyText);
        venues = names.map((name) => ({ name, category: "restaurant" as PlaceCategory }));
      }

      const sentiment = extractSentiment(title, bodyText);
      let placesFromThisUrl = 0;

      for (const venue of venues.slice(0, 15)) {
        const place = await geocodeRestaurant(venue.name, venue.category);
        if (place) {
          const threadCount = countMentions(venue.name, combinedText);
          await saveRestaurant(place, postId, title.slice(0, 200), sentiment, venue.category, undefined, threadCount);
          totalPlaces++;
          placesFromThisUrl++;
        }
      }

      results.push({ url: source.url, name: source.name, places: placesFromThisUrl });

      // Rate limit between pages
      await new Promise((r) => setTimeout(r, 2000));
    }

    return Response.json({
      success: true,
      lists_scraped: totalPosts,
      places_found: totalPlaces,
      results,
    });
  } catch (err) {
    console.error("GET /api/scrape/popular error:", err);
    return Response.json({ error: "Failed to scrape popular lists" }, { status: 500 });
  }
}
