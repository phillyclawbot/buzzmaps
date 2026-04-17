import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import type { PlaceCategory } from "@/lib/types";
import Link from "next/link";
import { notFound } from "next/navigation";
import PlaceMapWrapper from "@/components/PlaceMapWrapper";
import ShareButton from "@/app/place/ShareButton";
import CheckinButton from "@/components/CheckinButton";
import ReportButton from "@/components/ReportButton";
import SaveButton from "@/components/SaveButton";
import JsonLd from "@/components/JsonLd";
import PostFilterList from "@/components/PostFilterList";
import TopBar from "@/components/ui/TopBar";
import BackLink from "@/components/ui/BackLink";
import PlaceCard from "@/components/ui/PlaceCard";
import { SENTIMENT_COLORS, SENTIMENT_LABELS } from "@/lib/constants";
import { decodeHtmlEntities, getPostHref } from "@/lib/post-source";
import { haversineDistance } from "@/lib/utils";
import { getNeighbourhood, neighbourhoodSlug } from "@/lib/neighbourhoods";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { getSession } from "@/lib/auth";
import { isSavedStatus, type SavedStatus } from "@/lib/saved-status";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>;
}): Promise<Metadata> {
  const { name } = await params;
  const decoded = decodeURIComponent(name);
  const sql = getDb();
  const rows = (await sql`
    SELECT r.name, r.address, r.category, r.cuisine_type, r.photo_url,
           COUNT(DISTINCT pr.post_id)::int AS mention_count
    FROM restaurants r
    LEFT JOIN post_restaurants pr ON pr.restaurant_id = r.id
    WHERE r.name ILIKE ${decoded}
    GROUP BY r.id
    LIMIT 1
  `) as {
    name: string;
    address: string | null;
    category: string | null;
    cuisine_type: string | null;
    photo_url: string | null;
    mention_count: number;
  }[];

  if (!rows.length) {
    return { title: `Place not found — ${SITE_NAME}` };
  }

  const place = rows[0];
  const title = `${place.name} — ${SITE_NAME} Toronto`;
  const description = place.address
    ? `${place.name} at ${place.address} — ${place.mention_count} Toronto mentions on Reddit and the local press.`
    : `${place.name} — ${place.mention_count} Toronto mentions on Reddit and the local press.`;
  const canonical = `${SITE_URL}/place/${encodeURIComponent(place.name)}`;
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "article",
      images: place.photo_url ? [place.photo_url] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: place.photo_url ? [place.photo_url] : undefined,
    },
  };
}

// Origin-aware back: callers can pass `?from=/some/path` (URL-encoded).
// Falls back to `/` for direct loads. Whitelist allows only same-origin
// paths so we don't bounce to an arbitrary URL.
function resolveBack(rawFrom: string | string[] | undefined): {
  href: string;
  label: string;
} {
  const from = Array.isArray(rawFrom) ? rawFrom[0] : rawFrom;
  if (typeof from !== "string" || !from.startsWith("/") || from.startsWith("//")) {
    return { href: "/", label: "Map" };
  }
  if (from.startsWith("/collections/")) return { href: from, label: "Collection" };
  if (from.startsWith("/collections")) return { href: "/collections", label: "Collections" };
  if (from.startsWith("/category/")) return { href: from, label: "Category" };
  if (from.startsWith("/neighbourhood/")) return { href: from, label: "Neighbourhood" };
  if (from.startsWith("/neighbourhoods")) return { href: "/neighbourhoods", label: "Atlas" };
  if (from.startsWith("/search")) return { href: from, label: "Search" };
  if (from.startsWith("/events")) return { href: "/events", label: "Events" };
  if (from === "/") return { href: "/", label: "Feed" };
  return { href: from, label: "Back" };
}

