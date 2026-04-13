import Link from "next/link";
import { Suspense } from "react";
import { getDb } from "@/lib/db";
import { COLLECTIONS } from "@/lib/collections";
import { CATEGORY_FILTERS } from "@/lib/constants";
import PlaceCard from "@/components/ui/PlaceCard";
import type { PlaceCategory } from "@/lib/types";

export const revalidate = 600; // 10 minutes

interface FeedRow {
  id: number;
  name: string;
  address: string | null;
  category: PlaceCategory;
  google_rating: number | null;
  photo_url: string | null;
  mention_count: number;
  latest_mention: number;
}

interface FeedPostRow {
  id: number;
  title: string;
  subreddit: string;
  permalink: string;
  sentiment: string;
  created_utc: number;
  place_name: string | null;
  place_category: PlaceCategory | null;
}

async function fetchFeedData() {
  let trending: FeedRow[] = [];
  let recentlyAdded: FeedRow[] = [];
  let posts: FeedPostRow[] = [];

  try {
    const sql = getDb();
    const sevenDays = Math.floor(Date.now() / 1000) - 7 * 86400;

    const [t, r, p] = await Promise.all([
      sql`
        SELECT r.id, r.name, r.address, r.category, r.google_rating, r.photo_url,
          COUNT(DISTINCT pr.post_id)::int as mention_count,
          MAX(rp.created_utc)::bigint as latest_mention
        FROM restaurants r
        JOIN post_restaurants pr ON pr.restaurant_id = r.id
        JOIN reddit_posts rp ON rp.id = pr.post_id
        WHERE rp.created_utc > ${sevenDays}
          AND r.photo_url IS NOT NULL
        GROUP BY r.id
        ORDER BY mention_count DESC, latest_mention DESC
        LIMIT 9
      `,
      sql`
        SELECT id, name, address, category, google_rating, photo_url,
          (SELECT COUNT(*)::int FROM post_restaurants WHERE restaurant_id = r.id) as mention_count,
          0 as latest_mention
        FROM restaurants r
        WHERE first_seen_at IS NOT NULL
        ORDER BY first_seen_at DESC
        LIMIT 6
      `,
      sql`
        SELECT rp.id, rp.title, rp.subreddit, rp.permalink, pr.sentiment,
          rp.created_utc, r.name as place_name, r.category as place_category
        FROM reddit_posts rp
        JOIN post_restaurants pr ON pr.post_id = rp.id
        JOIN restaurants r ON r.id = pr.restaurant_id
        WHERE rp.created_utc > ${sevenDays}
        ORDER BY rp.created_utc DESC
        LIMIT 8
      `,
    ]);

    trending = t as FeedRow[];
    recentlyAdded = r as FeedRow[];
    posts = p as FeedPostRow[];
  } catch (err) {
    console.error("[home] feed data fetch failed:", err);
  }

  return { trending, recentlyAdded, posts };
}

