import { getDb, runMigrations } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import { extractSentiment, isPlaceRelated, type RedditPost } from "@/lib/reddit";
import {
  extractVenuesWithAI,
  extractRestaurantNames,
  geocodeRestaurant,
  saveRestaurant,
  fetchPostComments,
  countMentions,
} from "@/lib/extract-places";
import { NEIGHBOURHOODS } from "@/lib/neighbourhoods";
import { delay } from "@/lib/utils";
import type { PlaceCategory } from "@/lib/types";

const SUBREDDITS = ["askTO", "toronto", "torontofood", "FoodToronto", "askToronto", "torontoevents"];

function generateQueries(name: string): string[] {
  return [
    `best ${name}`,
    `best ${name} toronto`,
    `${name} restaurant`,
    `things to do ${name}`,
    `hidden gem ${name}`,
  ];
}

// --- Reddit helpers ---

async function searchReddit(
  subreddit: string,
  query: string,
): Promise<{ posts: RedditPost[] }> {
  const q = encodeURIComponent(query);
  const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${q}&restrict_sr=1&sort=top&t=all&limit=100`;

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

  return { posts };
}

// --- Blog / publication helpers ---

interface FeedItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
}

function extractTag(xml: string, tag: string): string {
  const cdataMatch = xml.match(new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, "i"));
  if (cdataMatch) return cdataMatch[1].trim();
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  if (match) return match[1].replace(/<[^>]*>/g, "").trim();
  return "";
}

function parseRSS(xml: string): FeedItem[] {
  const items: FeedItem[] = [];
  const pattern = xml.includes("<entry>") ? /<entry>([\s\S]*?)<\/entry>/gi : /<item>([\s\S]*?)<\/item>/gi;
  for (const match of xml.matchAll(pattern)) {
    const block = match[1];
    const title = extractTag(block, "title");
    const description = extractTag(block, "description") || extractTag(block, "summary") || extractTag(block, "content");
    const link = extractTag(block, "link") || extractTag(block, "guid") || block.match(/href="([^"]+)"/)?.[1] || "";
    const pubDate = extractTag(block, "pubDate") || extractTag(block, "published") || extractTag(block, "updated");
    if (title && link) items.push({ title, description, link, pubDate });
  }
  return items;
}

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").slice(0, 60);
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

async function fetchArticleText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BuzzMaps/1.0; +https://buzzmaps.ca)",
        Accept: "text/html,application/xhtml+xml,*/*",
      },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    const cleaned = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
      .replace(/<header[\s\S]*?<\/header>/gi, " ")
      .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ");
    return stripHtml(cleaned).slice(0, 8000);
  } catch {
    return null;
  }
}

function generateBlogFeeds(name: string): { name: string; url: string }[] {
  const q = encodeURIComponent(`${name} toronto`);
  return [
    { name: `Google News: ${name}`, url: `https://news.google.com/rss/search?q=${q}+best+places&hl=en-CA&gl=CA&ceid=CA:en` },
    { name: `Google News: ${name} food`, url: `https://news.google.com/rss/search?q=${q}+restaurants+food&hl=en-CA&gl=CA&ceid=CA:en` },
    { name: `BlogTO: ${name}`, url: `https://www.blogto.com/rss/articles.xml` },
  ];
}

// --- Main handler ---

export const maxDuration = 120;

