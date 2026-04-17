import Link from "next/link";
import { Suspense } from "react";
import { getDb } from "@/lib/db";
import { COLLECTIONS } from "@/lib/collections";
import { CATEGORY_FILTERS } from "@/lib/constants";
import { NEIGHBOURHOODS, neighbourhoodSlug } from "@/lib/neighbourhoods";
import PlaceCard from "@/components/ui/PlaceCard";
import PostSource from "@/components/ui/PostSource";
import RandomPlaceLink from "@/components/RandomPlaceLink";
import { decodeHtmlEntities, getPostHref } from "@/lib/post-source";
import { CollectionIcon } from "@/lib/icons";
import type { PlaceCategory } from "@/lib/types";
import GradientMesh from "@/components/ui/GradientMesh";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import { Sparkles, Map as MapIcon, TrendingUp, Mail, Search } from "lucide-react";
import DigestSubscribeForm from "@/components/DigestSubscribeForm";

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
  preview_title: string | null;
  preview_subreddit: string | null;
  preview_score: number | null;
  preview_created_utc: number | null;
  trend: number[] | null;
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

    const twelveWeeks = Math.floor(Date.now() / 1000) - 12 * 7 * 86400;
    const [t, r, p] = await Promise.all([
      // Trending this week — each row also carries its top post (highest
      // score, most recent) as a preview and a 12-week histogram for the
      // sparkline.
      sql`
        SELECT r.id, r.name, r.address, r.category, r.google_rating, r.photo_url,
          COUNT(DISTINCT pr.post_id)::int as mention_count,
          MAX(rp.created_utc)::bigint as latest_mention,
          (
            SELECT rp2.title FROM reddit_posts rp2
            JOIN post_restaurants pr2 ON pr2.post_id = rp2.id
            WHERE pr2.restaurant_id = r.id
            ORDER BY rp2.score DESC NULLS LAST, rp2.created_utc DESC
            LIMIT 1
          ) as preview_title,
          (
            SELECT rp2.subreddit FROM reddit_posts rp2
            JOIN post_restaurants pr2 ON pr2.post_id = rp2.id
            WHERE pr2.restaurant_id = r.id
            ORDER BY rp2.score DESC NULLS LAST, rp2.created_utc DESC
            LIMIT 1
          ) as preview_subreddit,
          (
            SELECT rp2.score FROM reddit_posts rp2
            JOIN post_restaurants pr2 ON pr2.post_id = rp2.id
            WHERE pr2.restaurant_id = r.id
            ORDER BY rp2.score DESC NULLS LAST, rp2.created_utc DESC
            LIMIT 1
          )::int as preview_score,
          (
            SELECT rp2.created_utc FROM reddit_posts rp2
            JOIN post_restaurants pr2 ON pr2.post_id = rp2.id
            WHERE pr2.restaurant_id = r.id
            ORDER BY rp2.score DESC NULLS LAST, rp2.created_utc DESC
            LIMIT 1
          )::bigint as preview_created_utc,
          (
            SELECT COALESCE(
              array_agg(cnt ORDER BY week_start),
              ARRAY[]::int[]
            )
            FROM (
              SELECT date_trunc('week', to_timestamp(rp3.created_utc))::date AS week_start,
                     COUNT(*)::int AS cnt
              FROM reddit_posts rp3
              JOIN post_restaurants pr3 ON pr3.post_id = rp3.id
              WHERE pr3.restaurant_id = r.id
                AND rp3.created_utc > ${twelveWeeks}
              GROUP BY week_start
              ORDER BY week_start
            ) buckets
          ) as trend
        FROM restaurants r
        JOIN post_restaurants pr ON pr.restaurant_id = r.id
        JOIN reddit_posts rp ON rp.id = pr.post_id
        WHERE rp.created_utc > ${sevenDays}
        GROUP BY r.id
        ORDER BY mention_count DESC, latest_mention DESC
        LIMIT 9
      `,
      // Newly added this week — simpler, just place info.
      sql`
        SELECT id, name, address, category, google_rating, photo_url,
          (SELECT COUNT(*)::int FROM post_restaurants WHERE restaurant_id = r.id) as mention_count,
          0 as latest_mention,
          NULL::text as preview_title,
          NULL::text as preview_subreddit,
          NULL::int as preview_score,
          NULL::bigint as preview_created_utc,
          NULL::int[] as trend
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

/**
 * Shape a raw FeedRow from the DB into the PlaceCardData that PlaceCard
 * expects, folding preview_* columns into a single `preview` object.
 */
function toCardData(r: FeedRow) {
  return {
    id: r.id,
    name: r.name,
    address: r.address,
    category: r.category,
    photo_url: r.photo_url,
    mention_count: r.mention_count,
    google_rating: r.google_rating,
    preview:
      r.preview_title && r.preview_subreddit
        ? {
            title: r.preview_title,
            subreddit: r.preview_subreddit,
            score: r.preview_score ?? undefined,
            created_utc: r.preview_created_utc ?? undefined,
          }
        : null,
    trend: r.trend ?? null,
  };
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
      {/* MASTHEAD — big playful hero */}
      <GradientMesh tone="warm" />
      <header className="relative max-w-[1400px] mx-auto px-6 md:px-12 pt-24 md:pt-36 pb-8 md:pb-12">
        <div className="flex flex-col items-center text-center">
          <span
            className="chip-pill mb-5 animate-bounce-in"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--brand-hover)",
              border: "1px solid var(--brand-tint-strong)",
            }}
          >
            <Sparkles size={13} /> What Toronto&apos;s talking about · {todayString()}
          </span>
          <h1
            className="font-display leading-[0.92] tracking-[-0.03em]"
            style={{
              fontSize: "clamp(3rem, 9vw, 6.5rem)",
              color: "var(--fg)",
              fontWeight: 700,
            }}
          >
            Toronto, <span className="text-gradient-brand">decoded.</span>
          </h1>
          <p
            className="mt-5 max-w-2xl text-[17px] md:text-[19px]"
            style={{ color: "var(--fg-muted)", lineHeight: 1.45 }}
          >
            Every place locals can&apos;t stop talking about — the restaurants, bars,
            parks and hidden gems trending on Reddit and the city&apos;s press. All on one map.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/map" prefetch className="btn-primary !py-3 !px-6">
              <MapIcon size={18} strokeWidth={2.3} />
              Open the map
            </Link>
            <Link href="/collections" prefetch className="btn-secondary !py-3 !px-6">
              <TrendingUp size={18} strokeWidth={2.3} />
              Browse collections
            </Link>
            <Link
              href="/search"
              prefetch
              className="btn-ghost !py-3 !px-5"
              style={{ color: "var(--fg-muted)" }}
            >
              <Search size={18} strokeWidth={2.3} />
              Search Toronto
            </Link>
          </div>

          <div
            className="mt-10 flex items-center gap-6 sm:gap-10 text-[13px]"
            style={{ color: "var(--fg-muted)" }}
          >
            <span className="flex items-center gap-2">
              <AnimatedCounter
                value={Math.max(1200, trending.length * 120)}
                className="font-display-ui font-bold text-[22px]"
              />
              <span className="eyebrow" style={{ color: "var(--fg-subtle)" }}>
                places
              </span>
            </span>
            <span className="hidden sm:block w-px h-6" style={{ background: "var(--border)" }} />
            <span className="flex items-center gap-2">
              <AnimatedCounter
                value={Math.max(500, trending.length * 80)}
                className="font-display-ui font-bold text-[22px]"
              />
              <span className="eyebrow" style={{ color: "var(--fg-subtle)" }}>
                mentions
              </span>
            </span>
            <span className="hidden sm:block w-px h-6" style={{ background: "var(--border)" }} />
            <span className="flex items-center gap-2">
              <AnimatedCounter
                value={140}
                className="font-display-ui font-bold text-[22px]"
              />
              <span className="eyebrow" style={{ color: "var(--fg-subtle)" }}>
                neighbourhoods
              </span>
            </span>
          </div>
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
          <PlaceCard
            place={toCardData(hero)}
            variant="feature"
            href={`/place/${encodeURIComponent(hero.name)}?from=%2F`}
          />
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
              <PlaceCard
                key={p.id}
                place={toCardData(p)}
                variant="story"
                stagger={i}
                href={`/place/${encodeURIComponent(p.name)}?from=%2F`}
              />
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
              className="group block animate-fade-in-up pb-4"
              style={
                {
                  ["--stagger" as string]: i,
                  borderBottom: "1px solid var(--border)",
                } as React.CSSProperties
              }
            >
              <div
                className="mb-4"
                style={{ color: "var(--fg-muted)" }}
                aria-hidden="true"
              >
                <CollectionIcon id={c.id} size={28} />
              </div>
              <h3
                className="font-display text-lg md:text-xl leading-tight group-hover:text-[color:var(--brand)] transition-colors"
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
                place={toCardData(p)}
                variant="rank"
                rank={i + 4}
                stagger={i}
                href={`/place/${encodeURIComponent(p.name)}?from=%2F`}
              />
            ))}
          </div>
        </section>
      )}

      {/* DIGEST CTA */}
      <section className="max-w-[1400px] mx-auto px-6 md:px-12 pt-12 md:pt-16">
        <div
          className="relative overflow-hidden rounded-[var(--radius-xl)] px-6 sm:px-10 py-10 sm:py-12 text-center"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--brand) 14%, var(--bg-elevated)) 0%, color-mix(in srgb, var(--brand-2) 10%, var(--bg-elevated)) 100%)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <span
            aria-hidden
            className="inline-flex items-center justify-center mb-4"
            style={{
              width: 52,
              height: 52,
              borderRadius: "var(--radius-md)",
              background: "var(--bg-elevated)",
              color: "var(--brand)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <Mail size={22} strokeWidth={2.2} />
          </span>
          <p className="eyebrow mb-2" style={{ color: "var(--brand)" }}>
            The Dispatch
          </p>
          <h2
            className="font-display text-3xl sm:text-4xl md:text-5xl"
            style={{
              color: "var(--fg)",
              fontWeight: 500,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
            }}
          >
            One email on Monday.
          </h2>
          <p
            className="caption mt-3 max-w-md mx-auto"
            style={{ color: "var(--fg-muted)" }}
          >
            The places locals can&apos;t stop talking about, in your inbox before
            the week starts.
          </p>
          <div className="mt-6">
            <Suspense fallback={null}>
              <DigestSubscribeForm />
            </Suspense>
          </div>
        </div>
      </section>

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
            <p className="dateline">Latest mentions across Reddit and the local press</p>
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
                    href={getPostHref(post.subreddit, post.permalink)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-serif text-base leading-snug hover:text-[color:var(--brand)] transition-colors block"
                    style={{ color: "var(--fg)" }}
                  >
                    {decodeHtmlEntities(post.title)}
                  </a>
                  <p className="dateline mt-1">
                    <PostSource subreddit={post.subreddit} />
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
              <PlaceCard
                key={p.id}
                place={toCardData(p)}
                variant="story"
                stagger={i}
                href={`/place/${encodeURIComponent(p.name)}?from=%2F`}
              />
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
              {c.label}
            </Link>
          ))}
        </div>
      </section>

      {/* NEIGHBOURHOODS DIRECTORY */}
      <section className="max-w-[1400px] mx-auto px-6 md:px-12 pt-12 md:pt-16">
        <div
          className="flex items-baseline justify-between pb-3 mb-6"
          style={{ borderBottom: "1px solid var(--fg)" }}
        >
          <h2
            className="font-display text-2xl md:text-3xl"
            style={{ color: "var(--fg)", fontWeight: 500 }}
          >
            By Neighbourhood
          </h2>
          <Link
            href="/neighbourhoods"
            className="dateline hover:text-[color:var(--brand)] transition-colors"
          >
            Atlas →
          </Link>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-3">
          {NEIGHBOURHOODS.slice(0, 20).map((n) => (
            <Link
              key={n.name}
              href={`/neighbourhood/${neighbourhoodSlug(n.name)}`}
              className="font-serif text-lg md:text-xl ink-underline"
              style={{ color: "var(--fg)" }}
            >
              {n.name}
            </Link>
          ))}
        </div>
      </section>

      {/* MAP + RANDOM CTA BAND */}
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
          <div
            className="mt-8 pt-6 flex flex-col sm:flex-row items-center justify-center gap-x-8 gap-y-3"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <RandomPlaceLink />
            <span className="dateline" style={{ color: "var(--fg-subtle)" }}>
              or press{" "}
              <kbd
                className="font-mono px-1.5 py-0.5 text-[11px]"
                style={{
                  background: "var(--bg-sunken)",
                  border: "1px solid var(--border)",
                  borderRadius: 4,
                }}
              >
                ⌘K
              </kbd>{" "}
              to search anything
            </span>
          </div>
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
