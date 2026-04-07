import { getDb } from "@/lib/db";
import Link from "next/link";
import { CATEGORY_EMOJI } from "@/lib/types";
import type { PlaceCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

interface CategoryPlace {
  id: number;
  name: string;
  address: string;
  mention_count: number;
  google_rating: number | null;
  photo_url: string | null;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ cat: string }>;
}) {
  const { cat } = await params;
  const sql = getDb();

  const places = await sql`
    SELECT
      r.id, r.name, r.address, r.google_rating, r.photo_url,
      COUNT(DISTINCT pr.post_id)::int as mention_count
    FROM restaurants r
    LEFT JOIN post_restaurants pr ON pr.restaurant_id = r.id
    WHERE r.category = ${cat}
    GROUP BY r.id
    ORDER BY mention_count DESC
  ` as unknown as CategoryPlace[];

  const emoji = CATEGORY_EMOJI[cat as PlaceCategory] || "📍";
  const label = capitalize(cat);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 h-12 bg-white/95 backdrop-blur-sm border-b border-slate-200 z-50 flex items-center px-4 gap-3">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff6b35] shrink-0" />
          <span className="font-semibold text-sm tracking-tight bg-gradient-to-r from-[#ff6b35] to-[#f59e0b] bg-clip-text text-transparent">
            BuzzMaps
          </span>
        </Link>
        <span className="text-slate-300">·</span>
        <span className="text-sm font-semibold text-slate-700">{emoji} {label}</span>
      </div>

      <div className="pt-16 pb-20 max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-[#ff6b35] transition-colors mb-3"
          >
            ← Back to map
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">
            {emoji} {label} in Toronto
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {places.length} place{places.length !== 1 ? "s" : ""} tracked by BuzzMaps
          </p>
        </div>

        {/* Grid of place cards */}
        {places.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <span className="text-4xl mb-3">{emoji}</span>
            <p className="text-sm font-medium text-slate-500">No {label.toLowerCase()} places tracked yet</p>
            <p className="text-xs text-slate-400 mt-1">Be the first to suggest one!</p>
            <Link
              href="/"
              className="mt-4 px-5 py-2 bg-[#ff6b35] text-white text-xs font-semibold rounded-lg hover:bg-[#ea580c] transition-colors"
            >
              ➕ Submit a {label}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {places.map((place) => (
              <Link
                key={place.id}
                href={`/place/${encodeURIComponent(place.name)}`}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-[#ff6b35]/40 transition-all overflow-hidden cursor-pointer hover:scale-[1.01]"
              >
                {place.photo_url && (
                  <img
                    src={place.photo_url}
                    alt={place.name}
                    className="w-full h-32 object-cover"
                  />
                )}
                <div className="p-4">
                  <div className="flex items-start gap-2">
                    {!place.photo_url && (
                      <span className="text-xl shrink-0">{emoji}</span>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 truncate">{place.name}</h3>
                      {place.address && (
                        <p className="text-xs text-slate-400 truncate mt-0.5">{place.address}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs font-semibold bg-[#ff6b35]/10 text-[#ff6b35] px-2 py-0.5 rounded-full">
                      {place.mention_count} mention{place.mention_count !== 1 ? "s" : ""}
                    </span>
                    {place.google_rating && (
                      <span className="text-xs text-slate-400">⭐ {place.google_rating.toFixed(1)}</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
