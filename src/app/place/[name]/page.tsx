import { getDb } from "@/lib/db";
import { CATEGORY_EMOJI } from "@/lib/types";
import type { PlaceCategory } from "@/lib/types";
import Link from "next/link";
import { notFound } from "next/navigation";
import PlaceMapWrapper from "@/components/PlaceMapWrapper";
import ShareButton from "@/app/place/ShareButton";
import CheckinButton from "@/components/CheckinButton";

function formatDate(utc: number): string {
  return new Date(utc * 1000).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  const config: Record<string, { label: string; bg: string; text: string }> = {
    positive: { label: "Positive", bg: "#dcfce7", text: "#16a34a" },
    negative: { label: "Negative", bg: "#fee2e2", text: "#dc2626" },
    neutral: { label: "Neutral", bg: "#fef9c3", text: "#ca8a04" },
  };
  const c = config[sentiment] || config.neutral;
  return (
    <span
      className="text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ background: c.bg, color: c.text }}
    >
      {c.label}
    </span>
  );
}

const CATEGORY_GRADIENT: Record<string, string> = {
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
  other: "from-slate-500 to-slate-400",
};

export default async function PlacePage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const decodedName = decodeURIComponent(name);
  const sql = getDb();

  const rows = await sql`
    SELECT
      r.id, r.name, r.place_id, r.address, r.lat, r.lng,
      r.google_rating, r.google_reviews_count, r.cuisine_type, r.price_level,
      r.category,
      COUNT(DISTINCT pr.post_id) as mention_count,
      json_agg(json_build_object(
        'id', rp.id,
        'title', rp.title,
        'subreddit', rp.subreddit,
        'score', rp.score,
        'num_comments', rp.num_comments,
        'permalink', rp.permalink,
        'sentiment', pr.sentiment,
        'created_utc', rp.created_utc
      ) ORDER BY rp.created_utc DESC) as posts
    FROM restaurants r
    JOIN post_restaurants pr ON pr.restaurant_id = r.id
    JOIN reddit_posts rp ON rp.id = pr.post_id
    WHERE r.name ILIKE ${decodedName}
    GROUP BY r.id
    LIMIT 1
  `;

  if (!rows.length) notFound();

  const place = rows[0] as {
    id: number;
    name: string;
    address: string;
    lat: number;
    lng: number;
    google_rating: number | null;
    google_reviews_count: number | null;
    cuisine_type: string | null;
    category: PlaceCategory;
    mention_count: number;
    posts: {
      id: number;
      title: string;
      subreddit: string;
      score: number;
      num_comments: number;
      permalink: string;
      sentiment: string;
      created_utc: number;
    }[];
  };

  // Related places nearby
  const nearby = await sql`
    SELECT r.name, r.category, r.mention_count
    FROM restaurants r
    WHERE ABS(r.lat - ${place.lat}) < 0.01
      AND ABS(r.lng - ${place.lng}) < 0.01
      AND r.name != ${place.name}
    ORDER BY r.mention_count DESC
    LIMIT 5
  `;

  const emoji = CATEGORY_EMOJI[place.category] || "📍";
  const posts = place.posts ?? [];
  const gradient = CATEGORY_GRADIENT[place.category] || CATEGORY_GRADIENT.other;

  // Group posts by month for timeline
  const monthGroups = posts.reduce((acc, post) => {
    const d = new Date(post.created_utc * 1000);
    const key = d.toLocaleDateString("en-CA", { year: "numeric", month: "long" });
    if (!acc[key]) acc[key] = [];
    acc[key].push(post);
    return acc;
  }, {} as Record<string, typeof posts>);
  const sortedMonths = Object.entries(monthGroups).sort(([a], [b]) => {
    return new Date(a).getTime() - new Date(b).getTime();
  });
  const maxMonthCount = Math.max(...sortedMonths.map(([, ps]) => ps.length), 1);

  const sentimentCounts = posts.reduce(
    (acc, p) => {
      const s = p.sentiment in acc ? p.sentiment : "neutral";
      acc[s as keyof typeof acc]++;
      return acc;
    },
    { positive: 0, neutral: 0, negative: 0 }
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
          <ShareButton name={place.name} />
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff6b35]" />
          <span className="font-semibold text-sm tracking-tight bg-gradient-to-r from-[#ff6b35] to-[#f59e0b] bg-clip-text text-transparent">
            BuzzMaps
          </span>
        </div>
      </div>

      {/* Gradient header strip */}
      <div className={`bg-gradient-to-r ${gradient} px-6 py-5`}>
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <span className="text-5xl leading-none drop-shadow-sm">{emoji}</span>
          <div>
            <h1 className="text-2xl font-bold text-white leading-tight drop-shadow-sm">{place.name}</h1>
            {place.cuisine_type && (
              <p className="text-sm text-white/80 font-medium mt-0.5">{place.cuisine_type}</p>
            )}
            {place.address && (
              <p className="text-sm text-white/70 mt-0.5">{place.address}</p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 pb-16 page-enter">
        {/* Check-in button */}
        <div className="mb-4">
          <CheckinButton placeId={place.id} />
        </div>

        {/* Stats card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-4">
          <div className="flex flex-wrap gap-4">
            {place.google_rating !== null && (
              <div className="flex items-center gap-1.5">
                <span className="text-lg">⭐</span>
                <div>
                  <div className="text-base font-bold text-slate-900">{place.google_rating.toFixed(1)}</div>
                  {place.google_reviews_count && (
                    <div className="text-xs text-slate-400">{place.google_reviews_count.toLocaleString()} reviews</div>
                  )}
                </div>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="text-lg">💬</span>
              <div>
                <div className="text-base font-bold text-slate-900">{place.mention_count}</div>
                <div className="text-xs text-slate-400">Reddit mentions</div>
              </div>
            </div>
            {posts.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-lg">📊</span>
                <div>
                  <div className="text-base font-bold text-slate-900 flex gap-2">
                    <span className="text-green-600">{sentimentCounts.positive}</span>
                    <span className="text-slate-300">/</span>
                    <span className="text-yellow-500">{sentimentCounts.neutral}</span>
                    <span className="text-slate-300">/</span>
                    <span className="text-red-500">{sentimentCounts.negative}</span>
                  </div>
                  <div className="text-xs text-slate-400">pos / neu / neg</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Map embed */}
        <div className="mb-4">
          <PlaceMapWrapper lat={place.lat} lng={place.lng} name={place.name} category={place.category} />
        </div>

        {/* Buzz over time timeline */}
        {sortedMonths.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider px-1 mb-3">
              📈 Buzz over time
            </h2>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-4">
              {sortedMonths.map(([month, monthPosts]) => {
                const barWidth = Math.round((monthPosts.length / maxMonthCount) * 100);
                return (
                  <div key={month}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-slate-600 w-28 shrink-0">{month}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-[#ff6b35] to-[#f59e0b]"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400 w-6 text-right shrink-0">{monthPosts.length}</span>
                    </div>
                    <div className="pl-0 space-y-0.5">
                      {monthPosts.map((p) => (
                        <a
                          key={p.id}
                          href={`https://reddit.com${p.permalink}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-xs text-slate-500 hover:text-[#ff6b35] transition-colors truncate pl-[7.5rem]"
                        >
                          {p.title.length > 72 ? p.title.slice(0, 72) + "…" : p.title}
                        </a>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Reddit posts */}
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider px-1 mb-3">
          Reddit Posts ({posts.length})
        </h2>

        {posts.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">No posts yet</div>
        ) : (
          <div className="space-y-3 mb-6">
            {posts.map((post) => (
              <a
                key={post.id}
                href={`https://reddit.com${post.permalink}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:border-[#ff6b35]/60 hover:shadow-md transition-all group"
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-1 self-stretch rounded-full shrink-0"
                    style={{
                      background:
                        post.sentiment === "positive"
                          ? "#22c55e"
                          : post.sentiment === "negative"
                          ? "#ef4444"
                          : "#f59e0b",
                    }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 group-hover:text-[#ff6b35] transition-colors line-clamp-2">
                      {post.title}
                    </p>
                    <div className="flex items-center flex-wrap gap-2 mt-2">
                      <span className="text-xs bg-[#ff6b35]/10 text-[#ff6b35] px-2 py-0.5 rounded-full font-medium">
                        r/{post.subreddit}
                      </span>
                      <SentimentBadge sentiment={post.sentiment} />
                      <span className="text-xs text-slate-400">
                        ↑ {post.score} pts
                      </span>
                      <span className="text-xs text-slate-400">
                        {post.num_comments} comments
                      </span>
                      <span className="text-xs text-slate-400 ml-auto">
                        {formatDate(post.created_utc)}
                      </span>
                    </div>
                  </div>
                  <svg
                    className="text-slate-300 group-hover:text-[#ff6b35] transition-colors shrink-0 mt-0.5"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                  </svg>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* Related places nearby */}
        {nearby.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider px-1 mb-3">
              📍 Nearby Places
            </h2>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
              {(nearby as { name: string; category: PlaceCategory; mention_count: number }[]).map((r) => (
                <Link
                  key={r.name}
                  href={`/place/${encodeURIComponent(r.name)}`}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors group"
                >
                  <span className="text-xl leading-none">{CATEGORY_EMOJI[r.category] || "📍"}</span>
                  <span className="flex-1 text-sm font-medium text-slate-800 group-hover:text-[#ff6b35] transition-colors">{r.name}</span>
                  <span className="text-xs text-[#ff6b35] font-semibold bg-[#ff6b35]/10 px-2 py-0.5 rounded-full">
                    {r.mention_count} 💬
                  </span>
                  <svg className="text-slate-300 group-hover:text-[#ff6b35] transition-colors" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
