import Link from "next/link";
import { CATEGORY_COLORS } from "@/lib/constants";
import type { PlaceCategory } from "@/lib/types";
import PostSource from "@/components/ui/PostSource";
import CategoryBadge from "@/components/ui/CategoryBadge";
import { decodeHtmlEntities } from "@/lib/post-source";
import { CategoryIcon } from "@/lib/icons";
import { Star, MessageCircle, TrendingUp, ArrowUpRight } from "lucide-react";

/**
 * Place card — playful, tactile, map-app friendly.
 *
 * Variants:
 *   "story" — photo-forward rounded card with glow-on-hover. Default.
 *   "row"   — horizontal thumbnail + title + quote.
 *   "rank"  — big gradient rank number + excerpt.
 *   "feature" — larger "story" variant for hero placements.
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
  preview?: PlacePreview | null;
  trend?: number[] | null;
}

function colorFor(category: string): string {
  return (
    (CATEGORY_COLORS as Record<string, string>)[category] || "var(--brand)"
  );
}

function timeAgoShort(utc: number): string {
  const s = Math.floor(Date.now() / 1000 - utc);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  if (s < 86400 * 365) return `${Math.floor(s / (86400 * 30))}mo ago`;
  return `${Math.floor(s / (86400 * 365))}y ago`;
}

function Sparkline({ weeks, color }: { weeks: number[]; color: string }) {
  if (!weeks || weeks.length === 0) return null;
  const W = 80;
  const H = 20;
  const max = Math.max(...weeks, 1);
  const step = W / Math.max(1, weeks.length - 1);
  const pts = weeks.map((n, i) => {
    const x = i * step;
    const y = H - (n / max) * (H - 2) - 1;
    return `${x},${y}`;
  });
  const linePath = `M${pts.join(" L")}`;
  const areaPath = `${linePath} L${W},${H} L0,${H} Z`;
  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      aria-hidden="true"
      style={{ display: "block", overflow: "visible" }}
    >
      <defs>
        <linearGradient id={`spark-${color.replace(/[^a-z0-9]/gi, "")}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.35" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#spark-${color.replace(/[^a-z0-9]/gi, "")})`} />
      <path d={linePath} stroke={color} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Thumb({
  place,
  size = 64,
  rounded = "md",
}: {
  place: PlaceCardData;
  size?: number;
  rounded?: "sm" | "md" | "lg" | "pill";
}) {
  const color = colorFor(place.category);
  const radius =
    rounded === "pill"
      ? 9999
      : rounded === "lg"
      ? "var(--radius-lg)"
      : rounded === "sm"
      ? "var(--radius-sm)"
      : "var(--radius-md)";
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
          borderRadius: radius,
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
        background: `linear-gradient(135deg, ${color} 0%, ${color}aa 100%)`,
        color: "#fff",
        borderRadius: radius,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <CategoryIcon
        category={place.category}
        size={Math.round(size * 0.44)}
        color="#fff"
      />
    </div>
  );
}

function TrendBadge({ trend }: { trend: number[] | null | undefined }) {
  if (!trend || trend.length < 2) return null;
  const recent = trend.slice(-4).reduce((a, b) => a + b, 0);
  const prior = trend.slice(-8, -4).reduce((a, b) => a + b, 0);
  if (prior === 0 && recent === 0) return null;
  const delta = prior === 0 ? 100 : Math.round(((recent - prior) / prior) * 100);
  if (Math.abs(delta) < 15) return null;
  const up = delta >= 0;
  return (
    <span
      className="inline-flex items-center gap-1 font-display-ui font-semibold text-[11px]"
      style={{
        color: up ? "var(--sent-pos)" : "var(--fg-muted)",
        background: up
          ? "color-mix(in srgb, var(--sent-pos) 12%, transparent)"
          : "var(--bg-sunken)",
        padding: "3px 8px",
        borderRadius: 9999,
      }}
    >
      <TrendingUp size={11} style={{ transform: up ? undefined : "scaleY(-1)" }} />
      {Math.abs(delta)}%
    </span>
  );
}

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
  caption?: string;
}) {
  const to = href ?? `/place/${encodeURIComponent(place.name)}`;
  const mention = place.mention_count ?? 0;
  const color = colorFor(place.category);

  // ─────────────── RANK ───────────────
  if (variant === "rank") {
    return (
      <Link
        href={to}
        className="group flex items-center gap-5 p-4 animate-fade-in-up rounded-[var(--radius-lg)] transition-all"
        style={
          {
            ["--stagger" as string]: stagger,
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            color: "inherit",
          } as React.CSSProperties
        }
      >
        <span
          className="font-display tabular-nums shrink-0 text-gradient-brand"
          style={{
            fontSize: 52,
            fontWeight: 700,
            lineHeight: 0.9,
            width: 64,
            textAlign: "center",
            fontVariationSettings: "'opsz' 48",
            letterSpacing: "-0.04em",
          }}
        >
          {rank}
        </span>
        <Thumb place={place} size={56} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <CategoryBadge category={place.category as PlaceCategory} size="xs" />
          </div>
          <h3
            className="font-display-ui font-semibold text-[16.5px] truncate group-hover:text-[color:var(--brand)] transition-colors"
            style={{ color: "var(--fg)" }}
          >
            {place.name}
          </h3>
          {place.preview ? (
            <p
              className="font-serif italic line-clamp-1 mt-0.5 text-[13.5px]"
              style={{ color: "var(--fg-muted)" }}
            >
              &ldquo;{decodeHtmlEntities(place.preview.title)}&rdquo;
            </p>
          ) : (
            (caption || place.address) && (
              <p
                className="text-[12.5px] truncate mt-0.5"
                style={{ color: "var(--fg-subtle)" }}
              >
                {caption ?? place.address}
              </p>
            )
          )}
        </div>
        <div className="shrink-0 text-right">
          <div
            className="font-display-ui tabular-nums"
            style={{ color: "var(--fg)", fontWeight: 700, fontSize: 20, lineHeight: 1 }}
          >
            {mention}
          </div>
          <div
            className="eyebrow mt-1"
            style={{ color: "var(--fg-subtle)", fontSize: 9 }}
          >
            {mention === 1 ? "mention" : "mentions"}
          </div>
        </div>
      </Link>
    );
  }

  // ─────────────── ROW ───────────────
  if (variant === "row") {
    return (
      <Link
        href={to}
        className="group flex gap-4 items-start animate-fade-in-up p-4 rounded-[var(--radius-lg)] transition-all"
        style={
          {
            ["--stagger" as string]: stagger,
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            color: "inherit",
            boxShadow: "var(--shadow-sm)",
          } as React.CSSProperties
        }
      >
        <Thumb place={place} size={88} rounded="md" />
        <div className="flex-1 min-w-0">
          <CategoryBadge category={place.category as PlaceCategory} size="xs" />
          <h3
            className="font-display-ui font-semibold mt-1.5 text-[17px] line-clamp-1 group-hover:text-[color:var(--brand)] transition-colors"
            style={{ color: "var(--fg)" }}
          >
            {place.name}
          </h3>
          {place.preview ? (
            <p
              className="font-serif italic mt-1 line-clamp-2 text-[13.5px]"
              style={{ color: "var(--fg-muted)" }}
            >
              &ldquo;{decodeHtmlEntities(place.preview.title)}&rdquo;
            </p>
          ) : (
            (caption || place.address) && (
              <p
                className="mt-1 truncate text-[13px]"
                style={{ color: "var(--fg-muted)" }}
              >
                {caption ?? place.address}
              </p>
            )
          )}
          <div
            className="flex items-center gap-3 mt-2 font-display-ui font-semibold text-[11.5px]"
            style={{ color: "var(--fg-subtle)" }}
          >
            <span className="inline-flex items-center gap-1">
              <MessageCircle size={12} />
              {mention}
            </span>
            {place.google_rating != null && (
              <span className="inline-flex items-center gap-1">
                <Star size={12} style={{ color: "var(--gold)" }} fill="currentColor" />
                {place.google_rating.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  // ─────────────── STORY / FEATURE ───────────────
  const isFeature = variant === "feature";

  return (
    <Link
      href={to}
      className="group relative block animate-fade-in-up no-underline overflow-hidden place-card-hover"
      style={
        {
          ["--stagger" as string]: stagger,
          ["--card-glow" as string]: `${color}55`,
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          color: "inherit",
          boxShadow: "var(--shadow-sm)",
        } as React.CSSProperties
      }
    >
      {/* Photo or gradient header */}
      <div
        className="relative overflow-hidden"
        style={{
          aspectRatio: isFeature ? "4 / 3" : "16 / 10",
          background: place.photo_url
            ? "var(--bg-sunken)"
            : `linear-gradient(135deg, ${color} 0%, ${color}99 100%)`,
        }}
      >
        {place.photo_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={place.photo_url}
            alt=""
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <CategoryIcon
              category={place.category}
              size={isFeature ? 96 : 72}
              color="#ffffffdd"
            />
          </div>
        )}

        {/* Category pill overlay */}
        <div className="absolute top-3 left-3">
          <CategoryBadge category={place.category as PlaceCategory} size="sm" />
        </div>

        {/* Trend badge */}
        <div className="absolute top-3 right-3">
          <TrendBadge trend={place.trend} />
        </div>

        {/* Mention count chip bottom-right */}
        {mention > 0 && (
          <div
            className="absolute bottom-3 right-3 inline-flex items-center gap-1 font-display-ui font-semibold"
            style={{
              background: "color-mix(in srgb, var(--fg) 85%, transparent)",
              color: "#fff",
              padding: "4px 10px",
              borderRadius: 9999,
              fontSize: 11.5,
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
            }}
          >
            <MessageCircle size={12} strokeWidth={2.4} />
            {mention}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h3
            className="font-display flex-1 min-w-0 group-hover:text-[color:var(--brand)] transition-colors"
            style={{
              color: "var(--fg)",
              fontWeight: 600,
              fontSize: isFeature ? 30 : 22,
              lineHeight: 1.08,
              letterSpacing: "-0.02em",
            }}
          >
            {place.name}
          </h3>
          <span
            className="shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            style={{ color: "var(--fg-subtle)" }}
          >
            <ArrowUpRight size={18} strokeWidth={2.2} />
          </span>
        </div>

        {place.preview ? (
          <p
            className="font-serif italic mt-3 line-clamp-2"
            style={{
              color: "var(--fg-muted)",
              fontSize: isFeature ? 16 : 14,
              lineHeight: 1.4,
            }}
          >
            &ldquo;{decodeHtmlEntities(place.preview.title)}&rdquo;
          </p>
        ) : (
          (caption || place.address) && (
            <p
              className="mt-2 text-[13.5px] line-clamp-2"
              style={{ color: "var(--fg-muted)" }}
            >
              {caption ?? place.address}
            </p>
          )
        )}

        <div className="flex items-center justify-between gap-3 mt-4 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
          <div className="flex items-center gap-3 text-[12.5px] font-display-ui font-semibold" style={{ color: "var(--fg-muted)" }}>
            {place.preview?.subreddit && (
              <PostSource subreddit={place.preview.subreddit} variant="tag" />
            )}
            {place.preview?.created_utc != null && (
              <span style={{ color: "var(--fg-subtle)" }}>
                {timeAgoShort(place.preview.created_utc)}
              </span>
            )}
            {place.google_rating != null && (
              <span className="inline-flex items-center gap-1">
                <Star size={12} style={{ color: "var(--gold)" }} fill="currentColor" />
                {place.google_rating.toFixed(1)}
              </span>
            )}
          </div>
          {place.trend && place.trend.length > 3 && (
            <span aria-hidden="true" style={{ color, flexShrink: 0 }}>
              <Sparkline weeks={place.trend} color={color} />
            </span>
          )}
        </div>
      </div>

    </Link>
  );
}
