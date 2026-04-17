import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import {
  NEIGHBOURHOODS,
  getNeighbourhoodBySlug,
  neighbourhoodSlug,
} from "@/lib/neighbourhoods";
import type { PlaceCategory } from "@/lib/types";
import TopBar from "@/components/ui/TopBar";
import BackLink from "@/components/ui/BackLink";
import PlaceCard from "@/components/ui/PlaceCard";
import JsonLd from "@/components/JsonLd";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export const revalidate = 600;

export async function generateStaticParams() {
  return NEIGHBOURHOODS.map((n) => ({ slug: neighbourhoodSlug(n.name) }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const n = getNeighbourhoodBySlug(slug);
  if (!n) return { title: `Neighbourhood — ${SITE_NAME}` };
  const title = `${n.name} — ${SITE_NAME} Toronto`;
  const canonical = `${SITE_URL}/neighbourhood/${slug}`;
  const description = `${n.name} guide — Toronto places locals love, sourced from Reddit and the local press.`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

interface Row {
  id: number;
  name: string;
  category: PlaceCategory;
  address: string | null;
  photo_url: string | null;
  google_rating: number | null;
  mention_count: number;
  latest_mention: number;
  preview_title: string | null;
  preview_subreddit: string | null;
  preview_score: number | null;
  preview_created_utc: number | null;
}

function toCardData(r: Row) {
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
  };
}

function categoryCounts(rows: Row[]): Array<[PlaceCategory, number]> {
  const map = new Map<PlaceCategory, number>();
  for (const r of rows) map.set(r.category, (map.get(r.category) ?? 0) + 1);
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}

export default async function NeighbourhoodPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const n = getNeighbourhoodBySlug(slug);
  if (!n) notFound();

  let places: Row[] = [];
  try {
    const sql = getDb();
    places = (await sql`
      SELECT r.id, r.name, r.category, r.address, r.photo_url, r.google_rating,
        COALESCE(
          (SELECT COUNT(*)::int FROM post_restaurants WHERE restaurant_id = r.id),
          0
        ) as mention_count,
        COALESCE(
          (SELECT MAX(rp.created_utc)::bigint
           FROM post_restaurants pr
           JOIN reddit_posts rp ON rp.id = pr.post_id
           WHERE pr.restaurant_id = r.id),
          0
        ) as latest_mention,
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
      WHERE r.lat >= ${n.minLat} AND r.lat <= ${n.maxLat}
        AND r.lng >= ${n.minLng} AND r.lng <= ${n.maxLng}
        AND r.category != 'event'
      ORDER BY mention_count DESC NULLS LAST, latest_mention DESC
      LIMIT 50
    `) as Row[];
  } catch (err) {
    console.error("[neighbourhood] query failed:", err);
  }

  const byCategory = categoryCounts(places);
  const featured = places.filter((p) => p.photo_url).slice(0, 3);
  const featuredIds = new Set(featured.map((f) => f.id));
  const ranked = places.filter((p) => !featuredIds.has(p.id)).slice(0, 30);

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${n.name} — ${SITE_NAME} Toronto`,
    url: `${SITE_URL}/neighbourhood/${slug}`,
    numberOfItems: places.length,
    itemListElement: places.slice(0, 25).map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: p.name,
      url: `${SITE_URL}/place/${encodeURIComponent(p.name)}`,
    })),
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <JsonLd data={itemListLd} />
      <TopBar title={n.name} back="/neighbourhoods" backLabel="Atlas" />

      <article className="pt-14 md:pt-16 pb-24 max-w-5xl mx-auto px-6 md:px-10 page-enter">
        <div className="hidden md:block pt-6">
          <BackLink href="/neighbourhoods" label="Atlas" />
        </div>
        <header
          className="text-center pt-10 pb-8 mb-12"
          style={{ borderBottom: "1px solid var(--fg)" }}
        >
          <p className="eyebrow mb-3" style={{ color: "var(--brand)" }}>
            Neighbourhood Guide
          </p>
          <h1
            className="font-display text-5xl sm:text-6xl md:text-7xl"
            style={{ color: "var(--fg)", fontWeight: 500, lineHeight: 1 }}
          >
            {n.name}.
          </h1>
          <p className="dateline mt-6">
            {places.length}{" "}
            {places.length === 1 ? "place catalogued" : "places catalogued"}
          </p>
          {byCategory.length > 0 && (
            <div className="flex flex-wrap justify-center gap-x-5 gap-y-1 mt-3">
              {byCategory.slice(0, 6).map(([cat, count]) => (
                <span
                  key={cat}
                  className="font-serif italic text-sm"
                  style={{ color: "var(--fg-muted)" }}
                >
                  {count} {cat}
                  {count !== 1 && !cat.endsWith("s") ? "s" : ""}
                </span>
              ))}
            </div>
          )}
        </header>

        {places.length === 0 ? (
          <div className="text-center py-20">
            <h2
              className="font-display text-3xl md:text-4xl mb-3"
              style={{ color: "var(--fg)", fontWeight: 500 }}
            >
              Nothing here yet.
            </h2>
            <p
              className="caption mb-8 max-w-sm mx-auto"
              style={{ color: "var(--fg-muted)" }}
            >
              We haven't catalogued any places in {n.name} yet. If you know one,
              submit it.
            </p>
            <Link
              href="/submit"
              className="font-display text-xl ink-underline"
              style={{ color: "var(--brand)", fontWeight: 500 }}
            >
              Submit a place →
            </Link>
          </div>
        ) : (
          <>
            {/* Featured row — up to 3 big editorial cards */}
            {featured.length > 0 && (
              <section className="mb-16">
                <p className="eyebrow mb-4">The Standouts</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-12">
                  {featured.map((p, i) => (
                    <PlaceCard
                      key={p.id}
                      place={toCardData(p)}
                      variant="story"
                      stagger={i}
                      href={`/place/${encodeURIComponent(p.name)}?from=${encodeURIComponent(`/neighbourhood/${slug}`)}`}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* The rest — ranked list */}
            {ranked.length > 0 && (
              <section>
                <div
                  className="flex items-baseline justify-between pb-3 mb-2"
                  style={{ borderBottom: "1px solid var(--fg)" }}
                >
                  <h2
                    className="font-display text-2xl md:text-3xl"
                    style={{ color: "var(--fg)", fontWeight: 500 }}
                  >
                    The Index
                  </h2>
                  <p className="dateline">By mentions</p>
                </div>
                <div>
                  {ranked.map((p, i) => (
                    <PlaceCard
                      key={p.id}
                      place={toCardData(p)}
                      variant="rank"
                      rank={featured.length + i + 1}
                      stagger={i}
                      href={`/place/${encodeURIComponent(p.name)}?from=${encodeURIComponent(`/neighbourhood/${slug}`)}`}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Other neighbourhoods */}
        <section
          className="mt-16 pt-8"
          style={{ borderTop: "1px solid var(--fg)" }}
        >
          <p className="eyebrow mb-5">Explore other neighbourhoods</p>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {NEIGHBOURHOODS.filter((x) => x.name !== n.name)
              .slice(0, 24)
              .map((x) => (
                <Link
                  key={x.name}
                  href={`/neighbourhood/${neighbourhoodSlug(x.name)}`}
                  className="font-serif text-base ink-underline"
                  style={{ color: "var(--fg)" }}
                >
                  {x.name}
                </Link>
              ))}
          </div>
        </section>
      </article>
    </div>
  );
}
