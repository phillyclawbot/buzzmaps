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

// Brand colors — mirror the CSS token values in globals.css (--brand / --brand-hover).
// Component code should prefer `var(--brand)` in className/style; these hex literals
// exist only for places that need a raw value (e.g. Leaflet pin SVGs, inline <svg fill>).
export const BRAND_PRIMARY = "#ff6b35";
export const BRAND_PRIMARY_DARK = "#ea580c";

// Sentiment colors — mirror --sent-pos-fill / --sent-neu / --sent-neg in globals.css.
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
  event: "#d946ef",
  landmark: "#78716c",
  attraction: "#f97316",
  other: "#64748b",
};

// Shared category filter options used in the top bar and list view
export const CATEGORY_FILTERS = [
  { label: "All", value: "all" },
  { label: "\u{1F37D}\uFE0F Food", value: "restaurant" },
  { label: "\u{1F37A} Bar", value: "bar" },
  { label: "\u2615 Cafe", value: "cafe" },
  { label: "\u{1F3B5} Club", value: "club" },
  { label: "\u{1F3B5} Venues", value: "venue" },
  { label: "\u{1F333} Parks", value: "park" },
  { label: "\u{1F6CD}\uFE0F Shops", value: "shop" },
  { label: "\u{1F4AA} Gym", value: "gym" },
  { label: "\u{1F96C} Markets", value: "market" },
  { label: "\u{1F3DB}\uFE0F Museums", value: "museum" },
  { label: "\u{1F3AA} Events", value: "event" },
  { label: "\u{1F3D7}\uFE0F Landmarks", value: "landmark" },
  { label: "\u{1F3A1} Attractions", value: "attraction" },
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

// Category gradient classes for hero sections (single source of truth)
export const CATEGORY_GRADIENT: Record<PlaceCategory, string> = {
  restaurant: "from-orange-500 to-amber-400",
  bar: "from-purple-500 to-fuchsia-400",
  cafe: "from-indigo-500 to-blue-400",
  club: "from-pink-500 to-rose-400",
  shop: "from-cyan-500 to-sky-400",
  park: "from-green-500 to-emerald-400",
  gym: "from-red-500 to-orange-400",
  venue: "from-amber-500 to-yellow-400",
  market: "from-teal-500 to-green-400",
  museum: "from-blue-500 to-indigo-400",
  event: "from-fuchsia-500 to-purple-400",
  landmark: "from-sky-500 to-cyan-400",
  attraction: "from-rose-500 to-pink-400",
  other: "from-slate-500 to-slate-400",
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
