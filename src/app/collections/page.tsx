import { getDb } from "@/lib/db";
import Link from "next/link";
import type { PlaceCategory } from "@/lib/types";
import { CATEGORY_EMOJI } from "@/lib/types";

export const dynamic = "force-dynamic";

interface CollectionDef {
  id: string;
  emoji: string;
  title: string;
  description: string;
  query: CollectionQuery;
  linkParams: string;
}

type CollectionQuery =
  | { type: "name_or_post_contains"; term: string }
  | { type: "category"; category: PlaceCategory }
  | { type: "category_and_post_contains"; category: PlaceCategory; term: string }
  | { type: "recent"; days: number }
  | { type: "top_by_mention"; limit: number };

const COLLECTIONS: CollectionDef[] = [
  {
    id: "buzzing",
    emoji: "🔥",
    title: "Buzzing Right Now",
    description: "The most-talked-about places across all of Reddit Toronto.",
    query: { type: "top_by_mention", limit: 20 },
    linkParams: "?sort=mentions",
  },
  {
    id: "new",
    emoji: "🆕",
    title: "New This Month",
    description: "Places that just showed up on the radar in the last 30 days.",
    query: { type: "recent", days: 30 },
    linkParams: "?since=30d",
  },
  {
    id: "coffee",
    emoji: "☕",
    title: "Best Coffee Spots",
    description: "Toronto's most-mentioned cafes and specialty coffee shops.",
    query: { type: "category", category: "cafe" },
    linkParams: "?category=cafe",
  },
  {
    id: "parks",
    emoji: "🌳",
    title: "Parks & Outdoors",
    description: "Green spaces, trails, and outdoor gems across the city.",
    query: { type: "category", category: "park" },
    linkParams: "?category=park",
  },
  {
    id: "bars",
    emoji: "🍺",
    title: "Bars & Drinks",
    description: "Where Toronto goes out — bars and watering holes with the most buzz.",
    query: { type: "category", category: "bar" },
    linkParams: "?category=bar",
  },
  {
    id: "shops",
    emoji: "🛍️",
    title: "Best Shops",
    description: "Boutiques, stores, and spots worth browsing, as told by Reddit.",
    query: { type: "category", category: "shop" },
    linkParams: "?category=shop",
  },
  {
    id: "kensington",
    emoji: "🏘️",
    title: "Kensington Market",
    description: "The eclectic neighbourhood Reddit can't stop talking about.",
    query: { type: "name_or_post_contains", term: "kensington" },
    linkParams: "?q=kensington",
  },
  {
    id: "danforth",
    emoji: "🥗",
    title: "The Danforth / Greektown",
    description: "East-end eats and neighbourhood gems along the Danforth.",
    query: { type: "name_or_post_contains", term: "danforth" },
    linkParams: "?q=danforth",
  },
  {
    id: "chinatown",
    emoji: "🥢",
    title: "Chinatown Eats",
    description: "Dumplings, noodles, and more from Toronto's Chinatown.",
    query: { type: "name_or_post_contains", term: "chinatown" },
    linkParams: "?q=chinatown",
  },
  {
    id: "little-italy",
    emoji: "🇮🇹",
    title: "Little Italy / College St",
    description: "The College Street strip and Little Italy favourites.",
    query: { type: "name_or_post_contains", term: "little italy" },
    linkParams: "?q=little+italy",
  },
  {
    id: "ramen",
    emoji: "🍜",
    title: "Ramen & Noodles",
    description: "The spots Reddit keeps coming back to for a hot bowl.",
    query: { type: "name_or_post_contains", term: "ramen" },
    linkParams: "?q=ramen",
  },
  {
    id: "museums",
    emoji: "🏛️",
    title: "Museums & Culture",
    description: "Art galleries, museums, and cultural spots worth your time.",
    query: { type: "category", category: "museum" },
    linkParams: "?category=museum",
  },
];

interface PlaceRow {
  id: number;
  name: string;
  category: PlaceCategory;
  mention_count: number;
  google_rating: number | null;
}

