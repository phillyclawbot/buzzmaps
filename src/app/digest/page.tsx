import { Suspense } from "react";
import { getDb } from "@/lib/db";
import DigestSubscribeForm from "@/components/DigestSubscribeForm";
import TopBar from "@/components/ui/TopBar";
import PlaceCard from "@/components/ui/PlaceCard";
import type { PlaceCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

interface TopPlace {
  id: number;
  name: string;
  address: string;
  category: PlaceCategory;
  mention_count: number;
  google_rating: number | null;
  photo_url: string | null;
}

interface NewPlace {
  id: number;
  name: string;
  address: string;
  category: PlaceCategory;
  mention_count: number;
  first_seen_at: string | null;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" });
}

function issueNumber(d: Date): string {
  // Simple ISO-week-based issue number
  const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const days = Math.floor((d.getTime() - start.getTime()) / 86400000);
  const week = Math.ceil((days + start.getUTCDay() + 1) / 7);
  return `Vol. 1 · No. ${week}`;
}

const now = new Date();
const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

export default async function DispatchPage() {
  let topPlaces: TopPlace[] = [];
  let newPlaces: NewPlace[] = [];

  try {
    const sql = getDb();
    const weekAgoEpoch = Math.floor(weekAgo.getTime() / 1000);

    const [topPlacesRaw, newPlacesRaw] = await Promise.all([
      sql`
        SELECT
          r.id, r.name, r.address, r.category, r.google_rating, r.photo_url,
          COUNT(DISTINCT pr.post_id)::int as mention_count
        FROM restaurants r
        JOIN post_restaurants pr ON pr.restaurant_id = r.id
        JOIN reddit_posts rp ON rp.id = pr.post_id
        WHERE rp.created_utc > ${weekAgoEpoch}
        GROUP BY r.id
        ORDER BY mention_count DESC
        LIMIT 5
      `,
      sql`
        SELECT id, name, address, category, first_seen_at,
          (SELECT COUNT(*)::int FROM post_restaurants WHERE restaurant_id = r.id) as mention_count
        FROM restaurants r
        WHERE first_seen_at > ${weekAgo.toISOString()}
        ORDER BY first_seen_at DESC
        LIMIT 6
      `,
    ]);

    topPlaces = topPlacesRaw as TopPlace[];
    newPlaces = newPlacesRaw as NewPlace[];
  } catch (err) {
    console.error("[dispatch] failed to load:", err);
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <TopBar title="Dispatch" />

      <article className="pt-14 md:pt-16 pb-24 max-w-3xl mx-auto px-6 md:px-10 page-enter">
        {/* Masthead */}
        <header
          className="text-center pt-12 pb-8 mb-12"
          style={{ borderBottom: "1px solid var(--fg)" }}
        >
          <div
            className="flex items-baseline justify-between mb-8 pb-3"
            style={{ borderBottom: "1px solid var(--fg)" }}
          >
            <p className="dateline">{formatDate(weekAgo)} – {formatDate(now)}</p>
            <p className="dateline hidden sm:block">{issueNumber(now)}</p>
          </div>
          <p className="eyebrow mb-4" style={{ color: "var(--brand)" }}>
            The Weekly Dispatch
          </p>
          <h1
            className="font-display text-5xl sm:text-6xl md:text-7xl"
            style={{ color: "var(--fg)", fontWeight: 500, lineHeight: 1 }}
          >
            What Toronto's been talking about.
          </h1>
          <p
            className="caption mt-6 max-w-md mx-auto"
            style={{ color: "var(--fg-muted)" }}
          >
            Every Monday, the city's most-mentioned places — pulled from Reddit
            and the local press, ranked by buzz, delivered to your inbox.
          </p>
        </header>

        {/* This week's most mentioned */}
        <section className="mb-16">
          <div
            className="flex items-baseline justify-between pb-3 mb-6"
            style={{ borderBottom: "1px solid var(--fg)" }}
          >
            <h2
              className="font-display text-3xl"
              style={{ color: "var(--fg)", fontWeight: 500 }}
            >
              This Week's Top Five
            </h2>
            <p className="dateline">By mentions</p>
          </div>
          {topPlaces.length === 0 ? (
            <p
              className="caption text-center py-12"
              style={{ color: "var(--fg-muted)" }}
            >
              A quiet week. Check back Monday.
            </p>
          ) : (
            <div>
              {topPlaces.map((place, i) => (
                <PlaceCard
                  key={place.id}
                  place={place}
                  variant="rank"
                  rank={i + 1}
                  stagger={i}
                />
              ))}
            </div>
          )}
        </section>

        {/* Newly added */}
        {newPlaces.length > 0 && (
          <section className="mb-16">
            <div
              className="flex items-baseline justify-between pb-3 mb-6"
              style={{ borderBottom: "1px solid var(--fg)" }}
            >
              <h2
                className="font-display text-3xl"
                style={{ color: "var(--fg)", fontWeight: 500 }}
              >
                Newly Catalogued
              </h2>
              <p className="dateline">First seen this week</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
              {newPlaces.map((p, i) => (
                <a
                  key={p.id}
                  href={`/place/${encodeURIComponent(p.name)}`}
                  className="group block py-3"
                  style={{ borderTop: "1px solid var(--border)" }}
                >
                  <p
                    className="eyebrow"
                    style={{ color: "var(--brand)" }}
                  >
                    {p.category}
                  </p>
                  <h3
                    className="font-display text-xl mt-1 group-hover:text-[color:var(--brand)] transition-colors"
                    style={{ color: "var(--fg)", fontWeight: 500 }}
                  >
                    {p.name}
                  </h3>
                  {p.address && (
                    <p
                      className="caption mt-1 truncate"
                      style={{ color: "var(--fg-muted)" }}
                    >
                      {p.address}
                    </p>
                  )}
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Subscribe */}
        <section
          className="mt-20 text-center py-12 px-6"
          style={{ borderTop: "1px solid var(--fg)", borderBottom: "1px solid var(--fg)" }}
        >
          <p className="eyebrow mb-3" style={{ color: "var(--brand)" }}>
            Get it in your inbox
          </p>
          <h2
            className="font-display text-4xl md:text-5xl mb-3"
            style={{ color: "var(--fg)", fontWeight: 500, lineHeight: 1.05 }}
          >
            Subscribe to the Dispatch.
          </h2>
          <p
            className="caption mb-8 max-w-sm mx-auto"
            style={{ color: "var(--fg-muted)" }}
          >
            One email a week. Mondays. Easy to unsubscribe.
          </p>
          <Suspense
            fallback={
              <div
                className="max-w-sm mx-auto h-12 rounded animate-pulse"
                style={{ background: "var(--bg-sunken)" }}
              />
            }
          >
            <DigestSubscribeForm />
          </Suspense>
        </section>

        {/* Colophon */}
        <footer className="mt-16 pt-8 text-center" style={{ borderTop: "1px solid var(--border)" }}>
          <p className="dateline">
            BuzzMaps · Toronto · Sourced from Reddit, BlogTO, Toronto Life, NOW & Eater
          </p>
        </footer>
      </article>
    </div>
  );
}
