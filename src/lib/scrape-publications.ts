import { getDb } from "@/lib/db";
import { extractSentiment } from "@/lib/reddit";
import {
  extractVenuesWithAI,
  extractRestaurantNames,
  geocodeRestaurant,
  saveRestaurant,
} from "@/lib/extract-restaurants";
import { delay } from "@/lib/utils";
import type { PlaceCategory } from "@/lib/types";

// Toronto publications + blogs with RSS feeds
// Feeds are grouped by reliability. Reddit RSS feeds are separated since they
// require authentication and frequently return 403.
export const PUBLICATION_FEEDS = [
  // --- Reliable WordPress / standard RSS feeds ---
  // BlogTO - Toronto's biggest lifestyle publication
  { name: "BlogTO", url: "https://www.blogto.com/eat_drink/rss.xml" },
  { name: "BlogTO", url: "https://www.blogto.com/city/rss.xml" },
  { name: "BlogTO", url: "https://www.blogto.com/arts/rss.xml" },
  { name: "BlogTO", url: "https://www.blogto.com/sports_play/rss.xml" },
  { name: "BlogTO", url: "https://www.blogto.com/nightlife/rss.xml" },
  { name: "BlogTO", url: "https://www.blogto.com/fashion_style/rss.xml" },
  { name: "BlogTO", url: "https://www.blogto.com/real_estate/rss.xml" },
  { name: "BlogTO", url: "https://www.blogto.com/travel/rss.xml" },
  // Toronto Life
  { name: "Toronto Life", url: "https://torontolife.com/feed/" },
  { name: "Toronto Life", url: "https://torontolife.com/food/feed/" },
  { name: "Toronto Life", url: "https://torontolife.com/city/feed/" },
  { name: "Toronto Life", url: "https://torontolife.com/style/feed/" },
  // NOW Magazine
  { name: "NOW Magazine", url: "https://nowtoronto.com/feed/" },
  // Narcity Toronto
  { name: "Narcity", url: "https://www.narcity.com/toronto/feed" },
  { name: "Narcity", url: "https://www.narcity.com/feed/rss.xml" },
  // Eater Toronto (Vox Media — Atom feed)
  { name: "Eater Toronto", url: "https://toronto.eater.com/rss/index.xml" },
  // Toronto Star
  { name: "Toronto Star", url: "https://www.thestar.com/content/thestar/feed.RSSManagerServlet.TopStories.rss" },
  // Toronto Sun
  { name: "Toronto Sun", url: "https://torontosun.com/feed" },
  // Globe and Mail
  { name: "Globe and Mail", url: "https://www.theglobeandmail.com/arc/outboundfeeds/rss/category/life/" },
  // Exclaim - Toronto music/arts
  { name: "Exclaim", url: "https://exclaim.ca/rss" },
  // Toronto Guardian
  { name: "Toronto Guardian", url: "https://torontoguardian.com/feed/" },
  // Post City Toronto
  { name: "Post City", url: "https://www.postcity.com/feed/" },
  // Spacing
  { name: "Spacing", url: "https://spacing.ca/toronto/feed/" },
  // Daily Hive Toronto
  { name: "Daily Hive", url: "https://dailyhive.com/toronto/feed" },
  { name: "Daily Hive", url: "https://dailyhive.com/toronto/food/feed" },
  { name: "Daily Hive", url: "https://dailyhive.com/toronto/listed/feed" },
  // Toronto.com
  { name: "Toronto.com", url: "https://www.toronto.com/feed/" },
  // Curiocity Toronto
  { name: "Curiocity", url: "https://curiocity.com/toronto/feed/" },
  // Streets of Toronto
  { name: "Streets of Toronto", url: "https://www.streetsoftoronto.com/feed/" },
  // Toronto Storeys
  { name: "Toronto Storeys", url: "https://torontostoreys.com/feed/" },
  // Notable.ca Toronto
  { name: "Notable.ca", url: "https://notable.ca/toronto/feed/" },
  // insauga.com — covers Scarborough / east end
  { name: "insauga.com", url: "https://www.insauga.com/feed/" },
  // The Local TO
  { name: "The Local", url: "https://thelocal.to/feed/" },

  // --- Reddit RSS feeds (may return 403 without auth) ---
  { name: "r/FoodToronto", url: "https://www.reddit.com/r/FoodToronto/top/.rss?t=week&limit=50" },
  { name: "r/torontofood", url: "https://www.reddit.com/r/torontofood/top/.rss?t=week&limit=50" },
  { name: "r/askTO", url: "https://www.reddit.com/r/askTO/search.rss?q=best+place+toronto&sort=top&t=all&limit=50" },
  { name: "r/askTO", url: "https://www.reddit.com/r/askTO/search.rss?q=recommendation+toronto&sort=top&t=all&limit=50" },
  { name: "r/askTO", url: "https://www.reddit.com/r/askTO/search.rss?q=hidden+gem+toronto&sort=top&t=all&limit=50" },
  { name: "r/askTO", url: "https://www.reddit.com/r/askTO/search.rss?q=things+to+do+toronto&sort=top&t=all&limit=50" },
  { name: "r/askTO", url: "https://www.reddit.com/r/askTO/search.rss?q=underrated+toronto&sort=top&t=all&limit=50" },
  { name: "r/askTO", url: "https://www.reddit.com/r/askTO/search.rss?q=new+opening+toronto&sort=top&t=all&limit=50" },
  { name: "r/askTO", url: "https://www.reddit.com/r/askTO/search.rss?q=best+park+toronto&sort=top&t=all&limit=50" },
  { name: "r/toronto", url: "https://www.reddit.com/r/toronto/search.rss?q=best+place&sort=top&t=all&limit=50" },
  { name: "r/toronto", url: "https://www.reddit.com/r/toronto/search.rss?q=things+to+do+toronto&sort=top&t=all&limit=50" },
  { name: "r/toronto", url: "https://www.reddit.com/r/toronto/search.rss?q=underrated+toronto&sort=top&t=all&limit=50" },
  { name: "r/askToronto", url: "https://www.reddit.com/r/askToronto/top/.rss?t=month&limit=50" },
  { name: "r/scarborough", url: "https://www.reddit.com/r/scarborough/top/.rss?t=week&limit=50" },
  { name: "r/EtobicokeON", url: "https://www.reddit.com/r/EtobicokeON/top/.rss?t=week&limit=50" },
  { name: "r/NorthYork", url: "https://www.reddit.com/r/NorthYork/top/.rss?t=week&limit=50" },
  { name: "r/mississauga", url: "https://www.reddit.com/r/mississauga/top/.rss?t=week&limit=50" },
];