async function fetchCollectionPlaces(sql: ReturnType<typeof getDb>, query: CollectionQuery): Promise<PlaceRow[]> {
  const thirtyDaysAgo = Math.floor((Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000);

  if (query.type === "name_or_post_contains") {
    const term = `%${query.term}%`;
    const rows = await sql`
      SELECT DISTINCT r.id, r.name, r.category, COUNT(DISTINCT pr.post_id)::int as mention_count, r.google_rating
      FROM restaurants r
      JOIN post_restaurants pr ON pr.restaurant_id = r.id
      JOIN reddit_posts rp ON rp.id = pr.post_id
      WHERE r.name ILIKE ${term} OR rp.title ILIKE ${term}
      GROUP BY r.id, r.name, r.category, r.google_rating
      ORDER BY mention_count DESC
      LIMIT 20
    `;
    return rows as PlaceRow[];
  }

  if (query.type === "category") {
    const rows = await sql`
      SELECT r.id, r.name, r.category, COUNT(DISTINCT pr.post_id)::int as mention_count, r.google_rating
      FROM restaurants r
      LEFT JOIN post_restaurants pr ON pr.restaurant_id = r.id
      WHERE r.category = ${query.category}
      GROUP BY r.id, r.name, r.category, r.google_rating
      ORDER BY mention_count DESC
      LIMIT 20
    `;
    return rows as PlaceRow[];
  }

  if (query.type === "category_and_post_contains") {
    const term = `%${query.term}%`;
    const rows = await sql`
      SELECT DISTINCT r.id, r.name, r.category, COUNT(DISTINCT pr.post_id)::int as mention_count, r.google_rating
      FROM restaurants r
      JOIN post_restaurants pr ON pr.restaurant_id = r.id
      JOIN reddit_posts rp ON rp.id = pr.post_id
      WHERE r.category = ${query.category} AND rp.title ILIKE ${term}
      GROUP BY r.id, r.name, r.category, r.google_rating
      ORDER BY mention_count DESC
      LIMIT 20
    `;
    return rows as PlaceRow[];
  }

  if (query.type === "recent") {
    const rows = await sql`
      SELECT r.id, r.name, r.category, COUNT(DISTINCT pr.post_id)::int as mention_count, r.google_rating
      FROM restaurants r
      JOIN post_restaurants pr ON pr.restaurant_id = r.id
      JOIN reddit_posts rp ON rp.id = pr.post_id
      WHERE rp.created_utc > ${thirtyDaysAgo}
      GROUP BY r.id, r.name, r.category, r.google_rating
      ORDER BY MAX(rp.created_utc) DESC
      LIMIT 20
    `;
    return rows as PlaceRow[];
  }

  if (query.type === "top_by_mention") {
    const rows = await sql`
      SELECT r.id, r.name, r.category, COUNT(DISTINCT pr.post_id)::int as mention_count, r.google_rating
      FROM restaurants r
      LEFT JOIN post_restaurants pr ON pr.restaurant_id = r.id
      GROUP BY r.id, r.name, r.category, r.google_rating
      ORDER BY mention_count DESC
      LIMIT ${query.limit}
    `;
    return rows as PlaceRow[];
  }

  return [];
}

export default async function CollectionsPage() {
  const sql = getDb();

  const collectionsWithData = await Promise.all(
    COLLECTIONS.map(async (col) => {
      const places = await fetchCollectionPlaces(sql, col.query);
      return { ...col, places };
    })
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-slate-200 z-10 h-12 flex items-center px-4 gap-3">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-[#ff6b35] transition-colors font-medium"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back to map
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff6b35]" />
          <span className="font-semibold text-sm tracking-tight bg-gradient-to-r from-[#ff6b35] to-[#f59e0b] bg-clip-text text-transparent">
            BuzzMaps
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 pb-20 page-enter">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">📚 Collections</h1>
          <p className="text-slate-500 text-sm">Curated lists of Toronto&apos;s best places, powered by Reddit buzz.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {collectionsWithData.map((col) => (
            <Link
              key={col.id}
              href={`/${col.linkParams}`}
              className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-[#ff6b35]/40 transition-all overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-br from-[#ff6b35]/10 to-[#f59e0b]/5 px-5 pt-5 pb-3">
                <div className="flex items-start gap-3">
                  <span className="text-3xl leading-none">{col.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm font-bold text-slate-900 group-hover:text-[#ff6b35] transition-colors leading-tight">
                      {col.title}
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{col.description}</p>
                  </div>
                </div>
              </div>

              {/* Count badge + place list */}
              <div className="px-5 pb-5 pt-3">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold bg-[#ff6b35]/10 text-[#ff6b35] px-2.5 py-1 rounded-full">
                    {col.places.length} place{col.places.length !== 1 ? "s" : ""}
                  </span>
                  <span className="text-xs text-slate-400 ml-auto">View all →</span>
                </div>

                {col.places.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No places found yet</p>
                ) : (
                  <div className="space-y-1.5">
                    {col.places.slice(0, 5).map((place, i) => (
                      <div key={place.id} className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 w-4 shrink-0">{i + 1}</span>
                        <span className="text-sm leading-none shrink-0">{CATEGORY_EMOJI[place.category] || "📍"}</span>
                        <span className="text-xs font-medium text-slate-700 flex-1 truncate">{place.name}</span>
                        {place.google_rating && (
                          <span className="text-[10px] text-slate-400 shrink-0">⭐ {place.google_rating.toFixed(1)}</span>
                        )}
                        <span className="text-[10px] text-[#ff6b35] font-semibold shrink-0 bg-[#ff6b35]/10 px-1.5 py-0.5 rounded-full">
                          {place.mention_count}💬
                        </span>
                      </div>
                    ))}
                    {col.places.length > 5 && (
                      <p className="text-[10px] text-slate-400 pl-10">+{col.places.length - 5} more</p>
                    )}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
