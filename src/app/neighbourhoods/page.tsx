import type { Metadata } from "next";
import Link from "next/link";
import { getDb } from "@/lib/db";
import { NEIGHBOURHOODS, neighbourhoodSlug } from "@/lib/neighbourhoods";
import TopBar from "@/components/ui/TopBar";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Neighbourhoods — ${SITE_NAME} Toronto`,
  description:
    "Every Toronto neighbourhood we've catalogued — Kensington Market, The Annex, Leslieville, Parkdale, The Danforth, and more — ranked by buzz.",
  alternates: { canonical: `${SITE_URL}/neighbourhoods` },
  openGraph: {
    title: `Neighbourhoods — ${SITE_NAME} Toronto`,
    description: "Toronto neighbourhoods, catalogued.",
    url: `${SITE_URL}/neighbourhoods`,
    type: "website",
  },
};

interface HoodCount {
  neighbourhood: string;
  slug: string;
  count: number;
}

async function fetchCounts(): Promise<HoodCount[]> {
  try {
    const sql = getDb();
    // Pull minimal lat/lng per place, bucket on the server — simpler than
    // building a PostGIS index just for this. With ~few thousand places
    // across ~60 neighbourhoods this is still cheap.
    const rows = (await sql`
      SELECT r.id, r.lat, r.lng,
        (SELECT COUNT(*)::int FROM post_restaurants WHERE restaurant_id = r.id) as mentions
      FROM restaurants r
      WHERE r.category != 'event'
    `) as { id: number; lat: number; lng: number; mentions: number }[];

    const counts = new Map<string, number>();
    for (const r of rows) {
      for (const n of NEIGHBOURHOODS) {
        if (
          r.lat >= n.minLat &&
          r.lat <= n.maxLat &&
          r.lng >= n.minLng &&
          r.lng <= n.maxLng
        ) {
          counts.set(n.name, (counts.get(n.name) ?? 0) + 1);
          break;
        }
      }
    }
    return NEIGHBOURHOODS.map((n) => ({
      neighbourhood: n.name,
      slug: neighbourhoodSlug(n.name),
      count: counts.get(n.name) ?? 0,
    })).sort((a, b) => b.count - a.count);
  } catch (err) {
    console.error("[neighbourhoods] counts query failed:", err);
    return NEIGHBOURHOODS.map((n) => ({
      neighbourhood: n.name,
      slug: neighbourhoodSlug(n.name),
      count: 0,
    }));
  }
}

export default async function NeighbourhoodsPage() {
  const hoods = await fetchCounts();
  const total = hoods.reduce((acc, h) => acc + h.count, 0);

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <TopBar title="Neighbourhoods" />

      <article className="pt-14 md:pt-16 pb-24 max-w-4xl mx-auto px-6 md:px-10 page-enter">
        <header
          className="text-center pt-10 pb-8 mb-12"
          style={{ borderBottom: "1px solid var(--fg)" }}
        >
          <p className="eyebrow mb-3" style={{ color: "var(--brand)" }}>
            Atlas
          </p>
          <h1
            className="font-display text-5xl md:text-6xl"
            style={{ color: "var(--fg)", fontWeight: 500, lineHeight: 1 }}
          >
            Every Toronto neighbourhood.
          </h1>
          <p
            className="caption mt-4 max-w-md mx-auto"
            style={{ color: "var(--fg-muted)" }}
          >
            {hoods.length} neighbourhoods · {total.toLocaleString()} places.
          </p>
        </header>

        <ol>
          {hoods.map((h, i) => (
            <li
              key={h.slug}
              className="flex items-baseline gap-5 py-4"
              style={{ borderBottom: "1px solid var(--border)" }}
            >
              <span
                className="font-display tabular-nums shrink-0 w-12"
                style={{
                  color: "var(--fg-faint)",
                  fontSize: 24,
                  fontWeight: 400,
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <Link
                href={`/neighbourhood/${h.slug}`}
                className="flex-1 min-w-0 group"
              >
                <h2
                  className="font-display text-xl md:text-2xl group-hover:text-[color:var(--brand)] transition-colors"
                  style={{ color: "var(--fg)", fontWeight: 500 }}
                >
                  {h.neighbourhood}
                </h2>
              </Link>
              <span
                className="font-display tabular-nums shrink-0"
                style={{ color: "var(--fg)", fontWeight: 500, fontSize: 18 }}
              >
                {h.count}
              </span>
              <span className="dateline shrink-0 w-16 text-right">
                {h.count === 1 ? "place" : "places"}
              </span>
            </li>
          ))}
        </ol>
      </article>
    </div>
  );
}
