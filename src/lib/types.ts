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
  mention_count: number;
  latest_mention: number;
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
  }[] | null;
}

export interface Stats {
  restaurants: number;
  posts: number;
  last_scraped: string | null;
}
