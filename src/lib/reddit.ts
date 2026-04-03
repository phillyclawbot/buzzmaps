const FOOD_KEYWORDS = [
  "restaurant", "ramen", "sushi", "pizza", "brunch", "dinner", "lunch",
  "breakfast", "cafe", "coffee", "bar", "pub", "bistro", "patio", "takeout",
  "delivery", "dine", "eat", "food", "burger", "tacos", "thai", "indian",
  "italian", "chinese", "korean", "japanese", "vietnamese", "mexican", "greek",
  "shawarma", "falafel", "bbq", "bakery", "dessert", "ice cream", "bubble tea",
  "boba", "pho", "dim sum", "wings", "steak", "seafood", "oyster", "cocktail",
  "beer", "wine", "gastropub", "food court", "buffet", "vegan", "vegetarian",
  "halal", "kosher", "gluten free", "best place", "good spot", "recommendation",
  "where to eat", "anyone tried", "worth going", "overrated", "underrated",
  "hidden gem", "hole in wall", "new spot", "just opened", "closed down",
];

const POSITIVE_WORDS = [
  "recommend", "amazing", "best", "love", "incredible", "outstanding", "worth",
  "must try", "favorite", "fantastic", "delicious", "great",
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

export function isFoodRelated(title: string, selftext: string): boolean {
  const text = `${title} ${selftext}`.toLowerCase();
  return FOOD_KEYWORDS.some((kw) => text.includes(kw));
}

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

export async function fetchSubredditPosts(
  subreddit: string,
  limit: number = 100,
  after?: string
): Promise<{ posts: RedditPost[]; after: string | null }> {
  let url = `https://www.reddit.com/r/${subreddit}/new.json?limit=${limit}`;
  if (after) url += `&after=${after}`;

  const res = await fetch(url, {
    headers: { "User-Agent": "BuzzMaps/1.0" },
  });

  if (!res.ok) {
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
        is_food_related: isFoodRelated(title, selftext),
        sentiment: extractSentiment(title, selftext),
      };
    }
  );

  return {
    posts,
    after: data?.data?.after || null,
  };
}
