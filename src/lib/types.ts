export type PlaceCategory =
  | "restaurant"
  | "bar"
  | "cafe"
  | "club"
  | "shop"
  | "park"
  | "gym"
  | "venue"
  | "market"
  | "museum"
  | "event"
  | "landmark"
  | "attraction"
  | "other";

export const CATEGORY_EMOJI: Record<PlaceCategory, string> = {
  restaurant: "🍽️",
  bar: "🍺",
  cafe: "☕",
  club: "🎵",
  shop: "🛍️",
  park: "🌳",
  gym: "💪",
  venue: "🎭",
  market: "🥬",
  museum: "🏛️",
  event: "🎪",
  landmark: "🏗️",
  attraction: "🎡",
  other: "📍",
};

/** Entity-specific metadata for different place types */
export interface PlaceMetadata {
  event_date?: string;
  event_end_date?: string;
  ticket_url?: string;
  venue_name?: string;
  hours?: string;
  admission_fee?: string;
  website?: string;
  [key: string]: string | undefined;
}

export interface Restaurant {
  id: number;
  name: string;
  place_id: string;
  address: string;
  lat: number;
  lng: number;
  google_rating: number | null;
  google_reviews_count: number | null;
  cuisine_type: string | null;
  price_level: number | null;
  category: PlaceCategory;
  mention_count: number;
  latest_mention: number;
  photo_url: string | null;
  metadata?: PlaceMetadata;
  posts: PostMention[];
}

export interface PostMention {
  id: number;
  title: string;
  subreddit: string;
  score: number;
  num_comments: number;
  permalink: string;
  sentiment: string;
  created_utc: number;
  mentions_in_thread?: number;
}

export interface RedditPostWithRestaurants {
  id: number;
  title: string;
  subreddit: string;
  score: number;
  num_comments: number;
  permalink: string;
  sentiment: string;
  created_utc: number;
  author: string;
  restaurants: {
    id: number;
    name: string;
    lat: number;
    lng: number;
    sentiment: string;
    category: PlaceCategory;
  }[] | null;
}

export interface Stats {
  restaurants: number;
  posts: number;
  last_scraped: string | null;
}
