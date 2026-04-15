import Link from "next/link";
import { CATEGORY_COLORS } from "@/lib/constants";
import type { PlaceCategory } from "@/lib/types";
import PostSource from "@/components/ui/PostSource";
import { decodeHtmlEntities } from "@/lib/post-source";

/**
 * Editorial place card — quote-forward design.
 *
 * The unique thing BuzzMaps has that other map apps don't is *what
 * people are saying*. So when a quote is available, the card leads
 * with the quote (big serif pullquote) and treats the place itself
 * as the attribution. When no quote is available, we fall back to
 * a cleaner photo-first variant.
 *
 * Variants:
 *   "story" — the default; quote-forward when `preview` is set,
 *             photo-forward otherwise. Used by home feed, search,
 *             neighbourhood guides, place "nearby" grid.
 *   "row"   — horizontal, thumbnail + title + caption. Used by
 *             /account saved lists.
 *   "rank"  — dense ranked row with big display-serif rank number
 *             and inline italic excerpt. Used by "The Rankings"
 *             on feed and the Dispatch top-5.
 *
 * Authoring intent: the card should feel like a magazine pullquote,
 * not a real-estate listing.
 */

export interface PlacePreview {
  title: string;
  subreddit: string;
  score?: number;
  created_utc?: number;
  sentiment?: string;
}

export interface PlaceCardData {
  id: number | string;
  name: string;
  category: PlaceCategory | string;
  address?: string | null;
  photo_url?: string | null;
  mention_count?: number | null;
  google_rating?: number | null;
  cuisine_type?: string | null;
  price_level?: number | null;
  /** Optional: most-recent or highest-scoring Reddit/publication mention */
  preview?: PlacePreview | null;
  /** Optional: up to 12 weeks of mention counts (oldest → newest) for a sparkline */
  trend?: number[] | null;
}

function colorFor(category: string): string {
  return (CATEGORY_COLORS as Record<string, string>)[category] || "var(--brand)";
}

function timeAgoShort(utc: number): string {
  const s = Math.floor(Date.now() / 1000 - utc);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  if (s < 86400 * 365) return `${Math.floor(s / (86400 * 30))}mo ago`;
  return `${Math.floor(s / (86400 * 365))}y ago`;
}

/**
 * Small SVG sparkline — the full spec of BuzzMaps' trajectory for a
 * given place. Hairline bars, ink-colored, quiet.
 */
function Sparkline({ weeks }: { weeks: number[] }) {
  if (!weeks || weeks.length === 0) return null;
  const W = 72;
  const H = 16;
  const max = Math.max(...weeks, 1);
  const barW = W / weeks.length;
  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      aria-hidden="true"
      style={{ display: "block" }}
    >
      {weeks.map((n, i) => {
        const h = Math.max(1, (n / max) * (H - 2));
        return (
          <rect
            key={i}
            x={i * barW + 0.5}
            y={H - h}
            width={Math.max(1, barW - 1.5)}
            height={h}
            fill="currentColor"
            opacity={0.7 + 0.3 * (i / Math.max(1, weeks.length - 1))}
          />
        );
      })}
    </svg>
  );
}

// ─────────────────────────────────────────────────────────
// Reusable sub-pieces
// ─────────────────────────────────────────────────────────

function Thumb({
  place,
  size = 56,
}: {
  place: PlaceCardData;
  size?: number;
}) {
  const color = colorFor(place.category);
  if (place.photo_url) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={place.photo_url}
        alt=""
        style={{
          width: size,
          height: size,
          objectFit: "cover",
          flexShrink: 0,
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--border)",
        }}
      />
    );
  }
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        background: `linear-gradient(135deg, ${color}22 0%, ${color}08 100%)`,
        color,
        borderRadius: "var(--radius-sm)",
        border: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-serif)",
        fontWeight: 500,
        fontSize: size * 0.45,
        fontVariationSettings: "'opsz' 48",
      }}
    >
      {place.name.charAt(0)}
    </div>
  );
}

function TrendBadge({ trend }: { trend: number[] | null | undefined }) {
  if (!trend || trend.length < 2) return null;
  const recent = trend.slice(-4).reduce((a, b) => a + b, 0);
  const prior = trend.slice(-8, -4).reduce((a, b) => a + b, 0);
  if (prior === 0 && recent === 0) return null;
  const delta = prior === 0 ? 100 : Math.round(((recent - prior) / prior) * 100);
  if (Math.abs(delta) < 15) return null; // don't cry wolf on small drift
  const up = delta >= 0;
  return (
    <span
      className="dateline"
      style={{
        color: up ? "var(--sent-pos)" : "var(--fg-subtle)",
        marginLeft: 8,
      }}
    >
      {up ? "▲" : "▼"} {Math.abs(delta)}%
    </span>
  );
}

