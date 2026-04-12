import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { CATEGORY_EMOJI } from "@/lib/types";
import type { PlaceCategory } from "@/lib/types";
import JsonLd from "@/components/JsonLd";
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
}

function priceBadge(level: number | null): string {
  if (!level || level < 1) return "";
  return "$".repeat(Math.min(level, 4));
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
                 COUNT(DISTINCT pr.post_id)::int AS mention_count
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
                 COUNT(DISTINCT pr.post_id)::int AS mention_count
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
                 COUNT(DISTINCT pr.post_id)::int AS mention_count
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
    <div className="min-h-screen bg-slate-50">
      {itemListLd ? <JsonLd data={itemListLd} /> : null}

      <div className="fixed top-0 left-0 right-0 h-12 bg-white/95 backdrop-blur-sm border-b border-slate-200 z-50 flex items-center px-4 gap-3">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff6b35] shrink-0" />
          <span className="font-semibold text-sm tracking-tight bg-gradient-to-r from-[#ff6b35] to-[#f59e0b] bg-clip-text text-transparent">
            BuzzMaps
          </span>
        </Link>
        <span className="text-slate-300">·</span>
        <span className="text-sm font-semibold text-slate-700">🔎 Search</span>
      </div>

      <div className="pt-16 pb-20 max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Search Toronto</h1>
          <p className="text-sm text-slate-500 mt-1">
            Find places by name, address, neighbourhood, or cuisine.
          </p>
        </div>

        {/* GET form — server-rendered, no client JS needed */}
        <form
          method="GET"
          action="/search"
          className="flex flex-col sm:flex-row gap-2 mb-5"
        >
          <input
            type="search"
            name="q"
            defaultValue={q}
            maxLength={MAX_Q}
            placeholder="Search places, cuisines, neighbourhoods…"
            className="flex-1 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#ff6b35] transition-colors"
          />
          <select
            name="category"
            defaultValue={category ?? ""}
            className="px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:border-[#ff6b35]"
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
            className="px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-[#ff6b35] to-[#ea580c] hover:opacity-90"
          >
            Search
          </button>
        </form>

        {/* Sort control only when we have results */}
        {total > 0 && (
          <div className="flex flex-wrap gap-1 bg-white border border-slate-200 rounded-full p-1 mb-5 w-fit">
            {(
              [
                { id: "mentions", label: "Most mentioned" },
                { id: "rating", label: "Top rated" },
                { id: "alpha", label: "A–Z" },
              ] as const
            ).map((s) => (
              <Link
                key={s.id}
                href={qs({ sort: s.id === "mentions" ? null : s.id, page: null })}
                scroll={false}
                className={`text-xs font-medium px-3 py-1 rounded-full transition-colors ${
                  sort === s.id
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {s.label}
              </Link>
            ))}
          </div>
        )}

        {!hasQuery ? (
          <div className="text-sm text-slate-500">
            Type something above to search.
          </div>
        ) : total === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <span className="text-4xl mb-3">🔍</span>
            <p className="text-sm font-medium text-slate-500">
              No places matched {q ? <>&ldquo;{q}&rdquo;</> : "that filter"}.
            </p>
            <Link
              href="/submit"
              className="mt-4 px-5 py-2 bg-[#ff6b35] text-white text-xs font-semibold rounded-lg hover:bg-[#ea580c] transition-colors"
            >
              ➕ Submit a place
            </Link>
          </div>
        ) : (
          <>
            <p className="text-xs text-slate-500 mb-3">
              {total} result{total !== 1 ? "s" : ""}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {rows.map((place) => {
                const emoji = CATEGORY_EMOJI[place.category] ?? "📍";
                const price = priceBadge(place.price_level);
                return (
                  <Link
                    key={place.id}
                    href={`/place/${encodeURIComponent(place.name)}`}
                    className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-[#ff6b35]/40 transition-all overflow-hidden"
                  >
                    {place.photo_url && (
                      // eslint-disable-next-line @next/next/no-img-element
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
                          <h3 className="text-sm font-bold text-slate-900 truncate">
                            {place.name}
                          </h3>
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {emoji}{" "}
                            {place.category.charAt(0).toUpperCase() +
                              place.category.slice(1)}
                            {place.cuisine_type ? ` · ${place.cuisine_type}` : ""}
                          </p>
                          {place.address && (
                            <p className="text-xs text-slate-400 truncate mt-0.5">
                              {place.address}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center flex-wrap gap-2 mt-2">
                        <span className="text-xs font-semibold bg-[#ff6b35]/10 text-[#ff6b35] px-2 py-0.5 rounded-full">
                          {place.mention_count} mention
                          {place.mention_count !== 1 ? "s" : ""}
                        </span>
                        {place.google_rating !== null && (
                          <span className="text-xs text-slate-500">
                            ⭐ {place.google_rating.toFixed(1)}
                          </span>
                        )}
                        {price && (
                          <span className="text-xs text-slate-500 font-semibold">
                            {price}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>

            {totalPages > 1 && (
              <nav
                aria-label="Pagination"
                className="mt-8 flex items-center justify-center gap-2 text-sm"
              >
                <Link
                  href={page > 1 ? qs({ page: page - 1 }) : "#"}
                  aria-disabled={page === 1}
                  className={`px-3 py-1.5 rounded-full border ${
                    page === 1
                      ? "text-slate-300 border-slate-100 pointer-events-none"
                      : "text-slate-600 border-slate-200 hover:border-[#ff6b35] hover:text-[#ff6b35]"
                  }`}
                >
                  ← Prev
                </Link>
                <span className="text-xs text-slate-500 px-2">
                  Page {page} of {totalPages}
                </span>
                <Link
                  href={page < totalPages ? qs({ page: page + 1 }) : "#"}
                  aria-disabled={page === totalPages}
                  className={`px-3 py-1.5 rounded-full border ${
                    page === totalPages
                      ? "text-slate-300 border-slate-100 pointer-events-none"
                      : "text-slate-600 border-slate-200 hover:border-[#ff6b35] hover:text-[#ff6b35]"
                  }`}
                >
                  Next →
                </Link>
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  );
}
