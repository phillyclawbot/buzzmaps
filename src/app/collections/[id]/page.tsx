import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { PlaceCategory } from "@/lib/types";
import { COLLECTIONS, getCollectionById } from "@/lib/collections";
import type { CollectionQuery } from "@/lib/collections";
import { decodeHtmlEntities, getPostHref } from "@/lib/post-source";
import PostSource from "@/components/ui/PostSource";
import { CollectionIcon, CategoryIcon, IconStar, IconChat, IconMap, IconExternalLink, IconUpArrow } from "@/lib/icons";
import JsonLd from "@/components/JsonLd";
import TopBar from "@/components/ui/TopBar";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const collection = getCollectionById(id);
  if (!collection) {
    return { title: `Collection — ${SITE_NAME}` };
  }
  const title = `${collection.title} — ${SITE_NAME} Toronto`;
  const canonical = `${SITE_URL}/collections/${collection.id}`;
  return {
    title,
    description: collection.description,
    alternates: { canonical },
    openGraph: {
      title,
      description: collection.description,
      url: canonical,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: collection.description,
    },
  };
}

function formatDate(utc: number): string {
  return new Date(utc * 1000).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function SentimentDot({ sentiment }: { sentiment: string }) {
  const color =
    sentiment === "positive"
      ? "#22c55e"
      : sentiment === "negative"
      ? "#ef4444"
      : "#f59e0b";
  return (
    <span
      className="inline-block w-2 h-2 rounded-full shrink-0 mt-1"
      style={{ background: color }}
    />
  );
}

interface PlaceWithPosts {
  id: number;
  name: string;
  category: PlaceCategory;
  mention_count: number;
  google_rating: number | null;
  address: string | null;
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
}

async function fetchCollectionPlacesWithPosts(
  sql: ReturnType<typeof getDb>,
  query: CollectionQuery
): Promise<PlaceWithPosts[]> {
  const thirtyDaysAgo = Math.floor(
    (Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000
  );

  if (query.type === "name_or_post_contains") {
    const term = `%${query.term}%`;
    const rows = await sql`
      SELECT r.id, r.name, r.category, r.address, r.google_rating,
        COUNT(DISTINCT pr.post_id)::int as mention_count,
        json_agg(json_build_object(
          'id', rp.id, 'title', rp.title, 'subreddit', rp.subreddit,
          'score', rp.score, 'num_comments', rp.num_comments,
          'permalink', rp.permalink, 'sentiment', pr.sentiment,
          'created_utc', rp.created_utc
        ) ORDER BY rp.created_utc DESC) as posts
      FROM restaurants r
      JOIN post_restaurants pr ON pr.restaurant_id = r.id
      JOIN reddit_posts rp ON rp.id = pr.post_id
      WHERE r.name ILIKE ${term} OR rp.title ILIKE ${term}
      GROUP BY r.id, r.name, r.category, r.address, r.google_rating
      ORDER BY mention_count DESC
      LIMIT 200
    `;
    return rows as PlaceWithPosts[];
  }

  if (query.type === "category") {
    const rows = await sql`
      SELECT r.id, r.name, r.category, r.address, r.google_rating,
        COUNT(DISTINCT pr.post_id)::int as mention_count,
        json_agg(json_build_object(
          'id', rp.id, 'title', rp.title, 'subreddit', rp.subreddit,
          'score', rp.score, 'num_comments', rp.num_comments,
          'permalink', rp.permalink, 'sentiment', pr.sentiment,
          'created_utc', rp.created_utc
        ) ORDER BY rp.created_utc DESC) as posts
      FROM restaurants r
      LEFT JOIN post_restaurants pr ON pr.restaurant_id = r.id
      LEFT JOIN reddit_posts rp ON rp.id = pr.post_id
      WHERE r.category = ${query.category}
      GROUP BY r.id, r.name, r.category, r.address, r.google_rating
      ORDER BY mention_count DESC
      LIMIT 200
    `;
    return rows as PlaceWithPosts[];
  }

  if (query.type === "category_and_post_contains") {
    const term = `%${query.term}%`;
    const rows = await sql`
      SELECT r.id, r.name, r.category, r.address, r.google_rating,
        COUNT(DISTINCT pr.post_id)::int as mention_count,
        json_agg(json_build_object(
          'id', rp.id, 'title', rp.title, 'subreddit', rp.subreddit,
          'score', rp.score, 'num_comments', rp.num_comments,
          'permalink', rp.permalink, 'sentiment', pr.sentiment,
          'created_utc', rp.created_utc
        ) ORDER BY rp.created_utc DESC) as posts
      FROM restaurants r
      JOIN post_restaurants pr ON pr.restaurant_id = r.id
      JOIN reddit_posts rp ON rp.id = pr.post_id
      WHERE r.category = ${query.category} AND rp.title ILIKE ${term}
      GROUP BY r.id, r.name, r.category, r.address, r.google_rating
      ORDER BY mention_count DESC
      LIMIT 200
    `;
    return rows as PlaceWithPosts[];
  }

  if (query.type === "recent") {
    const rows = await sql`
      SELECT r.id, r.name, r.category, r.address, r.google_rating,
        COUNT(DISTINCT pr.post_id)::int as mention_count,
        json_agg(json_build_object(
          'id', rp.id, 'title', rp.title, 'subreddit', rp.subreddit,
          'score', rp.score, 'num_comments', rp.num_comments,
          'permalink', rp.permalink, 'sentiment', pr.sentiment,
          'created_utc', rp.created_utc
        ) ORDER BY rp.created_utc DESC) as posts
      FROM restaurants r
      JOIN post_restaurants pr ON pr.restaurant_id = r.id
      JOIN reddit_posts rp ON rp.id = pr.post_id
      WHERE rp.created_utc > ${thirtyDaysAgo}
      GROUP BY r.id, r.name, r.category, r.address, r.google_rating
      ORDER BY MAX(rp.created_utc) DESC
      LIMIT 200
    `;
    return rows as PlaceWithPosts[];
  }

  if (query.type === "top_by_mention") {
    const rows = await sql`
      SELECT r.id, r.name, r.category, r.address, r.google_rating,
        COUNT(DISTINCT pr.post_id)::int as mention_count,
        json_agg(json_build_object(
          'id', rp.id, 'title', rp.title, 'subreddit', rp.subreddit,
          'score', rp.score, 'num_comments', rp.num_comments,
          'permalink', rp.permalink, 'sentiment', pr.sentiment,
          'created_utc', rp.created_utc
        ) ORDER BY rp.created_utc DESC) as posts
      FROM restaurants r
      LEFT JOIN post_restaurants pr ON pr.restaurant_id = r.id
      LEFT JOIN reddit_posts rp ON rp.id = pr.post_id
      GROUP BY r.id, r.name, r.category, r.address, r.google_rating
      ORDER BY mention_count DESC
      LIMIT ${Math.max(query.limit, 200)}
    `;
    return rows as PlaceWithPosts[];
  }

  return [];
}

const COLLECTION_PAGE_SIZE = 20;
type CollectionSort = "mentions" | "rating" | "alpha";
const COLLECTION_SORTS: { id: CollectionSort; label: string }[] = [
  { id: "mentions", label: "Most mentioned" },
  { id: "rating", label: "Top rated" },
  { id: "alpha", label: "A–Z" },
];

// Editorial issue numbers — purely cosmetic, lookup by collection id.
const COLLECTIONS_INDEX: Record<string, string> = Object.fromEntries(
  COLLECTIONS.map((c, i) => [c.id, String(i + 1).padStart(2, "0")])
);

export default async function CollectionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const collection = getCollectionById(id);
  if (!collection) notFound();

  const rawSort = Array.isArray(sp.sort) ? sp.sort[0] : sp.sort;
  const sort: CollectionSort = (["mentions", "rating", "alpha"] as const).includes(
    rawSort as CollectionSort
  )
    ? (rawSort as CollectionSort)
    : "mentions";
  const rawPage = Array.isArray(sp.page) ? sp.page[0] : sp.page;
  const page = Math.max(1, parseInt(rawPage || "1", 10) || 1);

  const sql = getDb();
  const allPlaces = await fetchCollectionPlacesWithPosts(sql, collection.query);

  const sorted = [...allPlaces].sort((a, b) => {
    if (sort === "rating") {
      const ra = a.google_rating ?? -1;
      const rb = b.google_rating ?? -1;
      if (rb !== ra) return rb - ra;
      return b.mention_count - a.mention_count;
    }
    if (sort === "alpha") return a.name.localeCompare(b.name);
    return b.mention_count - a.mention_count;
  });

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / COLLECTION_PAGE_SIZE));
  const offset = (page - 1) * COLLECTION_PAGE_SIZE;
  const places = sorted.slice(offset, offset + COLLECTION_PAGE_SIZE);

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
    name: collection.title,
    description: collection.description,
    url: `${SITE_URL}/collections/${collection.id}`,
    numberOfItems: total,
    itemListElement: sorted.slice(0, 50).map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/place/${encodeURIComponent(p.name)}`,
      name: p.name,
    })),
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Map", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Collections", item: `${SITE_URL}/collections` },
      {
        "@type": "ListItem",
        position: 3,
        name: collection.title,
        item: `${SITE_URL}/collections/${collection.id}`,
      },
    ],
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <JsonLd data={itemListLd} />
      <JsonLd data={breadcrumbLd} />

      <TopBar back="/collections" backLabel="Collections" title={collection.title} />

      {/* Editorial header */}
      <header className="pt-14 md:pt-16">
        <div className="max-w-3xl mx-auto px-6 md:px-10 pt-12 pb-10 text-center">
          <p
            className="eyebrow mb-3"
            style={{ color: "var(--brand)" }}
          >
            The Edit · No. {COLLECTIONS_INDEX[id] ?? "01"}
          </p>
          <h1
            className="font-display text-5xl md:text-6xl lg:text-7xl"
            style={{ color: "var(--fg)", fontWeight: 500, lineHeight: 1.0 }}
          >
            {collection.title}
          </h1>
          <p
            className="caption mt-5 max-w-xl mx-auto text-lg"
            style={{ color: "var(--fg-muted)" }}
          >
            {collection.description}
          </p>
          <div className="flex items-baseline justify-center gap-5 mt-8">
            <span className="dateline">
              {total} {total === 1 ? "place" : "places"}
            </span>
            <span className="dateline">·</span>
            <span className="dateline">
              {sorted.reduce((sum, p) => sum + p.mention_count, 0)} mentions
            </span>
            <span className="dateline">·</span>
            <Link
              href="/map"
              className="dateline hover:text-[color:var(--brand)] transition-colors"
            >
              On the map →
            </Link>
          </div>
        </div>
      </header>

      {/* Places list */}
      <article className="max-w-3xl mx-auto px-6 md:px-10 pb-24 page-enter">
        {total > 0 && (
          <div
            className="flex items-baseline gap-5 py-4"
            style={{ borderTop: "1px solid var(--fg)", borderBottom: "1px solid var(--fg)" }}
          >
            <p className="dateline">Sort by:</p>
            {COLLECTION_SORTS.map((s) => {
              const params = new URLSearchParams();
              if (s.id !== "mentions") params.set("sort", s.id);
              const href = params.toString() ? `?${params.toString()}` : "";
              const active = sort === s.id;
              return (
                <Link
                  key={s.id}
                  href={href}
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
        {total === 0 ? (
          <div className="text-center py-20">
            <h2
              className="font-display text-3xl md:text-4xl mb-3"
              style={{ color: "var(--fg)", fontWeight: 500 }}
            >
              No places yet.
            </h2>
            <p
              className="caption mb-8 max-w-sm mx-auto"
              style={{ color: "var(--fg-muted)" }}
            >
              Know a place that belongs here?
            </p>
            <Link
              href="/submit"
              className="font-display text-xl ink-underline"
              style={{ color: "var(--brand)", fontWeight: 500 }}
            >
              Submit one →
            </Link>
          </div>
        ) : (
          <div>
            {places.map((place, i) => {
              const posts = (place.posts ?? []).filter((p) => p.id !== null);
              const rank = offset + i + 1;
              return (
                <article
                  key={place.id}
                  className="py-8"
                  style={{ borderBottom: "1px solid var(--border)" }}
                >
                  <div className="flex items-baseline gap-6">
                    <span
                      className="font-display tabular-nums shrink-0"
                      style={{
                        color: "var(--fg-faint)",
                        fontSize: 36,
                        fontWeight: 400,
                        lineHeight: 1,
                        width: 56,
                      }}
                    >
                      {String(rank).padStart(2, "0")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p
                        className="eyebrow mb-1.5"
                        style={{ color: "var(--brand)" }}
                      >
                        {String(place.category).toUpperCase()}
                      </p>
                      <Link
                        href={`/place/${encodeURIComponent(place.name)}`}
                        className="font-display text-2xl md:text-3xl ink-underline inline"
                        style={{ color: "var(--fg)", fontWeight: 500, lineHeight: 1.1 }}
                      >
                        {place.name}
                      </Link>
                      {place.address && (
                        <p
                          className="caption mt-2"
                          style={{ color: "var(--fg-muted)" }}
                        >
                          {place.address}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <div
                        className="font-display text-2xl tabular-nums leading-none"
                        style={{ color: "var(--fg)", fontWeight: 500 }}
                      >
                        {place.mention_count}
                      </div>
                      <div className="dateline mt-1">
                        {place.mention_count === 1 ? "mention" : "mentions"}
                      </div>
                      {place.google_rating && (
                        <div className="dateline mt-0.5">
                          {place.google_rating.toFixed(1)}★
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mentions */}
                  {posts.length > 0 && (
                    <div className="mt-5 ml-[80px] space-y-3">
                      {posts.slice(0, 3).map((post) => {
                        return (
                          <a
                            key={post.id}
                            href={getPostHref(post.subreddit, post.permalink)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group flex items-baseline gap-3"
                          >
                            <span style={{ marginTop: 4 }}>
                              <SentimentDot sentiment={post.sentiment} />
                            </span>
                            <div className="flex-1 min-w-0">
                              <p
                                className="font-serif text-base leading-snug group-hover:text-[color:var(--brand)] transition-colors"
                                style={{ color: "var(--fg)" }}
                              >
                                {decodeHtmlEntities(post.title)}
                              </p>
                              <p className="dateline mt-1">
                                <PostSource subreddit={post.subreddit} /> ·{" "}
                                {post.score} pts · {formatDate(post.created_utc)}
                              </p>
                            </div>
                            <span
                              className="shrink-0"
                              style={{ color: "var(--fg-faint)" }}
                            >
                              <IconExternalLink size={14} />
                            </span>
                          </a>
                        );
                      })}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <nav
            aria-label="Pagination"
            className="mt-12 flex items-baseline justify-center gap-6 text-sm pt-6"
            style={{ borderTop: "1px solid var(--fg)" }}
          >
            <Link
              href={page > 1 ? qs({ page: page - 1 }) : "#"}
              aria-disabled={page === 1}
              className="font-display text-lg ink-underline transition-colors"
              style={{
                color: page === 1 ? "var(--fg-faint)" : "var(--fg)",
                pointerEvents: page === 1 ? "none" : undefined,
                fontWeight: 500,
              }}
            >
              ← Previous
            </Link>
            <span className="dateline">
              Page {page} of {totalPages}
            </span>
            <Link
              href={page < totalPages ? qs({ page: page + 1 }) : "#"}
              aria-disabled={page === totalPages}
              className="font-display text-lg ink-underline transition-colors"
              style={{
                color: page === totalPages ? "var(--fg-faint)" : "var(--fg)",
                pointerEvents: page === totalPages ? "none" : undefined,
                fontWeight: 500,
              }}
            >
              Next →
            </Link>
          </nav>
        )}
      </article>
    </div>
  );
}
