import { getDb } from "@/lib/db";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface TopPlace {
  name: string;
  category: string;
  mention_count: number;
  google_rating: number | null;
}

interface CategoryStat {
  category: string;
  count: number;
}

interface RecentPost {
  id: number;
  title: string;
  subreddit: string;
  created_utc: number;
  scraped_at: string;
}

const CATEGORY_EMOJI: Record<string, string> = {
  restaurant: "🍽️",
  bar: "🍺",
  cafe: "☕",
  club: "🎵",
  shop: "🛍️",
  park: "🌳",
  gym: "🏋️",
  venue: "⭐",
  market: "🏪",
  museum: "🏛️",
  other: "📍",
};

function formatDate(utc: number | string): string {
  const d = typeof utc === "number" ? new Date(utc * 1000) : new Date(utc);
  return d.toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
}

export default async function StatsPage() {
  const sql = getDb();

  const [
    [totalPlaces],
    [totalPosts],
    [redditPosts],
    [pubPosts],
    topPlaces,
    categoryBreakdown,
    recentPosts,
  ] = await Promise.all([
    sql`SELECT COUNT(*)::int as count FROM restaurants`,
    sql`SELECT COUNT(*)::int as count FROM reddit_posts WHERE is_food_related = true`,
    sql`SELECT COUNT(*)::int as count FROM reddit_posts WHERE is_food_related = true AND subreddit ~ '^[a-zA-Z0-9_]+$'`,
    sql`SELECT COUNT(*)::int as count FROM reddit_posts WHERE is_food_related = true AND (subreddit ILIKE '%BlogTO%' OR subreddit ILIKE '%Narcity%' OR subreddit ILIKE '%Toronto Life%' OR subreddit ILIKE '%NOW Magazine%' OR subreddit ILIKE '%Toronto Star%')`,
    sql`
      SELECT r.name, r.category, COUNT(pr.id)::int as mention_count, r.google_rating
      FROM restaurants r
      LEFT JOIN post_restaurants pr ON pr.restaurant_id = r.id
      GROUP BY r.id, r.name, r.category, r.google_rating
      ORDER BY mention_count DESC
      LIMIT 10
    ` as unknown as Promise<TopPlace[]>,
    sql`
      SELECT r.category, COUNT(*)::int as count
      FROM restaurants r
      GROUP BY r.category
      ORDER BY count DESC
    ` as unknown as Promise<CategoryStat[]>,
    sql`
      SELECT id, title, subreddit, created_utc, scraped_at
      FROM reddit_posts
      WHERE is_food_related = true
      ORDER BY scraped_at DESC
      LIMIT 10
    ` as unknown as Promise<RecentPost[]>,
  ]);

  const maxMentions = topPlaces[0]?.mention_count || 1;
  const maxCategoryCount = categoryBreakdown[0]?.count || 1;

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
        <span className="text-sm font-semibold text-slate-700">📊 Stats</span>
      </div>

      <div className="pt-16 pb-12 max-w-4xl mx-auto px-4 page-enter">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">📊 BuzzMaps Stats</h1>
        <p className="text-sm text-slate-500 mb-6">Toronto places as tracked by BuzzMaps</p>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Total Places", value: totalPlaces.count, emoji: "📍" },
            { label: "Total Posts", value: totalPosts.count, emoji: "💬" },
            { label: "Reddit Posts", value: redditPosts.count, emoji: "🤖" },
            { label: "Publication Posts", value: pubPosts.count, emoji: "📰" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col gap-1">
              <span className="text-2xl">{s.emoji}</span>
              <span className="text-2xl font-bold text-slate-900">{s.value.toLocaleString()}</span>
              <span className="text-xs text-slate-500">{s.label}</span>
            </div>
          ))}
        </div>

        {/* Top 10 Places */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-6">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-800">🏆 Top 10 Places by Mentions</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-slate-100">
                  <th className="text-left px-5 py-3 font-semibold">#</th>
                  <th className="text-left px-3 py-3 font-semibold">Place</th>
                  <th className="text-left px-3 py-3 font-semibold">Category</th>
                  <th className="text-right px-3 py-3 font-semibold">Mentions</th>
                  <th className="text-right px-5 py-3 font-semibold">Rating</th>
                </tr>
              </thead>
              <tbody>
                {topPlaces.map((place, i) => (
                  <tr key={place.name} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3 text-slate-400 font-medium text-xs">{i + 1}</td>
                    <td className="px-3 py-3">
                      <Link
                        href={`/place/${encodeURIComponent(place.name)}`}
                        className="font-semibold text-slate-800 hover:text-[#ff6b35] transition-colors"
                      >
                        {place.name}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-slate-500 text-xs">
                      {CATEGORY_EMOJI[place.category] || "📍"} {place.category}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span className="text-xs font-bold text-[#ff6b35] bg-[#ff6b35]/10 px-2 py-0.5 rounded-full">
                        {place.mention_count}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right text-xs text-slate-500">
                      {place.google_rating ? `⭐ ${place.google_rating.toFixed(1)}` : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Category breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-6 p-5">
          <h2 className="font-bold text-slate-800 mb-4">🗂️ Breakdown by Category</h2>
          <div className="space-y-3">
            {categoryBreakdown.map((cat) => (
              <Link key={cat.category} href={`/category/${cat.category}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity group">
                <span className="text-lg w-6 shrink-0">{CATEGORY_EMOJI[cat.category] || "📍"}</span>
                <span className="text-sm text-slate-600 w-20 shrink-0 capitalize group-hover:text-[#ff6b35] transition-colors">{cat.category}</span>
                <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#ff6b35] to-[#ea580c] rounded-full transition-all"
                    style={{ width: `${Math.round((cat.count / maxCategoryCount) * 100)}%` }}
                  />
                </div>
                <span className="text-xs font-bold text-slate-500 w-8 text-right shrink-0">{cat.count}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Latest 10 posts */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-800">🆕 Latest Posts Added</h2>
          </div>
          <div className="divide-y divide-slate-50">
            {recentPosts.map((post) => (
              <div key={post.id} className="px-5 py-3 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-slate-700 font-medium line-clamp-2 flex-1">{post.title}</p>
                  <span className="text-[10px] text-slate-400 shrink-0 pt-0.5">{formatDate(post.scraped_at)}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {post.subreddit.match(/^[a-zA-Z0-9_]+$/) ? `r/${post.subreddit}` : post.subreddit}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