export async function GET(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  try {
    await runMigrations();
    const sql = getDb();

    const url = new URL(req.url);
    const offset = parseInt(url.searchParams.get("offset") || "0");
    const limit = parseInt(url.searchParams.get("limit") || "1");

    const total = NEIGHBOURHOODS.length;
    if (offset >= total) {
      return Response.json({
        success: true,
        message: "All neighbourhoods processed",
        total_neighbourhoods: total,
        next_offset: null,
      });
    }

    const end = Math.min(offset + limit, total);
    const neighbourhoodsToProcess = NEIGHBOURHOODS.slice(offset, end);

    let totalPosts = 0;
    let totalNew = 0;
    let totalPlaces = 0;
    let queriesRun = 0;
    let blogArticles = 0;
    let blogPlaces = 0;
    const processed: string[] = [];

    for (const hood of neighbourhoodsToProcess) {
      const queries = generateQueries(hood.name);
      processed.push(hood.name);

      // ── Phase 1: Reddit scraping ──
      for (const subreddit of SUBREDDITS) {
        for (const query of queries) {
          queriesRun++;

          try {
            const result = await searchReddit(subreddit, query);

            for (const p of result.posts) {
              totalPosts++;

              try {
                const rows = await sql`
                  INSERT INTO reddit_posts (reddit_id, subreddit, title, selftext, author, url, permalink, score, num_comments, is_food_related, sentiment, created_utc)
                  VALUES (${p.reddit_id}, ${p.subreddit}, ${p.title}, ${p.selftext}, ${p.author}, ${p.url}, ${p.permalink}, ${p.score}, ${p.num_comments}, ${p.is_food_related}, ${p.sentiment}, ${p.created_utc})
                  ON CONFLICT (reddit_id) DO NOTHING
                  RETURNING id
                `;

                if (!rows.length) continue;
                const postId = rows[0].id;
                totalNew++;

                if (p.score < 3) continue;

                const commentText = await fetchPostComments(subreddit, p.reddit_id);
                await delay(800);

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
                    const threadCount = countMentions(venue.name, combinedText);
                    await saveRestaurant(place, postId, p.title.slice(0, 200), sentiment, venue.category, undefined, threadCount);
                    totalPlaces++;
                  }
                }
              } catch {
                // skip individual post errors
              }
            }
          } catch {
            // skip failed searches
          }

          await delay(2000);
        }
      }

      // ── Phase 2: Blog / publication scraping ──
      const feeds = generateBlogFeeds(hood.name);

      for (const feed of feeds) {
        try {
          const res = await fetch(feed.url, {
            headers: {
              "User-Agent": "Mozilla/5.0 BuzzMaps/1.0 (+https://buzzmaps.vercel.app)",
              Accept: "application/rss+xml, application/xml, text/xml, */*",
            },
            signal: AbortSignal.timeout(8000),
          });
          if (!res.ok) continue;
          const xml = await res.text();
          const items = parseRSS(xml);

          // For BlogTO, filter items that mention this neighbourhood
          const relevantItems = feed.name.startsWith("BlogTO")
            ? items.filter((item) => {
                const text = `${item.title} ${item.description}`.toLowerCase();
                return text.includes(hood.name.toLowerCase());
              })
            : items;

          for (const item of relevantItems.slice(0, 15)) {
            const cleanDesc = stripHtml(item.description || "");
            const sentiment = extractSentiment(item.title, cleanDesc);
            const pubTs = item.pubDate ? Math.floor(new Date(item.pubDate).getTime() / 1000) : Math.floor(Date.now() / 1000);
            const redditId = `pub_${slugify(item.title)}_${pubTs}`;

            let postId: number;
            try {
              const rows = await sql`
                INSERT INTO reddit_posts (reddit_id, subreddit, title, selftext, author, url, permalink, score, num_comments, is_food_related, sentiment, created_utc)
                VALUES (${redditId}, ${feed.name}, ${item.title.slice(0, 500)}, ${cleanDesc.slice(0, 5000)}, ${feed.name}, ${item.link}, ${item.link}, 10, 0, true, ${sentiment}, ${pubTs})
                ON CONFLICT (reddit_id) DO NOTHING
                RETURNING id
              `;
              if (rows?.length) {
                postId = rows[0].id;
              } else {
                const existing = await sql`
                  SELECT rp.id FROM reddit_posts rp
                  WHERE rp.reddit_id = ${redditId}
                    AND NOT EXISTS (SELECT 1 FROM post_restaurants pr WHERE pr.post_id = rp.id)
                `;
                if (!existing?.length) continue;
                postId = existing[0].id;
              }
            } catch { continue; }

            blogArticles++;

            let articleText = cleanDesc;
            if (item.link && !item.link.includes("reddit.com")) {
              const fullText = await fetchArticleText(item.link);
              if (fullText && fullText.length > cleanDesc.length) articleText = fullText;
              await delay(500);
            }

            const combinedText = `${item.title}\n${articleText}`;
            let venues = await extractVenuesWithAI(combinedText);
            if (!venues.length) {
              const names = extractRestaurantNames(item.title, articleText);
              venues = names.map((name) => ({ name, category: "restaurant" as PlaceCategory }));
            }

            const sentiment2 = extractSentiment(item.title, articleText);
            for (const venue of venues.slice(0, 8)) {
              const place = await geocodeRestaurant(venue.name, venue.category);
              if (place) {
                const threadCount = countMentions(venue.name, combinedText);
                await saveRestaurant(place, postId, item.title.slice(0, 200), sentiment2, venue.category, undefined, threadCount);
                blogPlaces++;
                totalPlaces++;
              }
            }
          }
        } catch {
          // skip failed feeds
        }

        await delay(1000);
      }
    }

    const nextOffset = end < total ? end : null;
    return Response.json({
      success: true,
      neighbourhoods: processed,
      neighbourhoods_processed: processed.length,
      total_neighbourhoods: total,
      reddit: { posts_seen: totalPosts, posts_new: totalNew, places_found: totalPlaces - blogPlaces },
      blogs: { articles_scraped: blogArticles, places_found: blogPlaces },
      places_found: totalPlaces,
      queries_run: queriesRun,
      next_offset: nextOffset,
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
