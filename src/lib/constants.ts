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

// Brand colors — mirror --brand / --brand-hover in globals.css.
export const BRAND_PRIMARY = "#ff5b3a";
export const BRAND_PRIMARY_DARK = "#e64a29";

// Sentiment colors — mirror --sent-pos / --sent-neu / --sent-neg in globals.css.
export const SENTIMENT_COLORS: Record<string, string> = {
  positive: "#10b981",
  negative: "#ef4444",
  neutral: "#f59e0b",
};

// Category colors — vibrant & distinct, accessible on white.
export const CATEGORY_COLORS: Record<PlaceCategory, string> = {
  restaurant: "#ff5b3a",
  bar: "#8b5cf6",
  cafe: "#6366f1",
  club: "#ec4899",
  shop: "#06b6d4",
  park: "#10b981",
  gym: "#f43f5e",
  venue: "#f59e0b",
  market: "#14b8a6",
  museum: "#3b82f6",
  event: "#d946ef",
  landmark: "#475569",
  attraction: "#f97316",
  other: "#64748b",
};

// Darker tone of each category color, used to paint gradient pins.
export const CATEGORY_COLORS_DARK: Record<PlaceCategory, string> = {
  restaurant: "#e64a29",
  bar: "#6d28d9",
  cafe: "#4338ca",
  club: "#be185d",
  shop: "#0284a8",
  park: "#047857",
  gym: "#be123c",
  venue: "#c2780c",
  market: "#0f766e",
  museum: "#1d4ed8",
  event: "#a21caf",
  landmark: "#334155",
  attraction: "#c2410c",
  other: "#475569",
};

// Shared category filter options used in the top bar and list view.
// Labels are plain text — chrome should render an icon via CategoryIcon
// when a glyph is needed, not an emoji. Keep this list emoji-free.
export const CATEGORY_FILTERS = [
  { label: "All", value: "all" },
  { label: "Food", value: "restaurant" },
  { label: "Bars", value: "bar" },
  { label: "Cafés", value: "cafe" },
  { label: "Clubs", value: "club" },
  { label: "Venues", value: "venue" },
  { label: "Parks", value: "park" },
  { label: "Shops", value: "shop" },
  { label: "Gyms", value: "gym" },
  { label: "Markets", value: "market" },
  { label: "Museums", value: "museum" },
  { label: "Events", value: "event" },
  { label: "Landmarks", value: "landmark" },
  { label: "Attractions", value: "attraction" },
] as const;

// Valid categories for database storage
export const VALID_CATEGORIES = [
  "restaurant", "bar", "cafe", "club", "shop", "park", "gym", "venue", "market", "museum", "event", "landmark", "attraction", "other",
] as const;

// Known publication subreddits (not actual Reddit subs)
export const TICKETING_SOURCES = new Set(["Ticketmaster", "Eventbrite"]);

export function isTicketingSource(subreddit: string): boolean {
  return TICKETING_SOURCES.has(subreddit);
}

export const PUBLICATION_NAMES = new Set([
  "Ticketmaster", "Eventbrite",
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
  "Streets of Toronto",
  "Toronto Storeys",
  "Notable.ca",
  "insauga.com",
  "The Local",
  "Daily Hive",
  "Curiocity",
  "Toronto.com",
]);

export function isPublication(subreddit: string): boolean {
  return PUBLICATION_NAMES.has(subreddit);
}

// Category gradient classes for hero sections (single source of truth).
// Pairs each category with a warm sibling so the hero feels energetic.
export const CATEGORY_GRADIENT: Record<PlaceCategory, string> = {
  restaurant: "from-[#ff5b3a] to-[#ff8a3d]",
  bar: "from-[#8b5cf6] to-[#d946ef]",
  cafe: "from-[#6366f1] to-[#8b5cf6]",
  club: "from-[#ec4899] to-[#f43f5e]",
  shop: "from-[#06b6d4] to-[#3b82f6]",
  park: "from-[#10b981] to-[#84cc16]",
  gym: "from-[#f43f5e] to-[#ff5b3a]",
  venue: "from-[#f59e0b] to-[#ff8a3d]",
  market: "from-[#14b8a6] to-[#10b981]",
  museum: "from-[#3b82f6] to-[#6366f1]",
  event: "from-[#d946ef] to-[#ec4899]",
  landmark: "from-[#475569] to-[#64748b]",
  attraction: "from-[#f97316] to-[#f59e0b]",
  other: "from-[#64748b] to-[#94a3b8]",
};

// Sentiment text labels for accessibility
export const SENTIMENT_LABELS: Record<string, string> = {
  positive: "Positive",
  negative: "Negative",
  neutral: "Neutral",
};

// API pagination defaults
export const DEFAULT_PAGE_SIZE = 100;
export const MAX_PAGE_SIZE = 2000;
export const MAX_SEARCH_QUERY_LENGTH = 200;