function PlaceAttribution({
  place,
  href,
  thumbSize = 44,
}: {
  place: PlaceCardData;
  href: string;
  thumbSize?: number;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 no-underline"
      style={{ color: "inherit" }}
    >
      <Thumb place={place} size={thumbSize} />
      <span className="flex-1 min-w-0">
        <span
          className="eyebrow block"
          style={{ color: "var(--fg-subtle)" }}
        >
          {String(place.category).toUpperCase()}
        </span>
        <span
          className="font-display block truncate group-hover:text-[color:var(--brand)] transition-colors"
          style={{
            color: "var(--fg)",
            fontWeight: 500,
            fontSize: 17,
            lineHeight: 1.15,
          }}
        >
          {place.name}
        </span>
        <span
          className="dateline block truncate"
          style={{ color: "var(--fg-muted)" }}
        >
          {place.address ? place.address : "Toronto"}
          {place.google_rating != null && (
            <> · {place.google_rating.toFixed(1)}★</>
          )}
        </span>
      </span>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────

export default function PlaceCard({
  place,
  variant = "story",
  rank,
  href,
  stagger = 0,
  caption,
}: {
  place: PlaceCardData;
  variant?: "story" | "row" | "rank" | "feature";
  rank?: number;
  href?: string;
  stagger?: number;
  /** Override the default caption line */
  caption?: string;
}) {
  const to = href ?? `/place/${encodeURIComponent(place.name)}`;
  const mention = place.mention_count ?? 0;

  // ─────────────── RANK ───────────────
  if (variant === "rank") {
    return (
      <article
        className="animate-fade-in-up py-5"
        style={{
          ["--stagger" as string]: stagger,
          borderTop: "1px solid var(--border)",
        } as React.CSSProperties}
      >
        <div className="flex items-baseline gap-5">
          {rank !== undefined && (
            <span
              className="font-display tabular-nums shrink-0"
              style={{
                color: "var(--fg-faint)",
                fontSize: 32,
                fontWeight: 400,
                lineHeight: 1,
                width: 56,
                fontVariationSettings: "'opsz' 48",
              }}
            >
              {String(rank).padStart(2, "0")}
            </span>
          )}
          <Link
            href={to}
            className="flex-1 min-w-0 group"
            style={{ color: "inherit", textDecoration: "none" }}
          >
            <p
              className="eyebrow"
              style={{ color: "var(--brand)" }}
            >
              {String(place.category).toUpperCase()}
            </p>
            <h3
              className="font-display mt-1 group-hover:text-[color:var(--brand)] transition-colors"
              style={{
                color: "var(--fg)",
                fontWeight: 500,
                fontSize: 22,
                lineHeight: 1.1,
                letterSpacing: "-0.01em",
              }}
            >
              {place.name}
            </h3>
            {place.preview ? (
              <p
                className="font-serif italic mt-2 line-clamp-1"
                style={{ color: "var(--fg-muted)", fontSize: 15 }}
              >
                &ldquo;{decodeHtmlEntities(place.preview.title)}&rdquo;
              </p>
            ) : caption || place.address ? (
              <p
                className="dateline mt-1 truncate"
                style={{ color: "var(--fg-muted)" }}
              >
                {caption ?? place.address}
              </p>
            ) : null}
          </Link>
          <div className="shrink-0 text-right">
            <div
              className="font-display tabular-nums leading-none"
              style={{ color: "var(--fg)", fontWeight: 500, fontSize: 22 }}
            >
              {mention}
            </div>
            <div className="dateline mt-1" style={{ color: "var(--fg-muted)" }}>
              {mention === 1 ? "mention" : "mentions"}
            </div>
            {place.google_rating != null && (
              <div className="dateline mt-0.5">
                {place.google_rating.toFixed(1)}★
              </div>
            )}
          </div>
        </div>
      </article>
    );
  }

  // ─────────────── ROW ───────────────
  if (variant === "row") {
    return (
      <Link
        href={to}
        className="group flex gap-4 items-start animate-fade-in-up no-underline"
        style={
          {
            ["--stagger" as string]: stagger,
            color: "inherit",
          } as React.CSSProperties
        }
      >
        <Thumb place={place} size={96} />
        <div className="flex-1 min-w-0">
          <p
            className="eyebrow mb-1"
            style={{ color: "var(--brand)" }}
          >
            {String(place.category).toUpperCase()}
          </p>
          <h3
            className="font-display group-hover:text-[color:var(--brand)] transition-colors"
            style={{
              color: "var(--fg)",
              fontWeight: 500,
              fontSize: 20,
              lineHeight: 1.15,
              letterSpacing: "-0.01em",
            }}
          >
            {place.name}
          </h3>
          {place.preview ? (
            <p
              className="font-serif italic mt-1 line-clamp-2"
              style={{ color: "var(--fg-muted)", fontSize: 14 }}
            >
              &ldquo;{decodeHtmlEntities(place.preview.title)}&rdquo;
            </p>
          ) : (
            caption || place.address ? (
              <p
                className="caption mt-1 truncate"
                style={{ color: "var(--fg-muted)" }}
              >
                {caption ?? place.address}
              </p>
            ) : null
          )}
          <div className="flex items-baseline gap-3 mt-2">
            <span className="dateline">
              {mention} {mention === 1 ? "mention" : "mentions"}
            </span>
            {place.google_rating != null && (
              <span className="dateline">{place.google_rating.toFixed(1)}★</span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  // ─────────────── STORY / FEATURE (quote-forward) ───────────────
  // (We fold the old "feature" hero variant into story + trend —
  // the quote pullout IS the feature.)
  const hasQuote = Boolean(place.preview && place.preview.title);
  const isFeature = variant === "feature";

  return (
    <article
      className="animate-fade-in-up group"
      style={
        {
          ["--stagger" as string]: stagger,
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)",
          padding: isFeature ? "28px 28px 24px" : "22px 22px 20px",
          transition: "border-color 200ms ease, transform 200ms ease",
          position: "relative",
        } as React.CSSProperties
      }
    >
      {/* Top meta bar: mentions + sparkline + trend delta */}
      <div className="flex items-center justify-between mb-5 gap-3">
        <p
          className="eyebrow"
          style={{ color: "var(--fg-muted)" }}
        >
          {mention} {mention === 1 ? "mention" : "mentions"}
          {place.google_rating != null && (
            <span
              className="ml-3"
              style={{ color: "var(--fg-subtle)", letterSpacing: "0.04em" }}
            >
              · {place.google_rating.toFixed(1)}★
            </span>
          )}
          <TrendBadge trend={place.trend} />
        </p>
        {place.trend && place.trend.length > 3 && (
          <span
            aria-hidden="true"
            style={{ color: "var(--fg-muted)", flexShrink: 0 }}
          >
            <Sparkline weeks={place.trend} />
          </span>
        )}
      </div>

      {hasQuote ? (
        <>
          {/* The quote */}
          <blockquote
            className="font-display"
            style={{
              color: "var(--fg)",
              fontWeight: 400,
              fontSize: isFeature ? "clamp(1.75rem, 2.4vw, 2.25rem)" : "1.35rem",
              lineHeight: 1.2,
              letterSpacing: "-0.015em",
              fontVariationSettings: "'opsz' 36",
              margin: 0,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                color: "var(--brand)",
                fontWeight: 500,
                marginRight: 4,
              }}
            >
              &ldquo;
            </span>
            {decodeHtmlEntities(place.preview!.title)}
            <span
              aria-hidden="true"
              style={{ color: "var(--brand)", fontWeight: 500 }}
            >
              &rdquo;
            </span>
          </blockquote>

          {/* Attribution line for the quote */}
          <p
            className="dateline mt-3 mb-6"
            style={{ color: "var(--fg-subtle)" }}
          >
            <PostSource subreddit={place.preview!.subreddit} />
            {place.preview!.score != null && (
              <> · {place.preview!.score} pts</>
            )}
            {place.preview!.created_utc != null && (
              <> · {timeAgoShort(place.preview!.created_utc)}</>
            )}
          </p>

          {/* Hairline divider */}
          <div
            aria-hidden="true"
            style={{
              height: 1,
              background: "var(--border)",
              margin: "0 -22px 16px",
            }}
          />

          {/* Place attribution at bottom */}
          <PlaceAttribution place={place} href={to} thumbSize={44} />
        </>
      ) : (
        <>
          {/* No quote — photo-forward fallback */}
          {place.photo_url && (
            <Link
              href={to}
              className="block relative overflow-hidden mb-5 -mx-6 -mt-3"
              style={{
                aspectRatio: "16 / 9",
                background: "var(--bg-sunken)",
                borderBottom: "1px solid var(--border)",
                marginTop: -22,
                marginLeft: -22,
                marginRight: -22,
                borderTopLeftRadius: "var(--radius-md)",
                borderTopRightRadius: "var(--radius-md)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={place.photo_url}
                alt=""
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
            </Link>
          )}
          <Link
            href={to}
            className="block no-underline"
            style={{ color: "inherit" }}
          >
            <p
              className="eyebrow mb-2"
              style={{ color: "var(--brand)" }}
            >
              {String(place.category).toUpperCase()}
            </p>
            <h3
              className="font-display group-hover:text-[color:var(--brand)] transition-colors"
              style={{
                color: "var(--fg)",
                fontWeight: 500,
                fontSize: isFeature ? 32 : 24,
                lineHeight: 1.1,
                letterSpacing: "-0.015em",
              }}
            >
              {place.name}
            </h3>
            {(caption || place.address) && (
              <p
                className="caption mt-2"
                style={{ color: "var(--fg-muted)" }}
              >
                {caption ?? place.address}
              </p>
            )}
          </Link>
        </>
      )}
    </article>
  );
}
