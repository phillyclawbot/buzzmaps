import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import Link from "next/link";
import type { PlaceCategory } from "@/lib/types";
import JsonLd from "@/components/JsonLd";
import TopBar from "@/components/ui/TopBar";
import BackLink from "@/components/ui/BackLink";
import PlaceCard from "@/components/ui/PlaceCard";
import CategoryBadge from "@/components/ui/CategoryBadge";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import {
  VALID_CATEGORIES,
  CATEGORY_COLORS,
  CATEGORY_GRADIENT,
} from "@/lib/constants";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;
type Sort = "mentions" | "rating" | "alpha" | "newest";
const SORTS: { id: Sort; label: string }[] = [
  { id: "mentions", label: "Most mentioned" },
  { id: "rating", label: "Top rated" },
  { id: "newest", label: "Newest" },
  { id: "alpha", label: "A–Z" },
];

const LABELS: Record<string, string> = {
  restaurant: "Restaurants",
  bar: "Bars",
  cafe: "Cafés",
  club: "Clubs",
  shop: "Shops",
  park: "Parks",
  gym: "Gyms",
  venue: "Venues",
  market: "Markets",
  museum: "Museums",
  event: "Events",
  landmark: "Landmarks",
  attraction: "Attractions",
  other: "Places",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ cat: string }>;
}): Promise<Metadata> {
  const { cat } = await params;
  const isValid = (VALID_CATEGORIES as readonly string[]).includes(cat);
  const label = LABELS[cat] ?? cat;

  if (!isValid) {
    return { title: `Category — ${SITE_NAME}` };
  }

  const title = `${label} in Toronto — ${SITE_NAME}`;
  const description = `Discover Toronto's best ${label.toLowerCase()}, ranked by how often Reddit and local blogs talk about them.`;
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

  const countRows = (await sql`
    SELECT COUNT(*)::int AS total FROM restaurants WHERE category = ${cat}
  `) as { total: number }[];
  const total = countRows[0]?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  let places: CategoryPlace[] = [];
  if (total > 0) {
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

  const label = LABELS[cat] ?? cat;
  const category = cat as PlaceCategory;
  const accent =
    (CATEGORY_COLORS as Record<string, string>)[cat] || "var(--brand)";
  const gradientClasses =
    (CATEGORY_GRADIENT as Record<string, string>)[cat] ||
    "from-[#ff5b3a] to-[#ff8a3d]";

  const fromQs = `?from=${encodeURIComponent(`/category/${cat}`)}`;

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
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <JsonLd data={itemListLd} />
      <JsonLd data={breadcrumbLd} />
      <TopBar title={label} back="/" backLabel="All places" />

      <article className="pt-14 md:pt-16 pb-24 max-w-5xl mx-auto px-6 md:px-10 page-enter">
        <div className="hidden md:block mb-6">
          <BackLink href="/" label="All places" />
        </div>

        <header
          className="text-center pt-8 pb-8 mb-10"
          style={{ borderBottom: "1px solid var(--fg)" }}
        >
          <div className="flex justify-center mb-4">
            <CategoryBadge
              category={category}
              size="md"
              variant="solid"
            />
          </div>
          <h1
            className={`font-display text-5xl sm:text-6xl md:text-7xl bg-gradient-to-r ${gradientClasses} bg-clip-text text-transparent`}
            style={{ fontWeight: 500, lineHeight: 1, letterSpacing: "-0.02em" }}
          >
            {label}.
          </h1>
          <p
            className="caption mt-4"
            style={{ color: "var(--fg-muted)" }}
          >
            {total} {total === 1 ? "place" : "places"} catalogued in Toronto
          </p>
        </header>

        {total > 0 && (
          <div className="flex flex-wrap gap-2 mb-8 justify-center md:justify-start">
            {SORTS.map((s) => {
              const params = new URLSearchParams();
              if (s.id !== "mentions") params.set("sort", s.id);
              const href = params.toString() ? `?${params.toString()}` : "";
              const isActive = sort === s.id;
              return (
                <Link
                  key={s.id}
                  href={href}
                  scroll={false}
                  className={`chip-pill ${isActive ? "chip-pill-active" : ""}`}
                  style={
                    isActive
                      ? {
                          background: accent,
                          borderColor: accent,
                          color: "var(--fg-inverse)",
                          boxShadow: `0 4px 12px ${accent}33`,
                        }
                      : undefined
                  }
                >
                  {s.label}
                </Link>
              );
            })}
          </div>
        )}

        {total === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-20 text-center rounded-[var(--radius-xl)]"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              className="inline-flex items-center justify-center mb-4"
              style={{
                width: 56,
                height: 56,
                borderRadius: "var(--radius-lg)",
                background: `${accent}1f`,
              }}
            >
              <CategoryBadge
                category={category}
                size="md"
                showLabel={false}
                variant="tint"
              />
            </div>
            <p
              className="font-display text-2xl"
              style={{ color: "var(--fg)", fontWeight: 500 }}
            >
              No {label.toLowerCase()} tracked yet.
            </p>
            <p className="caption mt-2" style={{ color: "var(--fg-muted)" }}>
              Be the first to suggest one.
            </p>
            <Link
              href="/submit"
              className="btn-primary mt-6"
            >
              Submit a place
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {places.map((p, i) => (
              <PlaceCard
                key={p.id}
                stagger={i}
                href={`/place/${encodeURIComponent(p.name)}${fromQs}`}
                place={{
                  id: p.id,
                  name: p.name,
                  category,
                  address: p.address,
                  photo_url: p.photo_url,
                  mention_count: p.mention_count,
                  google_rating: p.google_rating,
                  cuisine_type: p.cuisine_type,
                  price_level: p.price_level,
                }}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <nav
            aria-label="Pagination"
            className="mt-12 flex items-center justify-center gap-3 text-sm"
          >
            <Link
              href={page > 1 ? qs({ page: page - 1 }) : "#"}
              aria-disabled={page === 1}
              className={`chip-pill ${page === 1 ? "pointer-events-none" : ""}`}
              style={page === 1 ? { color: "var(--fg-faint)" } : undefined}
            >
              ← Prev
            </Link>
            <span
              className="dateline"
              style={{ color: "var(--fg-muted)" }}
            >
              Page {page} of {totalPages}
            </span>
            <Link
              href={page < totalPages ? qs({ page: page + 1 }) : "#"}
              aria-disabled={page === totalPages}
              className={`chip-pill ${page === totalPages ? "pointer-events-none" : ""}`}
              style={page === totalPages ? { color: "var(--fg-faint)" } : undefined}
            >
              Next →
            </Link>
          </nav>
        )}
      </article>
    </div>
  );
}