function timeAgo(utc: number): string {
  const s = Math.floor(Date.now() / 1000 - utc);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function todayString(): string {
  return new Date().toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function FeedHome() {
  return (
    <main
      className="min-h-screen pt-16 md:pt-20 pb-24 md:pb-12"
      style={{ background: "var(--bg)" }}
    >
      <Suspense fallback={<HomeSkeleton />}>
        <HomeContent />
      </Suspense>
    </main>
  );
}

async function HomeContent() {
  const { trending, recentlyAdded, posts } = await fetchFeedData();
  const hero = trending[0];
  const featured = trending.slice(1, 3);
  const moreTrending = trending.slice(3, 9);

  return (
    <>
      {/* MASTHEAD — like a newspaper banner */}
      <header className="max-w-[1400px] mx-auto px-6 md:px-12">
        <div
          className="flex items-baseline justify-between pb-3"
          style={{ borderBottom: "1px solid var(--fg)" }}
        >
          <p className="dateline">{todayString()}</p>
          <p className="dateline hidden sm:block">
            Vol. 1 · Toronto Edition
          </p>
        </div>

        <div className="py-6 md:py-10 text-center" style={{ borderBottom: "1px solid var(--fg)" }}>
          <p className="eyebrow mb-2" style={{ color: "var(--brand)" }}>
            What Toronto's talking about
          </p>
          <h1
            className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl"
            style={{ color: "var(--fg)", fontWeight: 500, lineHeight: 0.95 }}
          >
            BuzzMaps
          </h1>
          <p
            className="caption mt-4 max-w-xl mx-auto"
            style={{ color: "var(--fg-muted)" }}
          >
            A weekly read on the city's most-mentioned places, drawn from Reddit
            and the local press.
          </p>
        </div>
      </header>

      {/* HERO BAND — single biggest visual element */}
      {hero ? (
        <section className="max-w-[1400px] mx-auto px-6 md:px-12 pt-8 md:pt-12">
          <div className="flex items-baseline justify-between mb-5">
            <p className="eyebrow">No. 1 · The Cover</p>
            <Link
              href="/collections/buzzing"
              className="dateline hover:text-[color:var(--brand)] transition-colors"
            >
              See all trending →
            </Link>
          </div>
          <PlaceCard place={hero} variant="feature" />
        </section>
      ) : (
        <FallbackHero />
      )}

      {/* TWO-UP STORIES */}
      {featured.length > 0 && (
        <section className="max-w-[1400px] mx-auto px-6 md:px-12 pt-12 md:pt-16">
          <div className="flex items-baseline justify-between mb-5">
            <p className="eyebrow">Also of note</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            {featured.map((p, i) => (
              <PlaceCard key={p.id} place={p} variant="story" stagger={i} />
            ))}
          </div>
        </section>
      )}

      {/* COLLECTIONS STRIP */}
      <section className="max-w-[1400px] mx-auto px-6 md:px-12 pt-12 md:pt-16">
        <div
          className="flex items-baseline justify-between pb-3 mb-6"
          style={{ borderBottom: "1px solid var(--fg)" }}
        >
          <h2
            className="font-display text-2xl md:text-3xl"
            style={{ color: "var(--fg)", fontWeight: 500 }}
          >
            The Edit
          </h2>
          <Link
            href="/collections"
            className="dateline hover:text-[color:var(--brand)] transition-colors"
          >
            All collections →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-8">
          {COLLECTIONS.slice(0, 8).map((c, i) => (
            <Link
              key={c.id}
              href={`/collections/${c.id}`}
              className="group block animate-fade-in-up"
              style={{ ["--stagger" as string]: i } as React.CSSProperties}
            >
              <div
                className="text-4xl md:text-5xl mb-3"
                style={{ filter: "saturate(0.85)" }}
                aria-hidden="true"
              >
                {c.emoji}
              </div>
              <h3
                className="font-display text-lg md:text-xl leading-tight"
                style={{ color: "var(--fg)", fontWeight: 500 }}
              >
                {c.title}
              </h3>
              <p
                className="caption mt-1.5 line-clamp-2"
                style={{ color: "var(--fg-muted)" }}
              >
                {c.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* TRENDING RANKINGS */}
      {moreTrending.length > 0 && (
        <section className="max-w-[1400px] mx-auto px-6 md:px-12 pt-12 md:pt-16">
          <div
            className="flex items-baseline justify-between pb-3 mb-2"
            style={{ borderBottom: "1px solid var(--fg)" }}
          >
            <h2
              className="font-display text-2xl md:text-3xl"
              style={{ color: "var(--fg)", fontWeight: 500 }}
            >
              The Rankings
            </h2>
            <p className="dateline">By mentions, last seven days</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
            {moreTrending.map((p, i) => (
              <PlaceCard
                key={p.id}
                place={p}
                variant="rank"
                rank={i + 4}
                stagger={i}
              />
            ))}
          </div>
        </section>
      )}

      {/* RECENT MENTIONS RAIL */}
      {posts.length > 0 && (
        <section className="max-w-[1400px] mx-auto px-6 md:px-12 pt-12 md:pt-16">
          <div
            className="flex items-baseline justify-between pb-3 mb-6"
            style={{ borderBottom: "1px solid var(--fg)" }}
          >
            <h2
              className="font-display text-2xl md:text-3xl"
              style={{ color: "var(--fg)", fontWeight: 500 }}
            >
              From the Wires
            </h2>
            <p className="dateline">Latest mentions across r/toronto & friends</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2">
            {posts.map((post, i) => (
              <div
                key={post.id}
                className="group flex items-baseline gap-4 py-3 animate-fade-in-up"
                style={
                  {
                    ["--stagger" as string]: i,
                    borderTop: "1px solid var(--border)",
                  } as React.CSSProperties
                }
              >
                <span
                  className="dateline shrink-0 w-16"
                  style={{ color: "var(--fg-subtle)" }}
                >
                  {timeAgo(post.created_utc)}
                </span>
                <div className="flex-1 min-w-0">
                  <a
                    href={`https://reddit.com${post.permalink}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-serif text-base leading-snug hover:text-[color:var(--brand)] transition-colors block"
                    style={{ color: "var(--fg)" }}
                  >
                    {post.title}
                  </a>
                  <p className="dateline mt-1">
                    r/{post.subreddit}
                    {post.place_name && (
                      <>
                        {" "}·{" "}
                        <Link
                          href={`/place/${encodeURIComponent(post.place_name)}`}
                          className="hover:underline"
                          style={{ color: "var(--brand)" }}
                        >
                          {post.place_name}
                        </Link>
                      </>
                    )}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* RECENTLY ADDED ROW */}
      {recentlyAdded.length > 0 && (
        <section className="max-w-[1400px] mx-auto px-6 md:px-12 pt-12 md:pt-16">
          <div
            className="flex items-baseline justify-between pb-3 mb-6"
            style={{ borderBottom: "1px solid var(--fg)" }}
          >
            <h2
              className="font-display text-2xl md:text-3xl"
              style={{ color: "var(--fg)", fontWeight: 500 }}
            >
              New This Week
            </h2>
            <Link
              href="/map"
              className="dateline hover:text-[color:var(--brand)] transition-colors"
            >
              Open the map →
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
            {recentlyAdded.slice(0, 6).map((p, i) => (
              <PlaceCard key={p.id} place={p} variant="story" stagger={i} />
            ))}
          </div>
        </section>
      )}

      {/* CATEGORY DIRECTORY */}
      <section className="max-w-[1400px] mx-auto px-6 md:px-12 pt-12 md:pt-16">
        <div
          className="flex items-baseline justify-between pb-3 mb-6"
          style={{ borderBottom: "1px solid var(--fg)" }}
        >
          <h2
            className="font-display text-2xl md:text-3xl"
            style={{ color: "var(--fg)", fontWeight: 500 }}
          >
            By Category
          </h2>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {CATEGORY_FILTERS.filter((c) => c.value !== "all").map((c) => (
            <Link
              key={c.value}
              href={`/category/${c.value}`}
              className="font-display text-xl md:text-2xl ink-underline"
              style={{ color: "var(--fg)", fontWeight: 500 }}
            >
              {c.label.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "").trim()}
            </Link>
          ))}
        </div>
      </section>

      {/* MAP CTA */}
      <section className="max-w-[1400px] mx-auto px-6 md:px-12 pt-16 md:pt-24">
        <div
          className="text-center py-12 md:py-16"
          style={{
            borderTop: "1px solid var(--fg)",
            borderBottom: "1px solid var(--fg)",
          }}
        >
          <p className="eyebrow mb-3">For the explorers</p>
          <h2
            className="font-display text-4xl sm:text-5xl md:text-6xl"
            style={{ color: "var(--fg)", fontWeight: 500, lineHeight: 1.05 }}
          >
            Open the&nbsp;
            <Link
              href="/map"
              className="ink-underline"
              style={{ color: "var(--brand)" }}
            >
              full map
            </Link>
            .
          </h2>
          <p
            className="caption mt-4 max-w-md mx-auto"
            style={{ color: "var(--fg-muted)" }}
          >
            Every place we've found, plotted across the city. Filter, search,
            cluster — and find the closest spot to you.
          </p>
        </div>
      </section>

      {/* COLOPHON */}
      <footer className="max-w-[1400px] mx-auto px-6 md:px-12 pt-10 pb-4">
        <div
          className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 pt-6"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <p className="dateline">
            BuzzMaps · Toronto · A read-only love letter to the city
          </p>
          <p className="dateline">
            Sourced from Reddit, BlogTO, Toronto Life, NOW, Eater & friends.
          </p>
        </div>
      </footer>
    </>
  );
}

function HomeSkeleton() {
  return (
    <div className="max-w-[1400px] mx-auto px-6 md:px-12 py-12 animate-pulse">
      <div className="h-12 w-64 mx-auto mb-12 rounded" style={{ background: "var(--bg-sunken)" }} />
      <div className="aspect-[16/11] rounded mb-12" style={{ background: "var(--bg-sunken)" }} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="aspect-[4/3] rounded" style={{ background: "var(--bg-sunken)" }} />
        <div className="aspect-[4/3] rounded" style={{ background: "var(--bg-sunken)" }} />
      </div>
    </div>
  );
}

function FallbackHero() {
  return (
    <section className="max-w-[1400px] mx-auto px-6 md:px-12 pt-8 md:pt-12">
      <div
        className="text-center py-16 px-6"
        style={{
          background: "var(--bg-sunken)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
        }}
      >
        <p className="eyebrow mb-3">A quiet week so far</p>
        <h2
          className="font-display text-3xl md:text-4xl mb-3"
          style={{ color: "var(--fg)", fontWeight: 500 }}
        >
          No mentions yet today.
        </h2>
        <p className="caption mb-6" style={{ color: "var(--fg-muted)" }}>
          Either the wires are quiet or we're between scrapes. The map still
          has every place we've ever found.
        </p>
        <Link
          href="/map"
          className="font-display text-xl ink-underline"
          style={{ color: "var(--brand)", fontWeight: 500 }}
        >
          Open the map →
        </Link>
      </div>
    </section>
  );
}
