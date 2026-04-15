import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { CATEGORY_EMOJI } from "@/lib/types";
import type { PlaceCategory } from "@/lib/types";
import JsonLd from "@/components/JsonLd";
import TopBar from "@/components/ui/TopBar";
import PlaceCard from "@/components/ui/PlaceCard";
import EmptyState from "@/components/ui/EmptyState";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { VALID_CATEGORIES } from "@/lib/constants";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;
const MAX_Q = 100;

type Sort = "mentions" | "rating" | "alpha";

interface Row {
  id: number;
  name: string;
  address: string | null;
  category: PlaceCategory;
  google_rating: number | null;
  google_reviews_count: number | null;
  cuisine_type: string | null;
  price_level: number | null;
  photo_url: string | null;
  mention_count: number;
  preview_title: string | null;
  preview_subreddit: string | null;
  preview_score: number | null;
  preview_created_utc: number | null;
}

/**
 * Fold preview_* columns into a `preview` object for PlaceCard.
 */
function toCardData(r: Row) {
  return {
    id: r.id,
    name: r.name,
    address: r.address,
    category: r.category,
    photo_url: r.photo_url,
    mention_count: r.mention_count,
    google_rating: r.google_rating,
    cuisine_type: r.cuisine_type,
    price_level: r.price_level,
    preview:
      r.preview_title && r.preview_subreddit
        ? {
            title: r.preview_title,
            subreddit: r.preview_subreddit,
            score: r.preview_score ?? undefined,
            created_utc: r.preview_created_utc ?? undefined,
          }
        : null,
  };
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const q = String(sp.q ?? "").slice(0, MAX_Q);
  const title = q
    ? `Search: "${q}" — ${SITE_NAME}`
    : `Search Toronto places — ${SITE_NAME}`;
  return {
    title,
    description:
      "Search BuzzMaps for Toronto places by name, neighbourhood, cuisine, or keyword.",
    alternates: { canonical: `${SITE_URL}/search` },
  };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const q = String(sp.q ?? "")
    .trim()
    .slice(0, MAX_Q);

  const rawCat = Array.isArray(sp.category) ? sp.category[0] : sp.category;
  const category =
    rawCat && (VALID_CATEGORIES as readonly string[]).includes(rawCat)
      ? (rawCat as PlaceCategory)
      : null;

  const rawSort = Array.isArray(sp.sort) ? sp.sort[0] : sp.sort;
  const sort: Sort = (["mentions", "rating", "alpha"] as const).includes(
    rawSort as Sort
  )
    ? (rawSort as Sort)
    : "mentions";

  const rawPage = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  const page = Math.max(1, parseInt(rawPage || "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const sql = getDb();
  const like = `%${q}%`;

  let rows: Row[] = [];
  let total = 0;
  const hasQuery = q.length > 0 || !!category;

  if (hasQuery) {
    // Count matching places (independent of pagination).
    if (q && category) {
      const c = (await sql`
        SELECT COUNT(*)::int AS total FROM restaurants
        WHERE category = ${category}
          AND (name ILIKE ${like} OR COALESCE(address, '') ILIKE ${like}
               OR COALESCE(cuisine_type, '') ILIKE ${like})
      `) as { total: number }[];
      total = c[0]?.total ?? 0;
    } else if (q) {
      const c = (await sql`
        SELECT COUNT(*)::int AS total FROM restaurants
        WHERE name ILIKE ${like} OR COALESCE(address, '') ILIKE ${like}
              OR COALESCE(cuisine_type, '') ILIKE ${like}
      `) as { total: number }[];
      total = c[0]?.total ?? 0;
    } else if (category) {
      const c = (await sql`
        SELECT COUNT(*)::int AS total FROM restaurants WHERE category = ${category}
      `) as { total: number }[];
      total = c[0]?.total ?? 0;
    }

    if (total > 0) {
      // 3 sorts × 3 filter shapes = 9 possible branches. We collapse by
      // precomputing the filtered rowset then sorting.
      // For simplicity fetch top-N (by mentions) then apply the requested
      // sort. For "alpha" / "rating" we fetch a larger slice to guarantee
      // stable ranking across pages.
      const fetchLimit = sort === "mentions" ? PAGE_SIZE : 500;
      const fetchOffset = sort === "mentions" ? offset : 0;

      if (q && category) {
        rows = (await sql`
          SELECT r.id, r.name, r.address, r.category, r.google_rating,
                 r.google_reviews_count, r.cuisine_type, r.price_level, r.photo_url,
                 COUNT(DISTINCT pr.post_id)::int AS mention_count,
                 (
                   SELECT rp2.title FROM reddit_posts rp2
                   JOIN post_restaurants pr2 ON pr2.post_id = rp2.id
                   WHERE pr2.restaurant_id = r.id
                   ORDER BY rp2.score DESC NULLS LAST, rp2.created_utc DESC
                   LIMIT 1
                 ) AS preview_title,
                 (
                   SELECT rp2.subreddit FROM reddit_posts rp2
                   JOIN post_restaurants pr2 ON pr2.post_id = rp2.id
                   WHERE pr2.restaurant_id = r.id
                   ORDER BY rp2.score DESC NULLS LAST, rp2.created_utc DESC
                   LIMIT 1
                 ) AS preview_subreddit,
                 (
                   SELECT rp2.score FROM reddit_posts rp2
                   JOIN post_restaurants pr2 ON pr2.post_id = rp2.id
                   WHERE pr2.restaurant_id = r.id
                   ORDER BY rp2.score DESC NULLS LAST, rp2.created_utc DESC
                   LIMIT 1
                 )::int AS preview_score,
                 (
                   SELECT rp2.created_utc FROM reddit_posts rp2
                   JOIN post_restaurants pr2 ON pr2.post_id = rp2.id
                   WHERE pr2.restaurant_id = r.id
                   ORDER BY rp2.score DESC NULLS LAST, rp2.created_utc DESC
                   LIMIT 1
                 )::bigint AS preview_created_utc
          FROM restaurants r
          LEFT JOIN post_restaurants pr ON pr.restaurant_id = r.id
          WHERE r.category = ${category}
            AND (r.name ILIKE ${like} OR COALESCE(r.address, '') ILIKE ${like}
                 OR COALESCE(r.cuisine_type, '') ILIKE ${like})
          GROUP BY r.id
          ORDER BY mention_count DESC, r.google_rating DESC NULLS LAST
          LIMIT ${fetchLimit} OFFSET ${fetchOffset}
        `) as unknown as Row[];
      } else if (q) {
        rows = (await sql`
          SELECT r.id, r.name, r.address, r.category, r.google_rating,
                 r.google_reviews_count, r.cuisine_type, r.price_level, r.photo_url,
                 COUNT(DISTINCT pr.post_id)::int AS mention_count,
                 (
                   SELECT rp2.title FROM reddit_posts rp2
                   JOIN post_restaurants pr2 ON pr2.post_id = rp2.id
                   WHERE pr2.restaurant_id = r.id
                   ORDER BY rp2.score DESC NULLS LAST, rp2.created_utc DESC
                   LIMIT 1
                 ) AS preview_title,
                 (
                   SELECT rp2.subreddit FROM reddit_posts rp2
                   JOIN post_restaurants pr2 ON pr2.post_id = rp2.id
                   WHERE pr2.restaurant_id = r.id
                   ORDER BY rp2.score DESC NULLS LAST, rp2.created_utc DESC
                   LIMIT 1
                 ) AS preview_subreddit,
                 (
                   SELECT rp2.score FROM reddit_posts rp2
                   JOIN post_restaurants pr2 ON pr2.post_id = rp2.id
                   WHERE pr2.restaurant_id = r.id
                   ORDER BY rp2.score DESC NULLS LAST, rp2.created_utc DESC
                   LIMIT 1
                 )::int AS preview_score,
                 (
                   SELECT rp2.created_utc FROM reddit_posts rp2
                   JOIN post_restaurants pr2 ON pr2.post_id = rp2.id
                   WHERE pr2.restaurant_id = r.id
                   ORDER BY rp2.score DESC NULLS LAST, rp2.created_utc DESC
                   LIMIT 1
                 )::bigint AS preview_created_utc
          FROM restaurants r
          LEFT JOIN post_restaurants pr ON pr.restaurant_id = r.id
          WHERE r.name ILIKE ${like} OR COALESCE(r.address, '') ILIKE ${like}
                OR COALESCE(r.cuisine_type, '') ILIKE ${like}
          GROUP BY r.id
          ORDER BY mention_count DESC, r.google_rating DESC NULLS LAST
          LIMIT ${fetchLimit} OFFSET ${fetchOffset}
        `) as unknown as Row[];
      } else if (category) {
        rows = (await sql`
          SELECT r.id, r.name, r.address, r.category, r.google_rating,
                 r.google_reviews_count, r.cuisine_type, r.price_level, r.photo_url,
                 COUNT(DISTINCT pr.post_id)::int AS mention_count,
                 (
                   SELECT rp2.title FROM reddit_posts rp2
                   JOIN post_restaurants pr2 ON pr2.post_id = rp2.id
                   WHERE pr2.restaurant_id = r.id
                   ORDER BY rp2.score DESC NULLS LAST, rp2.created_utc DESC
                   LIMIT 1
                 ) AS preview_title,
                 (
                   SELECT rp2.subreddit FROM reddit_posts rp2
                   JOIN post_restaurants pr2 ON pr2.post_id = rp2.id
                   WHERE pr2.restaurant_id = r.id
                   ORDER BY rp2.score DESC NULLS LAST, rp2.created_utc DESC
                   LIMIT 1
                 ) AS preview_subreddit,
                 (
                   SELECT rp2.score FROM reddit_posts rp2
                   JOIN post_restaurants pr2 ON pr2.post_id = rp2.id
                   WHERE pr2.restaurant_id = r.id
                   ORDER BY rp2.score DESC NULLS LAST, rp2.created_utc DESC
                   LIMIT 1
                 )::int AS preview_score,
                 (
                   SELECT rp2.created_utc FROM reddit_posts rp2
                   JOIN post_restaurants pr2 ON pr2.post_id = rp2.id
                   WHERE pr2.restaurant_id = r.id
                   ORDER BY rp2.score DESC NULLS LAST, rp2.created_utc DESC
                   LIMIT 1
                 )::bigint AS preview_created_utc
          FROM restaurants r
          LEFT JOIN post_restaurants pr ON pr.restaurant_id = r.id
          WHERE r.category = ${category}
          GROUP BY r.id
          ORDER BY mention_count DESC, r.google_rating DESC NULLS LAST
          LIMIT ${fetchLimit} OFFSET ${fetchOffset}
        `) as unknown as Row[];
      }

      if (sort !== "mentions") {
        rows = [...rows].sort((a, b) => {
          if (sort === "rating") {
            const ra = a.google_rating ?? -1;
            const rb = b.google_rating ?? -1;
            if (rb !== ra) return rb - ra;
            return b.mention_count - a.mention_count;
          }
          return a.name.localeCompare(b.name);
        });
        rows = rows.slice(offset, offset + PAGE_SIZE);
      }
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const qs = (overrides: Record<string, string | number | null>) => {
    const sp2 = new URLSearchParams();
    if (q) sp2.set("q", q);
    if (category) sp2.set("category", category);
    if (sort !== "mentions") sp2.set("sort", sort);
    if (page !== 1) sp2.set("page", String(page));
    for (const [k, v] of Object.entries(overrides)) {
      if (v === null || v === "") sp2.delete(k);
      else sp2.set(k, String(v));
    }
    const s = sp2.toString();
    return s ? `?${s}` : "";
  };

  const itemListLd = hasQuery
    ? {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: `Search: ${q || category}`,
        numberOfItems: total,
        itemListElement: rows.slice(0, 50).map((p, i) => ({
          "@type": "ListItem",
          position: offset + i + 1,
          url: `${SITE_URL}/place/${encodeURIComponent(p.name)}`,
          name: p.name,
        })),
      }
    : null;

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {itemListLd ? <JsonLd data={itemListLd} /> : null}

      <TopBar title="Search" />

      <article className="pt-14 md:pt-16 pb-24 max-w-4xl mx-auto px-6 md:px-10 page-enter">
        <header
          className="text-center pt-8 pb-8 mb-10"
          style={{ borderBottom: "1px solid var(--fg)" }}
        >
          <p className="eyebrow mb-3" style={{ color: "var(--brand)" }}>
            Index
          </p>
          <h1
            className="font-display text-5xl md:text-6xl"
            style={{ color: "var(--fg)", fontWeight: 500, lineHeight: 1 }}
          >
            Search Toronto.
          </h1>
          <p
            className="caption mt-4 max-w-md mx-auto"
            style={{ color: "var(--fg-muted)" }}
          >
            By name, neighbourhood, cuisine — or any keyword from a Reddit thread.
          </p>
        </header>

        {/* GET form — server-rendered, no client JS needed */}
        <form
          method="GET"
          action="/search"
          className="flex flex-col sm:flex-row gap-3 mb-10 max-w-2xl mx-auto"
        >
          <input
            type="search"
            name="q"
            defaultValue={q}
            maxLength={MAX_Q}
            placeholder="Try ‘ramen’, ‘Kensington’, ‘west end coffee’…"
            className="flex-1 px-4 py-3 text-base outline-none focus-ring font-serif"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--fg)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
            }}
          />
          <select
            name="category"
            defaultValue={category ?? ""}
            className="px-4 py-3 text-sm outline-none focus-ring"
            style={{
              background: "var(--bg-elevated)",
              color: "var(--fg)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
            }}
          >
            <option value="">All categories</option>
            {VALID_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_EMOJI[c as PlaceCategory] ?? "📍"}{" "}
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="px-6 py-3 text-sm font-semibold press-down transition-colors"
            style={{
              background: "var(--ink)",
              color: "var(--ink-inverse)",
              borderRadius: "var(--radius-sm)",
              letterSpacing: "0.04em",
            }}
          >
            Search
          </button>
        </form>

        {/* Sort control only when we have results */}
        {total > 0 && (
          <div className="flex items-baseline gap-5 mb-8">
            <p className="dateline">Sort by:</p>
            {(
              [
                { id: "mentions", label: "Most mentioned" },
                { id: "rating", label: "Top rated" },
                { id: "alpha", label: "A–Z" },
              ] as const
            ).map((s) => {
              const active = sort === s.id;
              return (
                <Link
                  key={s.id}
                  href={qs({
                    sort: s.id === "mentions" ? null : s.id,
                    page: null,
                  })}
                  scroll={false}
                  className="text-sm transition-colors"
                  style={{
                    color: active ? "var(--fg)" : "var(--fg-muted)",
                    fontWeight: active ? 600 : 400,
                    textDecoration: active ? "underline" : "none",
                    textUnderlineOffset: "5px",
                    textDecorationColor: "var(--brand)",
                  }}
                >
                  {s.label}
                </Link>
              );
            })}
          </div>
        )}

        {!hasQuery ? (
          <p
            className="caption text-center py-12"
            style={{ color: "var(--fg-muted)" }}
          >
            Type something above to search.
          </p>
        ) : total === 0 ? (
          <EmptyState
            title={`No matches${q ? ` for “${q}”` : ""}`}
            message="Try different keywords, or submit a place we don't know about yet."
            action={
              <Link
                href="/submit"
                className="font-display text-xl ink-underline"
                style={{ color: "var(--brand)", fontWeight: 500 }}
              >
                Submit a place →
              </Link>
            }
          />
        ) : (
          <>
            <div
              className="flex items-baseline justify-between mb-8 pb-3"
              style={{ borderBottom: "1px solid var(--fg)" }}
            >
              <h2
                className="font-display text-2xl md:text-3xl"
                style={{ color: "var(--fg)", fontWeight: 500 }}
              >
                {total} {total === 1 ? "result" : "results"}
                {q && (
                  <>
                    {" "}for{" "}
                    <span style={{ color: "var(--brand)" }} className="italic">
                      “{q}”
                    </span>
                  </>
                )}
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
              {rows.map((place, i) => (
                <PlaceCard
                  key={place.id}
                  place={toCardData(place)}
                  stagger={i}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <nav
                aria-label="Pagination"
                className="mt-8 flex items-center justify-center gap-2 text-sm"
              >
                <Link
                  href={page > 1 ? qs({ page: page - 1 }) : "#"}
                  aria-disabled={page === 1}
                  className="px-3 py-1.5 rounded-full border transition-colors"
                  style={{
                    color: page === 1 ? "var(--fg-faint)" : "var(--fg-muted)",
                    borderColor: "var(--border)",
                    pointerEvents: page === 1 ? "none" : undefined,
                  }}
                >
                  ← Prev
                </Link>
                <span
                  className="text-xs px-2"
                  style={{ color: "var(--fg-muted)" }}
                >
                  Page {page} of {totalPages}
                </span>
                <Link
                  href={page < totalPages ? qs({ page: page + 1 }) : "#"}
                  aria-disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-full border transition-colors"
                  style={{
                    color:
                      page === totalPages ? "var(--fg-faint)" : "var(--fg-muted)",
                    borderColor: "var(--border)",
                    pointerEvents: page === totalPages ? "none" : undefined,
                  }}
                >
                  Next →
                </Link>
              </nav>
            )}
          </>
        )}
      </article>
    </div>
  );
}
