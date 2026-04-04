import type { PlaceCategory } from "./types";

// Toronto geographic bounds used for geocoding validation
export const TORONTO_BOUNDS = {
  minLat: 43.4,
  maxLat: 44.0,
  minLng: -79.8,
  maxLng: -78.8,
} as const;

// Downtown Toronto center coordinates (used as fallback)
export const TORONTO_CENTER = {
  lat: 43.6532,
  lng: -79.3832,
} as const;

// Brand colors
export const BRAND_PRIMARY = "#ff6b35";
export const BRAND_PRIMARY_DARK = "#ea580c";

// Sentiment colors used across map pins, sidebar, and list view
export const SENTIMENT_COLORS: Record<string, string> = {
  positive: "#22c55e",
  negative: "#ef4444",
  neutral: "#f59e0b",
};

// Category colors for map pins and list cards
export const CATEGORY_COLORS: Record<PlaceCategory, string> = {
  restaurant: "#ff6b35",
  bar: "#a855f7",
  cafe: "#6366f1",
  club: "#ec4899",
  shop: "#06b6d4",
  park: "#22c55e",
  gym: "#ef4444",
  venue: "#f59e0b",
  market: "#10b981",
  museum: "#3b82f6",
  other: "#64748b",
};

// Shared category filter options used in the top bar and list view
export const CATEGORY_FILTERS = [
  { label: "All", value: "all" },
  { label: "\u{1F37D}\uFE0F Food", value: "restaurant" },
  { label: "\u{1F37A} Bar", value: "bar" },
  { label: "\u2615 Cafe", value: "cafe" },
  { label: "\u{1F3B5} Venues", value: "venue" },
  { label: "\u{1F333} Parks", value: "park" },
  { label: "\u{1F6CD}\uFE0F Shops", value: "shop" },
] as const;

// Valid categories for database storage
export const VALID_CATEGORIES = [
  "restaurant", "bar", "cafe", "club", "shop", "park", "gym", "venue", "market", "museum", "other",
] as const;

// Known publication subreddits (not actual Reddit subs)
export const PUBLICATION_NAMES = new Set([
  "BlogTO", "BlogTO Food", "BlogTO Arts",
  "Narcity", "Narcity Toronto",
  "Toronto Life", "Toronto Life Food",
  "NOW Magazine",
  "Eater Toronto",
  "Toronto Star", "Toronto Star Food",
  "Toronto Sun",
  "Globe and Mail",
  "Post City",
  "Spacing",
  "Toronto Guardian",
  "Exclaim",
]);

export function isPublication(subreddit: string): boolean {
  return PUBLICATION_NAMES.has(subreddit);
}

// API pagination defaults
export const DEFAULT_PAGE_SIZE = 100;
export const MAX_PAGE_SIZE = 500;
export const MAX_SEARCH_QUERY_LENGTH = 200;