export interface FeedItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
}

function extractTag(xml: string, tag: string): string {
  // Try CDATA first
  const cdataMatch = xml.match(
    new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, "i")
  );
  if (cdataMatch) return cdataMatch[1].trim();

  // Try regular tag content
  const match = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  if (match) return match[1].replace(/<[^>]*>/g, "").trim();

  return "";
}

/**
 * Extract a link from an XML block.
 * Handles both RSS <link>text</link> and Atom <link href="..." /> formats,
 * as well as <content:encoded> WordPress tags.
 */
function extractLink(xml: string): string {
  // Try standard <link>text</link>
  const textLink = extractTag(xml, "link");
  if (textLink && textLink.startsWith("http")) return textLink;

  // Try Atom-style <link href="..." /> (self-closing or with rel="alternate")
  const altMatch = xml.match(/<link[^>]+rel=["']alternate["'][^>]+href=["']([^"']+)["']/i);
  if (altMatch) return altMatch[1];

  // Generic href attribute on <link>
  const hrefMatch = xml.match(/<link[^>]+href=["']([^"']+)["']/i);
  if (hrefMatch) return hrefMatch[1];

  // Fallback to <guid>
  const guid = extractTag(xml, "guid");
  if (guid && guid.startsWith("http")) return guid;

  return "";
}

export function parseRSS(xml: string): FeedItem[] {
  const items: FeedItem[] = [];
  const isAtom = xml.includes("<entry>");
  const pattern = isAtom ? /<entry>([\s\S]*?)<\/entry>/gi : /<item>([\s\S]*?)<\/item>/gi;

  for (const match of xml.matchAll(pattern)) {
    const block = match[1];
    const title = extractTag(block, "title");

    // Description: try multiple common tag names including WordPress content:encoded
    const description =
      extractTag(block, "description") ||
      extractTag(block, "summary") ||
      extractTag(block, "content") ||
      extractTag(block, "content:encoded") ||
      "";

    const link = extractLink(block);

    const pubDate =
      extractTag(block, "pubDate") ||
      extractTag(block, "published") ||
      extractTag(block, "updated") ||
      extractTag(block, "dc:date") ||
      "";

    if (title && link) items.push({ title, description, link, pubDate });
  }
  return items;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .slice(0, 60);
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#\d+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface PublicationsScrapeResult {
  posts_saved: number;
  places_found: number;
  feeds_attempted: number;
  feeds_succeeded: number;
  feeds: Record<string, { posts: number; places: number; error?: string }>;
}

export async function scrapePublications(): Promise<PublicationsScrapeResult> {
  const sql = getDb();
  let totalPosts = 0;
  let totalPlaces = 0;
  let feedsSucceeded = 0;
  const feedResults: Record<string, { posts: number; places: number; error?: string }> = {};

  for (const feed of PUBLICATION_FEEDS) {
    if (!feedResults[feed.name]) feedResults[feed.name] = { posts: 0, places: 0 };

    let xml: string;
    try {
      const res = await fetch(feed.url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; BuzzMaps/1.0; +https://buzzmaps.vercel.app)",
          Accept: "application/rss+xml, application/xml, text/xml, application/atom+xml, */*",
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        const msg = `HTTP ${res.status}`;
        feedResults[feed.name].error = msg;
        console.warn(`[scrape] ${feed.name} (${feed.url}): ${msg}`);
        continue;
      }
      xml = await res.text();
    } catch (e) {
      const msg = String(e).slice(0, 120);
      feedResults[feed.name].error = msg;
      console.warn(`[scrape] ${feed.name} fetch error: ${msg}`);
      continue;
    }

    const items = parseRSS(xml);
    if (!items.length) {
      feedResults[feed.name].error = "No items parsed";
      console.warn(`[scrape] ${feed.name}: no items parsed from ${feed.url}`);
      continue;
    }

    feedsSucceeded++;
    console.log(`[scrape] ${feed.name}: ${items.length} items from ${feed.url}`);

    for (const item of items.slice(0, 25)) {
      const cleanDesc = stripHtml(item.description || "");
      const sentiment = extractSentiment(item.title, cleanDesc);
      const pubTs = item.pubDate
        ? Math.floor(new Date(item.pubDate).getTime() / 1000)
        : Math.floor(Date.now() / 1000);
      const redditId = `pub_${slugify(item.title)}_${pubTs}`;

      let postId: number;
      try {
        const rows = await sql`
          INSERT INTO reddit_posts (reddit_id, subreddit, title, selftext, author, url, permalink, score, num_comments, is_food_related, sentiment, created_utc)
          VALUES (${redditId}, ${feed.name}, ${item.title.slice(0, 500)}, ${cleanDesc.slice(0, 5000)}, ${feed.name}, ${item.link}, ${item.link}, 10, 0, true, ${sentiment}, ${pubTs})
          ON CONFLICT (reddit_id) DO NOTHING
          RETURNING id
        `;
        if (!rows?.length) continue;
        postId = rows[0].id;
      } catch (e) {
        console.warn(`[scrape] DB insert error for "${item.title.slice(0, 60)}": ${e}`);
        continue;
      }

      totalPosts++;
      feedResults[feed.name].posts++;

      const combinedText = `${item.title}\n${cleanDesc}`;
      let venues = await extractVenuesWithAI(combinedText);
      if (!venues.length) {
        const names = extractRestaurantNames(item.title, cleanDesc);
        venues = names.map((name) => ({ name, category: "restaurant" as PlaceCategory }));
      }

      for (const venue of venues.slice(0, 8)) {
        try {
          const place = await geocodeRestaurant(venue.name, venue.category);
          if (place) {
            await saveRestaurant(place, postId, item.title.slice(0, 200), sentiment, venue.category);
            totalPlaces++;
            feedResults[feed.name].places++;
          }
        } catch (e) {
          console.warn(`[scrape] geocode/save error for "${venue.name}": ${e}`);
        }
      }
    }

    // Rate limit between feeds to avoid hammering sources
    await delay(1500);
  }

  console.log(`[scrape] Publications done: ${totalPosts} posts, ${totalPlaces} places from ${feedsSucceeded}/${PUBLICATION_FEEDS.length} feeds`);

  return {
    posts_saved: totalPosts,
    places_found: totalPlaces,
    feeds_attempted: PUBLICATION_FEEDS.length,
    feeds_succeeded: feedsSucceeded,
    feeds: feedResults,
  };
}
