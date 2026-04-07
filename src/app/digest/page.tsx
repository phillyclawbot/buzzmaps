import { getDb } from "@/lib/db";
import Link from "next/link";
import { CATEGORY_EMOJI } from "@/lib/types";
import type { PlaceCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

interface TopPlace {
  id: number;
  name: string;
  address: string;
  category: string;
  mention_count: number;
  google_rating: number | null;
  photo_url: string | null;
}

interface NewPlace {
  id: number;
  name: string;
  address: string;
  category: string;
  mention_count: number;
  first_seen_at: string | null;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" });
}

const now = new Date();
const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

export default async function DigestPage() {
  const sql = getDb();

  const weekAgoEpoch = Math.floor(weekAgo.getTime() / 1000);

  const [topPlacesRaw, newPlacesRaw] = await Promise.all([
    // Top 5 most-mentioned this week
    sql`
      SELECT
        r.id, r.name, r.address, r.category, r.google_rating, r.photo_url,
        COUNT(DISTINCT pr.post_id)::int as mention_count
      FROM restaurants r
      JOIN post_restaurants pr ON pr.restaurant_id = r.id
      JOIN reddit_posts rp ON rp.id = pr.post_id
      WHERE rp.created_utc > ${weekAgoEpoch}
      GROUP BY r.id
      ORDER BY mention_count DESC
      LIMIT 5
    ` as unknown as Promise<TopPlace[]>,
    // Newest places added this week
    sql`
      SELECT id, name, address, category, first_seen_at,
        (SELECT COUNT(*)::int FROM post_restaurants WHERE restaurant_id = r.id) as mention_count
      FROM restaurants r
      WHERE first_seen_at > ${weekAgo.toISOString()}
      ORDER BY first_seen_at DESC
      LIMIT 8
    ` as unknown as Promise<NewPlace[]>,
  ]);

  const topPlaces = topPlacesRaw as TopPlace[];
  const newPlaces = newPlacesRaw as NewPlace[];

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
        <span className="text-sm font-semibold text-slate-700">📧 Weekly Digest</span>
      </div>

      <div className="pt-16 pb-20 flex justify-center px-4">
        {/* Email wrapper — max 600px centered white card */}
        <div className="w-full max-w-[600px] bg-white rounded-2xl shadow-md overflow-hidden mt-4">
          {/* Email header */}
          <div
            style={{ background: "linear-gradient(135deg, #ff6b35 0%, #ea580c 100%)" }}
            className="px-8 py-10 text-white"
          >
            <div className="flex items-center gap-2 mb-3 opacity-80">
              <div className="w-2 h-2 rounded-full bg-white" />
              <span className="text-sm font-semibold tracking-wide">BUZZMAPS WEEKLY</span>
            </div>
            <h1 className="text-3xl font-extrabold leading-tight mb-2">
              🗺️ Toronto's Top Picks
            </h1>
            <p className="text-white/80 text-sm">
              Week of {formatDate(weekAgo)} — {formatDate(now)}
            </p>
          </div>

          {/* Email body */}
          <div className="px-8 py-6">
            <p className="text-slate-600 text-sm leading-relaxed mb-6">
              Hey there 👋 Here's what Toronto was buzzing about this week — the most-mentioned spots from Reddit
              and local publications, curated automatically by BuzzMaps.
            </p>

            {/* Section: Top picks */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-0.5 flex-1 bg-slate-100" />
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap px-2">
                  🔥 This Week's Most Mentioned
                </h2>
                <div className="h-0.5 flex-1 bg-slate-100" />
              </div>

              {topPlaces.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-6">No mentions this week yet. Check back soon!</p>
              ) : (
                <div className="space-y-4">
                  {topPlaces.map((place, i) => (
                    <div key={place.id} className="flex gap-4 items-start">
                      {/* Rank */}
                      <div className="shrink-0 w-8 h-8 rounded-full bg-[#ff6b35]/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-[#ff6b35]">{i + 1}</span>
                      </div>
                      {/* Photo */}
                      {place.photo_url && (
                        <img
                          src={place.photo_url}
                          alt={place.name}
                          className="w-16 h-16 object-cover rounded-xl shrink-0"
                        />
                      )}
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-base">{CATEGORY_EMOJI[place.category as PlaceCategory] || "📍"}</span>
                          <h3 className="font-bold text-slate-900 text-sm">{place.name}</h3>
                        </div>
                        {place.address && (
                          <p className="text-xs text-slate-400 mt-0.5 truncate">{place.address}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-xs font-semibold bg-[#ff6b35]/10 text-[#ff6b35] px-2 py-0.5 rounded-full">
                            {place.mention_count} mention{place.mention_count !== 1 ? "s" : ""}
                          </span>
                          {place.google_rating && (
                            <span className="text-xs text-slate-400">⭐ {place.google_rating.toFixed(1)}</span>
                          )}
                          <a
                            href={`https://buzzmaps.vercel.app/place/${encodeURIComponent(place.name)}`}
                            className="text-xs text-[#ff6b35] font-medium hover:underline"
                          >
                            View →
                          </a>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section: Newly added */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-0.5 flex-1 bg-slate-100" />
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap px-2">
                  ✨ Newly Added This Week
                </h2>
                <div className="h-0.5 flex-1 bg-slate-100" />
              </div>

              {newPlaces.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">No new places added this week.</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {newPlaces.map((place) => (
                    <a
                      key={place.id}
                      href={`https://buzzmaps.vercel.app/place/${encodeURIComponent(place.name)}`}
                      className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2.5 hover:bg-[#ff6b35]/5 transition-colors no-underline"
                    >
                      <span className="text-base shrink-0">{CATEGORY_EMOJI[place.category as PlaceCategory] || "📍"}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{place.name}</p>
                        <p className="text-[10px] text-slate-400">{place.mention_count} mention{place.mention_count !== 1 ? "s" : ""}</p>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Data sources note */}
            <div className="bg-slate-50 rounded-xl p-4 mb-8">
              <p className="text-xs text-slate-500 leading-relaxed">
                <span className="font-semibold text-slate-700">📡 About our data:</span>{" "}
                BuzzMaps tracks mentions of Toronto places across Reddit (r/toronto, r/askTO, and more),
                BlogTO, Narcity, Toronto Life, NOW Magazine, and Toronto Star. Places are ranked by how
                often they're mentioned — the more buzz, the higher they rank.
              </p>
            </div>

            {/* CTA button */}
            <div className="text-center mb-8">
              <a
                href="https://buzzmaps.vercel.app"
                className="inline-block px-6 py-3 rounded-xl font-bold text-sm text-white no-underline"
                style={{ background: "linear-gradient(135deg, #ff6b35 0%, #ea580c 100%)" }}
              >
                🗺️ Explore BuzzMaps
              </a>
            </div>

            {/* Divider */}
            <div className="h-px bg-slate-100 mb-6" />

            {/* Subscribe section */}
            <div className="text-center">
              <h3 className="font-bold text-slate-800 mb-1">📬 Get This Weekly</h3>
              <p className="text-xs text-slate-500 mb-4">
                Subscribe to get Toronto's top picks delivered to your inbox every Monday.
              </p>
              <div className="flex gap-2 max-w-sm mx-auto">
                <input
                  type="email"
                  placeholder="your@email.com"
                  disabled
                  className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-400 placeholder-slate-300 outline-none cursor-not-allowed"
                />
                <button
                  disabled
                  className="px-4 py-2 text-sm font-semibold text-white rounded-lg cursor-not-allowed opacity-60"
                  style={{ background: "linear-gradient(135deg, #ff6b35 0%, #ea580c 100%)" }}
                >
                  Subscribe
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-2">Coming soon — subscriptions not yet active</p>
            </div>
          </div>

          {/* Email footer */}
          <div className="px-8 py-5 bg-slate-50 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-400">
              © {now.getFullYear()} BuzzMaps · Toronto, Ontario ·{" "}
              <a href="https://buzzmaps.vercel.app" className="text-[#ff6b35] hover:underline">
                buzzmaps.vercel.app
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
