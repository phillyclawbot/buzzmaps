import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import Link from "next/link";
import type { PlaceCategory } from "@/lib/types";
import type { CollectionPlaceRow } from "@/lib/types";
import CollectionCard from "@/components/CollectionCard";
import JsonLd from "@/components/JsonLd";
import TopBar from "@/components/ui/TopBar";
import { COLLECTIONS } from "@/lib/collections";
import type { CollectionQuery } from "@/lib/collections";
import { IconGrid } from "@/lib/icons";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Collections — ${SITE_NAME} Toronto`,
  description:
    "Curated lists of Toronto's best places — buzzing now, coffee, bars, parks, Kensington Market, the Danforth, Chinatown and more.",
  alternates: { canonical: `${SITE_URL}/collections` },
  openGraph: {
    title: `Collections — ${SITE_NAME} Toronto`,
    description:
      "Curated lists of Toronto's best places, powered by Reddit and local blogs.",
    url: `${SITE_URL}/collections`,
    type: "website",
  },
};

async function fetchCollectionPlaces(
  sql: ReturnType<typeof getDb>,
  query: CollectionQuery
): Promise<CollectionPlaceRow[]> {
  const thirtyDaysAgo = Math.floor(
    (Date.now() - 30 * 24 * 60 * 60 * 1000) / 1000
  );

  if (query.type === "name_or_post_contains") {
    const term = `%${query.term}%`;
    const rows = await sql`
      SELECT DISTINCT r.id, r.name, r.category, COUNT(DISTINCT pr.post_id)::int as mention_count, r.google_rating
      FROM restaurants r
      JOIN post_restaurants pr ON pr.restaurant_id = r.id
      JOIN reddit_posts rp ON rp.id = pr.post_id
      WHERE r.name ILIKE ${term} OR rp.title ILIKE ${term}
      GROUP BY r.id, r.name, r.category, r.google_rating
      ORDER BY mention_count DESC
      LIMIT 20
    `;
    return rows as CollectionPlaceRow[];
  }

  if (query.type === "category") {
    const rows = await sql`
      SELECT r.id, r.name, r.category, COUNT(DISTINCT pr.post_id)::int as mention_count, r.google_rating
      FROM restaurants r
      LEFT JOIN post_restaurants pr ON pr.restaurant_id = r.id
      WHERE r.category = ${query.category}
      GROUP BY r.id, r.name, r.category, r.google_rating
      ORDER BY mention_count DESC
      LIMIT 20
    `;
    return rows as CollectionPlaceRow[];
  }

  if (query.type === "category_and_post_contains") {
    const term = `%${query.term}%`;
    const rows = await sql`
      SELECT DISTINCT r.id, r.name, r.category, COUNT(DISTINCT pr.post_id)::int as mention_count, r.google_rating
      FROM restaurants r
      JOIN post_restaurants pr ON pr.restaurant_id = r.id
      JOIN reddit_posts rp ON rp.id = pr.post_id
      WHERE r.category = ${query.category} AND rp.title ILIKE ${term}
      GROUP BY r.id, r.name, r.category, r.google_rating
      ORDER BY mention_count DESC
      LIMIT 20
    `;
    return rows as CollectionPlaceRow[];
  }

  if (query.type === "recent") {
    const rows = await sql`
      SELECT r.id, r.name, r.category, COUNT(DISTINCT pr.post_id)::int as mention_count, r.google_rating
      FROM restaurants r
      JOIN post_restaurants pr ON pr.restaurant_id = r.id
      JOIN reddit_posts rp ON rp.id = pr.post_id
      WHERE rp.created_utc > ${thirtyDaysAgo}
      GROUP BY r.id, r.name, r.category, r.google_rating
      ORDER BY MAX(rp.created_utc) DESC
      LIMIT 20
    `;
    return rows as CollectionPlaceRow[];
  }

  if (query.type === "top_by_mention") {
    const rows = await sql`
      SELECT r.id, r.name, r.category, COUNT(DISTINCT pr.post_id)::int as mention_count, r.google_rating
      FROM restaurants r
      LEFT JOIN post_restaurants pr ON pr.restaurant_id = r.id
      GROUP BY r.id, r.name, r.category, r.google_rating
      ORDER BY mention_count DESC
      LIMIT ${query.limit}
    `;
    return rows as CollectionPlaceRow[];
  }

  return [];
}

export default async function CollectionsPage() {
  const sql = getDb();

  const collectionsWithData = await Promise.all(
    COLLECTIONS.map(async (col) => {
      const places = await fetchCollectionPlaces(sql, col.query);
      return { ...col, places };
    })
  );

  const collectionsLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Collections — ${SITE_NAME} Toronto`,
    url: `${SITE_URL}/collections`,
    hasPart: collectionsWithData.map((c) => ({
      "@type": "ItemList",
      name: c.title,
      description: c.description,
      url: `${SITE_URL}/collections/${c.id}`,
      numberOfItems: c.places.length,
    })),
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <JsonLd data={collectionsLd} />
      <TopBar title="Collections" />

      <article className="pt-14 md:pt-16 max-w-5xl mx-auto px-6 md:px-10 py-12 pb-24 page-enter">
        <header
          className="text-center pt-8 pb-8 mb-12"
          style={{ borderBottom: "1px solid var(--fg)" }}
        >
          <p className="eyebrow mb-3" style={{ color: "var(--brand)" }}>
            The Edit
          </p>
          <h1
            className="font-display text-5xl md:text-6xl"
            style={{ color: "var(--fg)", fontWeight: 500, lineHeight: 1 }}
          >
            Collections
          </h1>
          <p
            className="caption mt-4 max-w-md mx-auto"
            style={{ color: "var(--fg-muted)" }}
          >
            Curated lists of Toronto&apos;s best places, ranked by what locals are
            actually mentioning.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-10">
          {collectionsWithData.map((col, i) => (
            <CollectionCard
              key={col.id}
              id={col.id}
              title={col.title}
              description={col.description}
              places={col.places}
              index={i}
            />
          ))}
        </div>
      </article>
    </div>
  );
}
