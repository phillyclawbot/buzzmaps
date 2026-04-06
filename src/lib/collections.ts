import type { PlaceCategory } from "@/lib/types";

export type CollectionQuery =
  | { type: "name_or_post_contains"; term: string }
  | { type: "category"; category: PlaceCategory }
  | { type: "category_and_post_contains"; category: PlaceCategory; term: string }
  | { type: "recent"; days: number }
  | { type: "top_by_mention"; limit: number };

export interface CollectionDef {
  id: string;
  emoji: string;
  title: string;
  description: string;
  query: CollectionQuery;
  linkParams: string;
}

export const COLLECTIONS: CollectionDef[] = [
  {
    id: "buzzing",
    emoji: "\u{1F525}",
    title: "Buzzing Right Now",
    description: "The most-talked-about places across all of Reddit Toronto.",
    query: { type: "top_by_mention", limit: 20 },
    linkParams: "?sort=mentions",
  },
  {
    id: "coffee",
    emoji: "\u2615",
    title: "Best Coffee Spots",
    description: "Toronto's most-mentioned cafes and specialty coffee shops.",
    query: { type: "category", category: "cafe" },
    linkParams: "?category=cafe",
  },
  {
    id: "parks",
    emoji: "\u{1F333}",
    title: "Parks & Outdoors",
    description: "Green spaces, trails, and outdoor gems across the city.",
    query: { type: "category", category: "park" },
    linkParams: "?category=park",
  },
  {
    id: "bars",
    emoji: "\u{1F37A}",
    title: "Bars & Drinks",
    description: "Where Toronto goes out \u2014 bars and watering holes with the most buzz.",
    query: { type: "category", category: "bar" },
    linkParams: "?category=bar",
  },
  {
    id: "shops",
    emoji: "\u{1F6CD}\uFE0F",
    title: "Best Shops",
    description: "Boutiques, stores, and spots worth browsing, as told by Reddit.",
    query: { type: "category", category: "shop" },
    linkParams: "?category=shop",
  },
  {
    id: "kensington",
    emoji: "\u{1F3D8}\uFE0F",
    title: "Kensington Market",
    description: "The eclectic neighbourhood Reddit can\u2019t stop talking about.",
    query: { type: "name_or_post_contains", term: "kensington" },
    linkParams: "?q=kensington",
  },
  {
    id: "danforth",
    emoji: "\u{1F957}",
    title: "The Danforth / Greektown",
    description: "East-end eats and neighbourhood gems along the Danforth.",
    query: { type: "name_or_post_contains", term: "danforth" },
    linkParams: "?q=danforth",
  },
  {
    id: "chinatown",
    emoji: "\u{1F962}",
    title: "Chinatown Eats",
    description: "Dumplings, noodles, and more from Toronto\u2019s Chinatown.",
    query: { type: "name_or_post_contains", term: "chinatown" },
    linkParams: "?q=chinatown",
  },
  {
    id: "little-italy",
    emoji: "\u{1F1EE}\u{1F1F9}",
    title: "Little Italy / College St",
    description: "The College Street strip and Little Italy favourites.",
    query: { type: "name_or_post_contains", term: "little italy" },
    linkParams: "?q=little+italy",
  },
  {
    id: "ramen",
    emoji: "\u{1F35C}",
    title: "Ramen & Noodles",
    description: "The spots Reddit keeps coming back to for a hot bowl.",
    query: { type: "name_or_post_contains", term: "ramen" },
    linkParams: "?q=ramen",
  },
  {
    id: "museums",
    emoji: "\u{1F3DB}\uFE0F",
    title: "Museums & Culture",
    description: "Art galleries, museums, and cultural spots worth your time.",
    query: { type: "category", category: "museum" },
    linkParams: "?category=museum",
  },
];

export function getCollectionById(id: string): CollectionDef | undefined {
  return COLLECTIONS.find((c) => c.id === id);
}
