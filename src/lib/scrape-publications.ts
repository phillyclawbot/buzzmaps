import { getDb } from "@/lib/db";
import { extractSentiment } from "@/lib/reddit";
import {
  extractVenuesWithAI,
  extractRestaurantNames,
  geocodeRestaurant,
  saveRestaurant,
  countMentions,
} from "@/lib/extract-places";
import { delay } from "@/lib/utils";
import type { PlaceCategory } from "@/lib/types";

// Toronto publications + blogs with working RSS feeds
const PUBLICATION_FEEDS = [
  // BlogTO - Toronto's biggest lifestyle publication (main feed covers all sections)
  { name: "BlogTO", url: "https://www.blogto.com/rss/articles.xml" },
  // Toronto Life
  { name: "Toronto Life", url: "https://torontolife.com/feed/" },
  // NOW Magazine
  { name: "NOW Magazine", url: "https://nowtoronto.com/feed/" },
  // Narcity Toronto (toronto.rss is the confirmed working Toronto-specific feed)
  { name: "Narcity", url: "https://www.narcity.com/feeds/toronto.rss" },
  // Eater Toronto - restaurant and food scene coverage
  { name: "Eater Toronto", url: "https://toronto.eater.com/rss/index.xml" },
  // Toronto Sun
  { name: "Toronto Sun", url: "https://torontosun.com/feed" },
  // Globe and Mail Toronto
  { name: "Globe and Mail", url: "https://www.theglobeandmail.com/arc/outboundfeeds/rss/category/life/" },
  // Exclaim - Toronto music/arts (via FeedBurner — direct /rss path returns 404)
  { name: "Exclaim", url: "http://feeds.feedburner.com/ExclaimCaAllArticles" },
  // Toronto Guardian
  { name: "Toronto Guardian", url: "https://torontoguardian.com/feed/" },
  // Daily Hive Toronto (main feed — toronto-specific section paths return 404)
  { name: "Daily Hive", url: "https://dailyhive.com/feed" },
  // Toronto.com
  { name: "Toronto.com", url: "https://www.toronto.com/feed/" },
  // Curiocity Toronto
  { name: "Curiocity", url: "https://curiocity.com/toronto/feed/" },
  // Streets of Toronto (Post City content now lives here; postcity.com returns 403)
  { name: "Streets of Toronto", url: "https://www.streetsoftoronto.com/feed/" },
  // Toronto Storeys
  { name: "Toronto Storeys", url: "https://torontostoreys.com/feed/" },
  // Notable Life (notable.ca redirects here; toronto sub-path returns 404)
  { name: "Notable Life", url: "https://notablelife.com/feed/" },
  // Spacing Toronto
  { name: "Spacing", url: "https://spacing.ca/feed/" },
  // insauga.com — covers Scarborough / east end
  { name: "insauga.com", url: "https://www.insauga.com/feed/" },
  // The Local TO
  { name: "The Local", url: "https://thelocal.to/feed/" },
];

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
        "Accept": "text/html,application/xhtml+xml,*/*",
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

export interface PublicationsScrapeResult {
  posts_saved: number;
  places_found: number;
  feeds: Record<string, { posts: number; places: number; error?: string }>;
}

export async function scrapePublications(): Promise<PublicationsScrapeResult> {
  const sql = getDb();
  let totalPosts = 0;
  let totalPlaces = 0;
  const feedResults: Record<string, { posts: number; places: number; error?: string }> = {};

  for (const feed of PUBLICATION_FEEDS) {
    if (!feedResults[feed.name]) feedResults[feed.name] = { posts: 0, places: 0 };

    let xml: string;
    try {
      const res = await fetch(feed.url, {
        headers: {
          "User-Agent": "Mozilla/5.0 BuzzMaps/1.0 (+https://buzzmaps.vercel.app)",
          "Accept": "application/rss+xml, application/xml, text/xml, */*",
        },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) { feedResults[feed.name].error = `HTTP ${res.status}`; continue; }
      xml = await res.text();
    } catch (e) {
      feedResults[feed.name].error = String(e).slice(0, 100);
      continue;
    }

    const items = parseRSS(xml);
    if (!items.length) { feedResults[feed.name].error = "No items parsed"; continue; }

    for (const item of items.slice(0, 25)) {
      const cleanDesc = stripHtml(item.description || "");
      const sentiment = extractSentiment(item.title, cleanDesc);
      const pubTs = item.pubDate ? Math.floor(new Date(item.pubDate).getTime() / 1000) : Math.floor(Date.now() / 1000);
      const redditId = `pub_${slugify(item.title)}_${pubTs}`;

      let postId: number;
      try {
        // Insert new article, or retrieve existing one that has no linked venues
        const rows = await sql`
          INSERT INTO reddit_posts (reddit_id, subreddit, title, selftext, author, url, permalink, score, num_comments, is_food_related, sentiment, created_utc)
          VALUES (${redditId}, ${feed.name}, ${item.title.slice(0, 500)}, ${cleanDesc.slice(0, 5000)}, ${feed.name}, ${item.link}, ${item.link}, 10, 0, true, ${sentiment}, ${pubTs})
          ON CONFLICT (reddit_id) DO NOTHING
          RETURNING id
        `;
        if (rows?.length) {
          postId = rows[0].id;
        } else {
          // Article already exists — re-process if it has no linked venues
          const existing = await sql`
            SELECT rp.id FROM reddit_posts rp
            WHERE rp.reddit_id = ${redditId}
              AND NOT EXISTS (SELECT 1 FROM post_restaurants pr WHERE pr.post_id = rp.id)
          `;
          if (!existing?.length) continue;
          postId = existing[0].id;
        }
      } catch { continue; }

      totalPosts++;
      feedResults[feed.name].posts++;

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
        venues = names.map(name => ({ name, category: "restaurant" as PlaceCategory }));
      }

      for (const venue of venues.slice(0, 8)) {
        const place = await geocodeRestaurant(venue.name, venue.category);
        if (place) {
          const threadCount = countMentions(venue.name, combinedText);
          await saveRestaurant(place, postId, item.title.slice(0, 200), sentiment, venue.category, undefined, threadCount);
          totalPlaces++;
          feedResults[feed.name].places++;
        }
      }
    }
  }

  return { posts_saved: totalPosts, places_found: totalPlaces, feeds: feedResults };
}
