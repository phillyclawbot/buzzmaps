import { getDb } from "@/lib/db";
import Link from "next/link";
import TopBar from "@/components/ui/TopBar";

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

interface WeekBucket {
  week_start: string; // ISO date at start of week
  post_count: number;
  place_count: number;
}

interface TopMover {
  name: string;
  category: string;
  recent_count: number;
  prior_count: number;
  delta: number;
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

  // Week buckets for the last 12 weeks. Uses date_trunc on the post's
  // created_utc (epoch seconds) so the same query works against either
  // Reddit or publication posts.
  const twelveWeeksAgo = Math.floor(Date.now() / 1000) - 12 * 7 * 86400;
  const fourWeeksAgo = Math.floor(Date.now() / 1000) - 28 * 86400;
  const eightWeeksAgo = Math.floor(Date.now() / 1000) - 56 * 86400;

  const [
    [totalPlaces],
    [totalPosts],
    [redditPosts],
    [pubPosts],
    topPlaces,
    categoryBreakdown,
    recentPosts,
    weekly,
    movers,
  ] = await Promise.all([
    sql`SELECT COUNT(*)::int as count FROM restaurants`,
    sql`SELECT COUNT(*)::int as count FROM reddit_posts`,
    sql`SELECT COUNT(*)::int as count FROM reddit_posts WHERE subreddit ~ '^[a-zA-Z0-9_]+$'`,
    sql`SELECT COUNT(*)::int as count FROM reddit_posts WHERE (subreddit ILIKE '%BlogTO%' OR subreddit ILIKE '%Narcity%' OR subreddit ILIKE '%Toronto Life%' OR subreddit ILIKE '%NOW Magazine%' OR subreddit ILIKE '%Toronto Star%')`,
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
      ORDER BY scraped_at DESC
      LIMIT 10
    ` as unknown as Promise<RecentPost[]>,
    sql`
      SELECT
        date_trunc('week', to_timestamp(rp.created_utc))::date AS week_start,
        COUNT(DISTINCT rp.id)::int AS post_count,
        COUNT(DISTINCT pr.restaurant_id)::int AS place_count
      FROM reddit_posts rp
      LEFT JOIN post_restaurants pr ON pr.post_id = rp.id
      WHERE rp.created_utc >= ${twelveWeeksAgo}
      GROUP BY week_start
      ORDER BY week_start ASC
    ` as unknown as Promise<WeekBucket[]>,
    sql`
      SELECT r.name, r.category,
        COUNT(*) FILTER (WHERE rp.created_utc >= ${fourWeeksAgo})::int AS recent_count,
        COUNT(*) FILTER (WHERE rp.created_utc >= ${eightWeeksAgo} AND rp.created_utc < ${fourWeeksAgo})::int AS prior_count
      FROM restaurants r
      JOIN post_restaurants pr ON pr.restaurant_id = r.id
      JOIN reddit_posts rp ON rp.id = pr.post_id
      WHERE rp.created_utc >= ${eightWeeksAgo}
      GROUP BY r.id, r.name, r.category
      HAVING COUNT(*) FILTER (WHERE rp.created_utc >= ${fourWeeksAgo}) > 0
      ORDER BY (COUNT(*) FILTER (WHERE rp.created_utc >= ${fourWeeksAgo}) - COUNT(*) FILTER (WHERE rp.created_utc >= ${eightWeeksAgo} AND rp.created_utc < ${fourWeeksAgo})) DESC
      LIMIT 8
    ` as unknown as Promise<Omit<TopMover, "delta">[]>,
  ]);

  const maxCategoryCount = categoryBreakdown[0]?.count || 1;
  const weeklyChart = weekly as WeekBucket[];
  const maxWeekly = Math.max(1, ...weeklyChart.map((w) => w.post_count));
  const topMovers: TopMover[] = (movers as Omit<TopMover, "delta">[]).map(
    (m) => ({ ...m, delta: m.recent_count - m.prior_count })
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <TopBar title="Index" />

      <article className="pt-14 md:pt-16 pb-24 max-w-5xl mx-auto px-6 md:px-10 py-12 page-enter">
        <header
          className="text-center pt-8 pb-8 mb-12"
          style={{ borderBottom: "1px solid var(--fg)" }}
        >
          <p className="eyebrow mb-3" style={{ color: "var(--brand)" }}>
            By the Numbers
          </p>
          <h1
            className="font-display text-5xl md:text-6xl"
            style={{ color: "var(--fg)", fontWeight: 500, lineHeight: 1 }}
          >
            The Index.
          </h1>
          <p
            className="caption mt-4 max-w-md mx-auto"
            style={{ color: "var(--fg-muted)" }}
          >
            Everything we&apos;ve catalogued so far &mdash; updated as the
            scrapes come in.
          </p>
        </header>

        {/* Summary numbers */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-8 mb-16">
          {[
            { label: "Places", value: totalPlaces.count },
            { label: "Posts", value: totalPosts.count },
            { label: "From Reddit", value: redditPosts.count },
            { label: "From the press", value: pubPosts.count },
          ].map((s) => (
            <div key={s.label}>
              <p
                className="font-display tabular-nums leading-none"
                style={{
                  color: "var(--fg)",
                  fontSize: "clamp(2.5rem, 5vw, 4rem)",
                  fontWeight: 500,
                }}
              >
                {s.value.toLocaleString()}
              </p>
              <p className="dateline mt-2">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Weekly trend */}
        {weeklyChart.length > 0 && (
          <section className="mb-16">
            <div
              className="flex items-baseline justify-between pb-3 mb-6"
              style={{ borderBottom: "1px solid var(--fg)" }}
            >
              <h2
                className="font-display text-2xl md:text-3xl"
                style={{ color: "var(--fg)", fontWeight: 500 }}
              >
                Twelve weeks of buzz
              </h2>
              <p className="dateline">Posts per week</p>
            </div>
            <div className="flex items-end gap-2 h-40">
              {weeklyChart.map((w) => {
                const pct = Math.round((w.post_count / maxWeekly) * 100);
                const label = new Date(w.week_start).toLocaleDateString(
                  "en-CA",
                  { month: "short", day: "numeric" }
                );
                return (
                  <div
                    key={w.week_start}
                    className="flex-1 flex flex-col items-center gap-2 group"
                    title={`Week of ${label}: ${w.post_count} posts, ${w.place_count} places`}
                  >
                    <div
                      className="w-full transition-all"
                      style={{
                        height: `${Math.max(pct, 4)}%`,
                        background: "var(--fg)",
                      }}
                    />
                    <span className="dateline" style={{ fontSize: 10 }}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Top movers */}
        {topMovers.length > 0 && (
          <section className="mb-16">
            <div
              className="flex items-baseline justify-between pb-3 mb-2"
              style={{ borderBottom: "1px solid var(--fg)" }}
            >
              <h2
                className="font-display text-2xl md:text-3xl"
                style={{ color: "var(--fg)", fontWeight: 500 }}
              >
                Top movers
              </h2>
              <p className="dateline">Last 4 weeks vs. previous 4</p>
            </div>
            <ul>
              {topMovers.map((m) => {
                const positive = m.delta >= 0;
                return (
                  <li
                    key={m.name}
                    className="flex items-baseline gap-4 py-4"
                    style={{ borderBottom: "1px solid var(--border)" }}
                  >
                    <Link
                      href={`/place/${encodeURIComponent(m.name)}`}
                      className="flex-1 min-w-0 group"
                    >
                      <p
                        className="eyebrow"
                        style={{ color: "var(--brand)" }}
                      >
                        {m.category.toUpperCase()}
                      </p>
                      <p
                        className="font-display text-xl mt-1 group-hover:text-[color:var(--brand)] transition-colors"
                        style={{ color: "var(--fg)", fontWeight: 500 }}
                      >
                        {m.name}
                      </p>
                    </Link>
                    <span className="dateline shrink-0">
                      {m.prior_count} → {m.recent_count}
                    </span>
                    <span
                      className="font-display text-xl tabular-nums shrink-0 w-16 text-right"
                      style={{
                        color: positive ? "var(--sent-pos)" : "var(--sent-neg)",
                        fontWeight: 500,
                      }}
                    >
                      {positive ? "+" : ""}
                      {m.delta}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Top 10 Places */}
        <section className="mb-16">
          <div
            className="flex items-baseline justify-between pb-3 mb-6"
            style={{ borderBottom: "1px solid var(--fg)" }}
          >
            <h2
              className="font-display text-2xl md:text-3xl"
              style={{ color: "var(--fg)", fontWeight: 500 }}
            >
              The All-Time Top Ten
            </h2>
            <p className="dateline">By total mentions</p>
          </div>
          <ol>
            {topPlaces.map((place, i) => (
              <li
                key={place.name}
                className="flex items-baseline gap-5 py-4"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <span
                  className="font-display tabular-nums shrink-0"
                  style={{
                    color: "var(--fg-faint)",
                    fontSize: 28,
                    fontWeight: 400,
                    width: 48,
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <Link
                  href={`/place/${encodeURIComponent(place.name)}`}
                  className="flex-1 min-w-0 group"
                >
                  <p
                    className="eyebrow"
                    style={{ color: "var(--brand)" }}
                  >
                    {place.category.toUpperCase()}
                  </p>
                  <p
                    className="font-display text-xl mt-1 group-hover:text-[color:var(--brand)] transition-colors"
                    style={{ color: "var(--fg)", fontWeight: 500 }}
                  >
                    {place.name}
                  </p>
                </Link>
                <span
                  className="font-display text-2xl tabular-nums shrink-0"
                  style={{ color: "var(--fg)", fontWeight: 500 }}
                >
                  {place.mention_count}
                </span>
                <span className="dateline shrink-0 w-12 text-right">
                  {place.google_rating
                    ? `${place.google_rating.toFixed(1)}★`
                    : "—"}
                </span>
              </li>
            ))}
          </ol>
        </section>

        {/* Category breakdown */}
        <section className="mb-16">
          <div
            className="flex items-baseline justify-between pb-3 mb-6"
            style={{ borderBottom: "1px solid var(--fg)" }}
          >
            <h2
              className="font-display text-2xl md:text-3xl"
              style={{ color: "var(--fg)", fontWeight: 500 }}
            >
              By category
            </h2>
          </div>
          <ul className="space-y-3">
            {categoryBreakdown.map((cat) => (
              <li
                key={cat.category}
                className="flex items-baseline gap-4"
                style={{ borderBottom: "1px solid var(--border)", paddingBottom: 12 }}
              >
                <Link
                  href={`/category/${cat.category}`}
                  className="font-display text-lg capitalize w-28 shrink-0 hover:text-[color:var(--brand)] transition-colors"
                  style={{ color: "var(--fg)", fontWeight: 500 }}
                >
                  {cat.category}
                </Link>
                <div
                  className="flex-1 h-px"
                  style={{ background: "var(--border)" }}
                >
                  <div
                    className="h-1 -translate-y-0.5"
                    style={{
                      width: `${Math.round((cat.count / maxCategoryCount) * 100)}%`,
                      background: "var(--fg)",
                    }}
                  />
                </div>
                <span
                  className="font-display tabular-nums shrink-0"
                  style={{ color: "var(--fg)", fontWeight: 500, fontSize: 18 }}
                >
                  {cat.count}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Latest posts */}
        <section>
          <div
            className="flex items-baseline justify-between pb-3 mb-2"
            style={{ borderBottom: "1px solid var(--fg)" }}
          >
            <h2
              className="font-display text-2xl md:text-3xl"
              style={{ color: "var(--fg)", fontWeight: 500 }}
            >
              Just in
            </h2>
            <p className="dateline">Latest scraped posts</p>
          </div>
          <ul>
            {recentPosts.map((post) => (
              <li
                key={post.id}
                className="py-4"
                style={{ borderBottom: "1px solid var(--border)" }}
              >
                <p className="dateline mb-1">
                  {post.subreddit.match(/^[a-zA-Z0-9_]+$/)
                    ? `r/${post.subreddit}`
                    : post.subreddit}{" "}
                  · {formatDate(post.scraped_at)}
                </p>
                <p
                  className="font-serif text-lg leading-snug"
                  style={{ color: "var(--fg)" }}
                >
                  {post.title}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </article>
    </div>
  );
}
