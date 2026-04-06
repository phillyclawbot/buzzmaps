// Any Toronto place worth visiting — food, bars, shops, parks, gyms, venues, etc.
const PLACE_KEYWORDS = [
  // Food & drink
  "restaurant", "ramen", "sushi", "pizza", "brunch", "dinner", "lunch",
  "breakfast", "cafe", "coffee", "bar", "pub", "bistro", "patio", "takeout",
  "dine", "eat", "food", "burger", "tacos", "thai", "indian", "italian",
  "chinese", "korean", "japanese", "vietnamese", "mexican", "greek",
  "shawarma", "falafel", "bbq", "bakery", "dessert", "ice cream", "bubble tea",
  "boba", "pho", "dim sum", "wings", "steak", "seafood", "cocktail", "beer", "wine",
  // Bars & nightlife
  "nightclub", "club", "lounge", "rooftop", "live music", "jazz", "dive bar",
  // Shopping
  "shop", "store", "boutique", "market", "vintage", "bookstore", "record store",
  "thrift", "mall", "plaza",
  // Parks & outdoors
  "park", "trail", "beach", "ravine", "skating", "rink", "outdoor",
  // Fitness & wellness
  "gym", "yoga", "pilates", "climbing", "crossfit", "spa", "sauna",
  // Entertainment & culture
  "museum", "gallery", "theatre", "cinema", "escape room", "bowling",
  "arcade", "comedy", "venue", "concert",
  // General recommendation signals
  "best place", "good spot", "recommendation", "anyone tried", "worth going",
  "overrated", "underrated", "hidden gem", "new spot", "just opened",
  "must visit", "where to go", "things to do",
];

const POSITIVE_WORDS = [
  "recommend", "amazing", "best", "love", "incredible", "outstanding", "worth",
  "must try", "favorite", "fantastic", "great", "hidden gem", "underrated",
];

const NEGATIVE_WORDS = [
  "terrible", "worst", "avoid", "overrated", "disappointing", "disgusting",
  "rude", "slow", "cold", "gross", "never again", "closed",
];

export interface RedditPost {
  reddit_id: string;
  subreddit: string;
  title: string;
  selftext: string;
  author: string;
  url: string;
  permalink: string;
  score: number;
  num_comments: number;
  created_utc: number;
  is_food_related: boolean;
  sentiment: "positive" | "negative" | "neutral";
}

export function isPlaceRelated(title: string, selftext: string): boolean {
  const text = `${title} ${selftext}`.toLowerCase();
  return PLACE_KEYWORDS.some((kw) => text.includes(kw));
}

// Backwards-compat alias
export const isFoodRelated = isPlaceRelated;

export function extractSentiment(
  title: string,
  selftext: string
): "positive" | "negative" | "neutral" {
  const text = `${title} ${selftext}`.toLowerCase();
  const posCount = POSITIVE_WORDS.filter((w) => text.includes(w)).length;
  const negCount = NEGATIVE_WORDS.filter((w) => text.includes(w)).length;
  if (posCount > negCount) return "positive";
  if (negCount > posCount) return "negative";
  return "neutral";
}

// --- Reddit OAuth support ---
// Set REDDIT_CLIENT_ID and REDDIT_CLIENT_SECRET env vars for reliable access.
// Uses "application-only" (client_credentials) OAuth — no user login needed.
// See: https://github.com/reddit-archive/reddit/wiki/OAuth2#application-only-oauth

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getRedditAccessToken(): Promise<string | null> {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  try {
    const res = await fetch("https://www.reddit.com/api/v1/access_token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "BuzzMaps/1.0 (by /u/buzzmaps)",
      },
      body: "grant_type=client_credentials",
    });

    if (!res.ok) {
      console.warn(`[reddit] OAuth token request failed: HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };
    return cachedToken.token;
  } catch (e) {
    console.warn(`[reddit] OAuth error: ${e}`);
    return null;
  }
}

/**
 * Fetch posts from a subreddit. Tries OAuth first (oauth.reddit.com),
 * falls back to public JSON API (www.reddit.com) if no credentials.
 */
export async function fetchSubredditPosts(
  subreddit: string,
  limit: number = 100,
  after?: string
): Promise<{ posts: RedditPost[]; after: string | null }> {
  const token = await getRedditAccessToken();

  let url: string;
  let headers: Record<string, string>;

  if (token) {
    // Authenticated request via OAuth
    url = `https://oauth.reddit.com/r/${subreddit}/new?limit=${limit}`;
    if (after) url += `&after=${after}`;
    headers = {
      Authorization: `Bearer ${token}`,
      "User-Agent": "BuzzMaps/1.0 (by /u/buzzmaps)",
    };
  } else {
    // Fallback to public API (may return 403/429)
    url = `https://www.reddit.com/r/${subreddit}/new.json?limit=${limit}`;
    if (after) url += `&after=${after}`;
    headers = {
      "User-Agent": "Mozilla/5.0 (compatible; BuzzMaps/1.0; +https://buzzmaps.vercel.app)",
    };
  }

  const res = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) {
    console.warn(`[reddit] r/${subreddit}: HTTP ${res.status} (${token ? "OAuth" : "public"})`);
    throw new Error(`Reddit API error: ${res.status} for r/${subreddit}`);
  }

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

  return {
    posts,
    after: data?.data?.after || null,
  };
}
