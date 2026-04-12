import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import Link from "next/link";
import { CATEGORY_EMOJI } from "@/lib/types";
import type { PlaceCategory } from "@/lib/types";
import JsonLd from "@/components/JsonLd";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { VALID_CATEGORIES } from "@/lib/constants";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;
type Sort = "mentions" | "rating" | "alpha" | "newest";
const SORTS: { id: Sort; label: string }[] = [
  { id: "mentions", label: "Most mentioned" },
  { id: "rating", label: "Top rated" },
  { id: "newest", label: "Newest" },
  { id: "alpha", label: "A–Z" },
];

function priceBadge(level: number | null): string {
  if (!level || level < 1) return "";
  return "$".repeat(Math.min(level, 4));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ cat: string }>;
}): Promise<Metadata> {
  const { cat } = await params;
  const isValid = (VALID_CATEGORIES as readonly string[]).includes(cat);
  const label = cat.charAt(0).toUpperCase() + cat.slice(1);
  const emoji = CATEGORY_EMOJI[cat as PlaceCategory] || "📍";

  if (!isValid) {
    return { title: `Category — ${SITE_NAME}` };
  }

  const title = `${emoji} ${label} in Toronto — ${SITE_NAME}`;
  const description = `Discover Toronto's best ${label.toLowerCase()} places, ranked by how often Reddit and local blogs talk about them.`;
  const canonical = `${SITE_URL}/category/${cat}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

interface CategoryPlace {
  id: number;
  name: string;
  address: string | null;
  mention_count: number;
  google_rating: number | null;
  google_reviews_count: number | null;
  cuisine_type: string | null;
  price_level: number | null;
  photo_url: string | null;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ cat: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { cat } = await params;
  const sp = await searchParams;

  const rawSort = Array.isArray(sp.sort) ? sp.sort[0] : sp.sort;
  const sort: Sort = (["mentions", "rating", "alpha", "newest"] as const).includes(
    rawSort as Sort
  )
    ? (rawSort as Sort)
    : "mentions";

  const rawPage = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  const page = Math.max(1, parseInt(rawPage || "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const sql = getDb();

  // Count first — small, cacheable, avoids paginating through an unbounded
  // query plan.
  const countRows = (await sql`
    SELECT COUNT(*)::int AS total FROM restaurants WHERE category = ${cat}
  `) as { total: number }[];
  const total = countRows[0]?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  let places: CategoryPlace[] = [];
  if (total > 0) {
    // Each sort needs its own tagged template so neon keeps parameters safe.
    if (sort === "rating") {
      places = (await sql`
        SELECT r.id, r.name, r.address, r.google_rating, r.google_reviews_count,
               r.cuisine_type, r.price_level, r.photo_url,
               COUNT(DISTINCT pr.post_id)::int AS mention_count
        FROM restaurants r
        LEFT JOIN post_restaurants pr ON pr.restaurant_id = r.id
        WHERE r.category = ${cat}
        GROUP BY r.id
        ORDER BY r.google_rating DESC NULLS LAST, mention_count DESC
        LIMIT ${PAGE_SIZE} OFFSET ${offset}
      `) as unknown as CategoryPlace[];
    } else if (sort === "alpha") {
      places = (await sql`
        SELECT r.id, r.name, r.address, r.google_rating, r.google_reviews_count,
               r.cuisine_type, r.price_level, r.photo_url,
               COUNT(DISTINCT pr.post_id)::int AS mention_count
        FROM restaurants r
        LEFT JOIN post_restaurants pr ON pr.restaurant_id = r.id
        WHERE r.category = ${cat}
        GROUP BY r.id
        ORDER BY LOWER(r.name) ASC
        LIMIT ${PAGE_SIZE} OFFSET ${offset}
      `) as unknown as CategoryPlace[];
    } else if (sort === "newest") {
      places = (await sql`
        SELECT r.id, r.name, r.address, r.google_rating, r.google_reviews_count,
               r.cuisine_type, r.price_level, r.photo_url,
               COUNT(DISTINCT pr.post_id)::int AS mention_count
        FROM restaurants r
        LEFT JOIN post_restaurants pr ON pr.restaurant_id = r.id
        WHERE r.category = ${cat}
        GROUP BY r.id
        ORDER BY r.first_seen_at DESC NULLS LAST
        LIMIT ${PAGE_SIZE} OFFSET ${offset}
      `) as unknown as CategoryPlace[];
    } else {
      places = (await sql`
        SELECT r.id, r.name, r.address, r.google_rating, r.google_reviews_count,
               r.cuisine_type, r.price_level, r.photo_url,
               COUNT(DISTINCT pr.post_id)::int AS mention_count
        FROM restaurants r
        LEFT JOIN post_restaurants pr ON pr.restaurant_id = r.id
        WHERE r.category = ${cat}
        GROUP BY r.id
        ORDER BY mention_count DESC, r.google_rating DESC NULLS LAST
        LIMIT ${PAGE_SIZE} OFFSET ${offset}
      `) as unknown as CategoryPlace[];
    }
  }

  const emoji = CATEGORY_EMOJI[cat as PlaceCategory] || "📍";
  const label = capitalize(cat);

  const qs = (overrides: Record<string, string | number | null>) => {
    const sp2 = new URLSearchParams();
    if (sort !== "mentions") sp2.set("sort", sort);
    if (page !== 1) sp2.set("page", String(page));
    for (const [k, v] of Object.entries(overrides)) {
      if (v === null) sp2.delete(k);
      else sp2.set(k, String(v));
    }
    const s = sp2.toString();
    return s ? `?${s}` : "";
  };

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${label} in Toronto`,
    url: `${SITE_URL}/category/${cat}`,
    numberOfItems: total,
    itemListElement: places.slice(0, 50).map((p, i) => ({
      "@type": "ListItem",
      position: offset + i + 1,
      url: `${SITE_URL}/place/${encodeURIComponent(p.name)}`,
      name: p.name,
    })),
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Map", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: label,
        item: `${SITE_URL}/category/${cat}`,
      },
    ],
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <JsonLd data={itemListLd} />
      <JsonLd data={breadcrumbLd} />
      <div className="fixed top-0 left-0 right-0 h-12 bg-white/95 backdrop-blur-sm border-b border-slate-200 z-50 flex items-center px-4 gap-3">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff6b35] shrink-0" />
          <span className="font-semibold text-sm tracking-tight bg-gradient-to-r from-[#ff6b35] to-[#f59e0b] bg-clip-text text-transparent">
            BuzzMaps
          </span>
        </Link>
        <span className="text-slate-300">·</span>
        <span className="text-sm font-semibold text-slate-700">
          {emoji} {label}
        </span>
      </div>

      <div className="pt-16 pb-20 max-w-4xl mx-auto px-4">
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
            {total} place{total !== 1 ? "s" : ""} tracked by BuzzMaps
          </p>
        </div>

        {/* Sort controls */}
        {total > 0 && (
          <div className="flex flex-wrap gap-1 bg-white border border-slate-200 rounded-full p-1 mb-5 w-fit">
            {SORTS.map((s) => {
              const params = new URLSearchParams();
              if (s.id !== "mentions") params.set("sort", s.id);
              const href = params.toString() ? `?${params.toString()}` : "";
              return (
                <Link
                  key={s.id}
                  href={href}
                  scroll={false}
                  className={`text-xs font-medium px-3 py-1 rounded-full transition-colors ${
                    sort === s.id
                      ? "bg-slate-900 text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {s.label}
                </Link>
              );
            })}
          </div>
        )}

        {total === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <span className="text-4xl mb-3">{emoji}</span>
            <p className="text-sm font-medium text-slate-500">
              No {label.toLowerCase()} places tracked yet
            </p>
            <p className="text-xs text-slate-400 mt-1">Be the first to suggest one!</p>
            <Link
              href="/submit"
              className="mt-4 px-5 py-2 bg-[#ff6b35] text-white text-xs font-semibold rounded-lg hover:bg-[#ea580c] transition-colors"
            >
              ➕ Submit a {label}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {places.map((place) => {
              const price = priceBadge(place.price_level);
              return (
                <Link
                  key={place.id}
                  href={`/place/${encodeURIComponent(place.name)}`}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-[#ff6b35]/40 transition-all overflow-hidden cursor-pointer hover:scale-[1.01]"
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
                        {place.cuisine_type && (
                          <p className="text-[11px] text-slate-500 truncate mt-0.5">
                            {place.cuisine_type}
                          </p>
                        )}
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
                          {place.google_reviews_count ? (
                            <span className="text-slate-400">
                              {" "}
                              ({place.google_reviews_count.toLocaleString()})
                            </span>
                          ) : null}
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
        )}

        {/* Pagination */}
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
      </div>
    </div>
  );
}