export default async function PlacePage({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { name } = await params;
  const sp = await searchParams;
  const back = resolveBack(sp.from);
  const decodedName = decodeURIComponent(name);
  const sql = getDb();

  const rows = await sql`
    SELECT
      r.id, r.name, r.place_id, r.address, r.lat, r.lng,
      r.google_rating, r.google_reviews_count, r.cuisine_type, r.price_level,
      r.photo_url, r.category, r.metadata,
      COUNT(DISTINCT pr.post_id) as mention_count,
      COALESCE(json_agg(json_build_object(
        'id', rp.id,
        'title', rp.title,
        'subreddit', rp.subreddit,
        'score', rp.score,
        'num_comments', rp.num_comments,
        'permalink', rp.permalink,
        'sentiment', pr.sentiment,
        'created_utc', rp.created_utc
      ) ORDER BY rp.created_utc DESC) FILTER (WHERE rp.id IS NOT NULL), '[]'::json) as posts
    FROM restaurants r
    LEFT JOIN post_restaurants pr ON pr.restaurant_id = r.id
    LEFT JOIN reddit_posts rp ON rp.id = pr.post_id
    WHERE r.name ILIKE ${decodedName}
    GROUP BY r.id
    LIMIT 1
  `;

  if (!rows.length) notFound();

  const place = rows[0] as {
    id: number;
    name: string;
    address: string;
    lat: number;
    lng: number;
    google_rating: number | null;
    google_reviews_count: number | null;
    cuisine_type: string | null;
    price_level: number | null;
    photo_url: string | null;
    category: PlaceCategory;
    metadata: Record<string, string | undefined> | null;
    mention_count: number;
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
  };

  // Nearby places
  const nearby = (await sql`
    SELECT r.id, r.name, r.category, r.address, r.google_rating, r.photo_url, r.lat, r.lng,
           COUNT(DISTINCT pr.post_id)::int as mention_count
    FROM restaurants r
    LEFT JOIN post_restaurants pr ON pr.restaurant_id = r.id
    WHERE ABS(r.lat - ${place.lat}) < 0.01
      AND ABS(r.lng - ${place.lng}) < 0.01
      AND r.name != ${place.name}
    GROUP BY r.id
    ORDER BY mention_count DESC
    LIMIT 6
  `) as {
    id: number;
    name: string;
    category: PlaceCategory;
    address: string | null;
    google_rating: number | null;
    photo_url: string | null;
    lat: number;
    lng: number;
    mention_count: number;
  }[];

  const posts = place.posts ?? [];

  // Month timeline
  const monthGroups = posts.reduce((acc, post) => {
    const d = new Date(post.created_utc * 1000);
    const key = d.toLocaleDateString("en-CA", { year: "numeric", month: "long" });
    if (!acc[key]) acc[key] = [];
    acc[key].push(post);
    return acc;
  }, {} as Record<string, typeof posts>);
  const sortedMonths = Object.entries(monthGroups).sort(([a], [b]) => {
    return new Date(a).getTime() - new Date(b).getTime();
  });
  const maxMonthCount = Math.max(...sortedMonths.map(([, ps]) => ps.length), 1);

  const sentimentCounts = posts.reduce(
    (acc, p) => {
      const s = p.sentiment in acc ? p.sentiment : "neutral";
      acc[s as keyof typeof acc]++;
      return acc;
    },
    { positive: 0, neutral: 0, negative: 0 }
  );

  // Viewer session for saved-places state.
  const session = await getSession();
  let initialStatus: SavedStatus | null = null;
  if (session) {
    const savedRows = (await sql`
      SELECT status FROM saved_places
      WHERE user_id = ${session.id} AND restaurant_id = ${place.id}
      LIMIT 1
    `) as { status: string }[];
    if (savedRows.length > 0) {
      initialStatus = isSavedStatus(savedRows[0].status)
        ? (savedRows[0].status as SavedStatus)
        : "wishlist";
    }
  }

  const hood = getNeighbourhood(place.lat, place.lng);
  const priceTier = place.price_level
    ? "$".repeat(Math.min(place.price_level, 4))
    : null;

  const placeUrl = `${SITE_URL}/place/${encodeURIComponent(place.name)}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: place.name,
    address: place.address
      ? {
          "@type": "PostalAddress",
          streetAddress: place.address,
          addressLocality: "Toronto",
          addressRegion: "ON",
          addressCountry: "CA",
        }
      : undefined,
    geo: {
      "@type": "GeoCoordinates",
      latitude: place.lat,
      longitude: place.lng,
    },
    url: placeUrl,
    ...(place.google_rating !== null
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: place.google_rating,
            reviewCount: place.google_reviews_count ?? place.mention_count,
          },
        }
      : {}),
    ...(place.cuisine_type ? { servesCuisine: place.cuisine_type } : {}),
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Feed", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: place.category,
        item: `${SITE_URL}/category/${place.category}`,
      },
      { "@type": "ListItem", position: 3, name: place.name, item: placeUrl },
    ],
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbLd} />
      <TopBar title={place.name} back={back.href} backLabel={back.label} />

      <article className="pt-14 md:pt-16 pb-24 page-enter">
        <div className="hidden md:block max-w-5xl mx-auto px-6 md:px-10 pt-6">
          <BackLink href={back.href} label={back.label} />
        </div>
        {/* HERO */}
        <header className="max-w-5xl mx-auto px-6 md:px-10 pt-8 md:pt-12">
          {place.photo_url && (
            <div
              className="relative w-full overflow-hidden mb-8"
              style={{
                aspectRatio: "16 / 9",
                background: "var(--bg-sunken)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={place.photo_url}
                alt={place.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <p className="eyebrow mb-3" style={{ color: "var(--brand)" }}>
            {String(place.category).toUpperCase()}
            {hood && (
              <span
                style={{
                  fontFamily: "var(--font-serif)",
                  fontStyle: "italic",
                  fontWeight: 400,
                  letterSpacing: "normal",
                  textTransform: "none",
                  color: "var(--fg-muted)",
                  marginLeft: 8,
                }}
              >
                in {hood}
              </span>
            )}
          </p>

          <h1
            className="font-display text-5xl sm:text-6xl md:text-7xl"
            style={{ color: "var(--fg)", fontWeight: 500, lineHeight: 0.98 }}
          >
            {place.name}.
          </h1>

          {place.cuisine_type && (
            <p
              className="caption mt-4 text-lg"
              style={{ color: "var(--fg-muted)" }}
            >
              {place.cuisine_type}
            </p>
          )}

          {place.address && (
            <p
              className="font-serif italic text-base mt-2"
              style={{ color: "var(--fg-muted)" }}
            >
              {place.address}
            </p>
          )}

          {/* Meta rail */}
          <div
            className="flex flex-wrap items-baseline gap-x-5 gap-y-2 mt-6 pt-5 pb-5"
            style={{
              borderTop: "1px solid var(--border)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            {place.google_rating !== null && (
              <span className="dateline">
                {place.google_rating.toFixed(1)}★
                {place.google_reviews_count && (
                  <span style={{ color: "var(--fg-faint)" }}>
                    {" "}({place.google_reviews_count.toLocaleString()})
                  </span>
                )}
              </span>
            )}
            <span className="dateline">
              {place.mention_count}{" "}
              {place.mention_count === 1 ? "mention" : "mentions"}
            </span>
            {priceTier && <span className="dateline">{priceTier}</span>}
            {hood && (
              <Link
                href={`/neighbourhood/${neighbourhoodSlug(hood)}`}
                className="dateline ink-underline"
              >
                {hood} →
              </Link>
            )}
            <Link
              href={`/category/${place.category}`}
              className="dateline ink-underline capitalize"
            >
              More {place.category} →
            </Link>
          </div>

          {/* Action row */}
          <div
            className="flex flex-wrap items-baseline gap-x-6 gap-y-3 pt-5 pb-2"
            data-print-hide
          >
            <SaveButton
              placeId={place.id}
              signedIn={!!session}
              initialStatus={initialStatus}
            />
            <span style={{ color: "var(--fg-faint)" }}>·</span>
            <CheckinButton placeId={place.id} />
            <span style={{ color: "var(--fg-faint)" }}>·</span>
            <ShareButton name={place.name} />
            <span style={{ color: "var(--fg-faint)" }}>·</span>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="eyebrow ink-underline"
              style={{ color: "var(--fg-muted)" }}
            >
              Directions →
            </a>
            {place.metadata?.ticket_url && (
              <>
                <span style={{ color: "var(--fg-faint)" }}>·</span>
                <a
                  href={place.metadata.ticket_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="eyebrow ink-underline"
                  style={{ color: "var(--brand)" }}
                >
                  Tickets →
                </a>
              </>
            )}
            {place.metadata?.website && (
              <>
                <span style={{ color: "var(--fg-faint)" }}>·</span>
                <a
                  href={place.metadata.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="eyebrow ink-underline"
                  style={{ color: "var(--fg-muted)" }}
                >
                  Website →
                </a>
              </>
            )}
            <span style={{ color: "var(--fg-faint)" }}>·</span>
            <ReportButton placeId={place.id} />
          </div>
        </header>

        {/* Event-specific detail */}
        {place.metadata &&
          (place.metadata.event_date ||
            place.metadata.hours ||
            place.metadata.admission_fee ||
            place.metadata.genre ||
            place.metadata.price_range) && (
            <section className="max-w-5xl mx-auto px-6 md:px-10 mt-10">
              <p className="eyebrow mb-4">Particulars</p>
              <dl
                className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-5 pt-5"
                style={{ borderTop: "1px solid var(--fg)" }}
              >
                {place.metadata.event_date && (
                  <div>
                    <dt className="dateline mb-1">Date</dt>
                    <dd
                      className="font-serif text-base"
                      style={{ color: "var(--fg)" }}
                    >
                      {place.metadata.event_date}
                      {place.metadata.event_end_date && (
                        <span style={{ color: "var(--fg-muted)" }}>
                          {" "}→ {place.metadata.event_end_date}
                        </span>
                      )}
                    </dd>
                  </div>
                )}
                {place.metadata.hours && (
                  <div>
                    <dt className="dateline mb-1">Hours</dt>
                    <dd
                      className="font-serif text-base"
                      style={{ color: "var(--fg)" }}
                    >
                      {place.metadata.hours}
                    </dd>
                  </div>
                )}
                {place.metadata.admission_fee && (
                  <div>
                    <dt className="dateline mb-1">Admission</dt>
                    <dd
                      className="font-serif text-base"
                      style={{ color: "var(--fg)" }}
                    >
                      {place.metadata.admission_fee}
                    </dd>
                  </div>
                )}
                {place.metadata.genre && (
                  <div>
                    <dt className="dateline mb-1">Genre</dt>
                    <dd
                      className="font-serif text-base"
                      style={{ color: "var(--fg)" }}
                    >
                      {place.metadata.genre}
                    </dd>
                  </div>
                )}
                {place.metadata.price_range && (
                  <div>
                    <dt className="dateline mb-1">Price</dt>
                    <dd
                      className="font-serif text-base"
                      style={{ color: "var(--fg)" }}
                    >
                      {place.metadata.price_range}
                    </dd>
                  </div>
                )}
                {place.metadata.venue_name && (
                  <div>
                    <dt className="dateline mb-1">Venue</dt>
                    <dd
                      className="font-serif text-base"
                      style={{ color: "var(--fg)" }}
                    >
                      {place.metadata.venue_name}
                    </dd>
                  </div>
                )}
              </dl>
            </section>
          )}

        {/* MAP */}
        <section
          className="max-w-5xl mx-auto px-6 md:px-10 mt-16"
          data-print-hide
        >
          <div
            className="flex items-baseline justify-between pb-3 mb-6"
            style={{ borderBottom: "1px solid var(--fg)" }}
          >
            <h2
              className="font-display text-2xl md:text-3xl"
              style={{ color: "var(--fg)", fontWeight: 500 }}
            >
              Where it is
            </h2>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="dateline ink-underline"
            >
              Directions →
            </a>
          </div>
          <div
            style={{
              height: 260,
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              overflow: "hidden",
            }}
          >
            <PlaceMapWrapper
              lat={place.lat}
              lng={place.lng}
              name={place.name}
              category={place.category}
            />
          </div>
        </section>

        {/* BUZZ OVER TIME */}
        {sortedMonths.length > 0 && (
          <section className="max-w-5xl mx-auto px-6 md:px-10 mt-16">
            <div
              className="flex items-baseline justify-between pb-3 mb-6"
              style={{ borderBottom: "1px solid var(--fg)" }}
            >
              <h2
                className="font-display text-2xl md:text-3xl"
                style={{ color: "var(--fg)", fontWeight: 500 }}
              >
                Buzz over time
              </h2>
              <p className="dateline">
                {posts.length} posts ·{" "}
                {Math.round(
                  (sentimentCounts.positive / Math.max(1, posts.length)) * 100
                )}
                % positive
              </p>
            </div>

            {/* Sentiment bar */}
            {posts.length > 0 && (
              <div className="mb-10">
                <div
                  className="flex h-1.5 overflow-hidden"
                  style={{ borderRadius: 1 }}
                >
                  {(["positive", "neutral", "negative"] as const).map((s) => {
                    const pct = (sentimentCounts[s] / posts.length) * 100;
                    if (pct === 0) return null;
                    return (
                      <div
                        key={s}
                        style={{
                          width: `${pct}%`,
                          background: SENTIMENT_COLORS[s],
                        }}
                      />
                    );
                  })}
                </div>
                <div className="flex flex-wrap gap-x-5 mt-3">
                  {(["positive", "neutral", "negative"] as const).map((s) => (
                    <span
                      key={s}
                      className="dateline"
                      style={{ color: "var(--fg-muted)" }}
                    >
                      <span
                        className="inline-block w-2 h-2 rounded-full mr-1.5"
                        style={{
                          background: SENTIMENT_COLORS[s],
                          verticalAlign: "middle",
                        }}
                      />
                      {SENTIMENT_LABELS[s]} {sentimentCounts[s]}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Monthly timeline */}
            <div className="space-y-6">
              {sortedMonths.map(([month, monthPosts]) => {
                const barWidth = Math.round(
                  (monthPosts.length / maxMonthCount) * 100
                );
                return (
                  <div key={month}>
                    <div className="flex items-baseline gap-4 mb-2">
                      <span
                        className="dateline shrink-0"
                        style={{ width: 128, color: "var(--fg-muted)" }}
                      >
                        {month}
                      </span>
                      <div
                        className="flex-1 h-px"
                        style={{ background: "var(--border)" }}
                      >
                        <div
                          className="h-1 -translate-y-0.5"
                          style={{
                            width: `${barWidth}%`,
                            background: "var(--fg)",
                          }}
                        />
                      </div>
                      <span
                        className="font-display tabular-nums shrink-0"
                        style={{
                          color: "var(--fg)",
                          fontWeight: 500,
                          fontSize: 16,
                        }}
                      >
                        {monthPosts.length}
                      </span>
                    </div>
                    <ul className="pl-[128px] space-y-1">
                      {monthPosts.map((p) => {
                        const decoded = decodeHtmlEntities(p.title);
                        return (
                          <li key={p.id}>
                            <a
                              href={getPostHref(p.subreddit, p.permalink)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-serif text-sm truncate block transition-colors hover:text-[color:var(--brand)]"
                              style={{ color: "var(--fg-muted)" }}
                            >
                              {decoded.length > 80
                                ? decoded.slice(0, 80) + "…"
                                : decoded}
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* WHAT LOCALS SAID */}
        {posts.length > 0 && (
          <section className="max-w-5xl mx-auto px-6 md:px-10 mt-16">
            <div
              className="flex items-baseline justify-between pb-3 mb-6"
              style={{ borderBottom: "1px solid var(--fg)" }}
            >
              <h2
                className="font-display text-2xl md:text-3xl"
                style={{ color: "var(--fg)", fontWeight: 500 }}
              >
                What locals said
              </h2>
              <p className="dateline">Filter by sentiment & timeframe</p>
            </div>
            <PostFilterList posts={posts} />
          </section>
        )}

        {/* NEARBY */}
        {nearby.length > 0 && (
          <section className="max-w-5xl mx-auto px-6 md:px-10 mt-16">
            <div
              className="flex items-baseline justify-between pb-3 mb-8"
              style={{ borderBottom: "1px solid var(--fg)" }}
            >
              <h2
                className="font-display text-2xl md:text-3xl"
                style={{ color: "var(--fg)", fontWeight: 500 }}
              >
                Nearby
              </h2>
              <p className="dateline">Within a few blocks</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
              {nearby.map((r, i) => {
                const dist = haversineDistance(
                  place.lat,
                  place.lng,
                  r.lat,
                  r.lng
                );
                const distLabel =
                  dist < 1000
                    ? `${Math.round(dist)}m away`
                    : `${(dist / 1000).toFixed(1)}km away`;
                return (
                  <PlaceCard
                    key={r.id}
                    place={r}
                    variant="story"
                    stagger={i}
                    caption={distLabel}
                  />
                );
              })}
            </div>
          </section>
        )}

        {/* Colophon */}
        <footer
          className="max-w-5xl mx-auto px-6 md:px-10 mt-20 pt-6"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <p className="dateline">
            BuzzMaps · {place.mention_count}{" "}
            {place.mention_count === 1 ? "mention" : "mentions"} across Reddit
            and the local press. Facts may change — check the place directly
            before visiting.
          </p>
        </footer>
      </article>
    </div>
  );
}
