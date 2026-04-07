import { getDb } from "@/lib/db";
import Link from "next/link";
import type { PlaceCategory } from "@/lib/types";
import type { CollectionPlaceRow } from "@/lib/types";
import CollectionCard from "@/components/CollectionCard";
import { COLLECTIONS } from "@/lib/collections";
import type { CollectionQuery } from "@/lib/collections";
import { IconGrid } from "@/lib/icons";

export const dynamic = "force-dynamic";

async function fetchCollectionPlaces(
  sql: ReturnType<typeof getDb>,
  query: CollectionQuery
): Promise<CollectionPlaceRow[]> {
  const thirtyDaysAgo = Math.floor(
    (Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000
  );

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
    return rows as CollectionPlaceRow[];
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
    return rows as CollectionPlaceRow[];
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
    return rows as CollectionPlaceRow[];
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
    return rows as CollectionPlaceRow[];
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
    return rows as CollectionPlaceRow[];
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
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
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
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#ff6b35] to-[#f59e0b] flex items-center justify-center shadow-sm">
              <IconGrid size={18} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              Collections
            </h1>
          </div>
          <p className="text-slate-500 text-sm">
            Curated lists of Toronto&apos;s best places, powered by Reddit
            buzz.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {collectionsWithData.map((col) => (
            <CollectionCard
              key={col.id}
              id={col.id}
              title={col.title}
              description={col.description}
              places={col.places}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
