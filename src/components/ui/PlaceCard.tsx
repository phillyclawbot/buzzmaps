import Link from "next/link";
import { CATEGORY_COLORS } from "@/lib/constants";
import type { PlaceCategory } from "@/lib/types";

/**
 * Editorial place card — magazine-style.
 *
 * Variants:
 *  - "feature":  hero, full-bleed photo, large display-serif headline
 *  - "story":   standard grid card, photo top, serif headline below
 *  - "row":     horizontal: image left, headline, italic caption
 *  - "rank":    dense ranked row with rank number
 */

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
}

function colorFor(category: string): string {
  return (CATEGORY_COLORS as Record<string, string>)[category] || "var(--brand)";
}

function categoryLabel(category: string): string {
  return category.toUpperCase();
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
  variant?: "feature" | "story" | "row" | "rank";
  rank?: number;
  href?: string;
  stagger?: number;
  /** Optional editorial caption line. Defaults to address. */
  caption?: string;
}) {
  const to = href ?? `/place/${encodeURIComponent(place.name)}`;
  const color = colorFor(place.category);
  const mention = place.mention_count ?? 0;
  const captionText = caption ?? place.address ?? "";

  // ──────── FEATURE: hero magazine card ────────
  if (variant === "feature") {
    return (
      <Link
        href={to}
        className="group relative block overflow-hidden animate-fade-in-up"
        style={
          {
            ["--stagger" as string]: stagger,
            background: "var(--bg-elevated)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border)",
          } as React.CSSProperties
        }
      >
        <div
          className="relative w-full"
          style={{ aspectRatio: "16 / 11", background: "var(--bg-sunken)" }}
        >
          {place.photo_url ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={place.photo_url}
                alt=""
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(20,18,17,0) 35%, rgba(20,18,17,0.85) 100%)",
                }}
              />
            </>
          ) : (
            <div
              className="w-full h-full"
              style={{
                background: `linear-gradient(135deg, ${color}30 0%, ${color}10 100%)`,
              }}
            />
          )}

          <div className="absolute top-5 left-5">
            <span className="tag tag-solid">{categoryLabel(String(place.category))}</span>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
            <h2
              className="font-display text-3xl sm:text-4xl md:text-5xl leading-[1.05] mb-3"
              style={{ color: "#faf7f2", fontWeight: 500 }}
            >
              {place.name}
            </h2>
            {captionText && (
              <p
                className="caption text-base"
                style={{ color: "rgba(250,247,242,0.85)" }}
              >
                {captionText}
              </p>
            )}
          </div>
        </div>

        <div
          className="flex items-baseline justify-between px-6 sm:px-8 py-4"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <span className="dateline">
            {mention} {mention === 1 ? "mention" : "mentions"}
            {place.google_rating != null && ` · ${place.google_rating.toFixed(1)}★`}
          </span>
          <span
            className="eyebrow group-hover:text-[color:var(--brand)] transition-colors"
            style={{ color: "var(--fg-muted)" }}
          >
            Read →
          </span>
        </div>
      </Link>
    );
  }

  // ──────── STORY: standard editorial card ────────
  if (variant === "story") {
    return (
      <Link
        href={to}
        className="group block animate-fade-in-up"
        style={{ ["--stagger" as string]: stagger } as React.CSSProperties}
      >
        <div
          className="relative w-full overflow-hidden mb-4"
          style={{
            aspectRatio: "4 / 3",
            background: "var(--bg-sunken)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          {place.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={place.photo_url}
              alt=""
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center font-display text-5xl"
              style={{
                background: `linear-gradient(135deg, ${color}26 0%, ${color}0a 100%)`,
                color,
                fontWeight: 600,
              }}
            >
              {place.name.charAt(0)}
            </div>
          )}
        </div>

        <div className="px-1">
          <span
            className="eyebrow block mb-2"
            style={{ color: "var(--brand)" }}
          >
            {categoryLabel(String(place.category))}
          </span>

          <h3
            className="font-display text-xl md:text-2xl leading-tight mb-2 ink-underline inline"
            style={{ color: "var(--fg)", fontWeight: 500 }}
          >
            {place.name}
          </h3>

          {captionText && (
            <p
              className="caption mt-2"
              style={{ color: "var(--fg-muted)" }}
            >
              {captionText}
            </p>
          )}

          <div
            className="flex items-baseline justify-between mt-4 pt-3"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <span className="dateline">
              {mention} {mention === 1 ? "mention" : "mentions"}
            </span>
            {place.google_rating != null && (
              <span className="dateline" style={{ color: "var(--fg-muted)" }}>
                {place.google_rating.toFixed(1)}★
              </span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  // ──────── ROW: horizontal feature, image left ────────
  if (variant === "row") {
    return (
      <Link
        href={to}
        className="group flex gap-5 items-start animate-fade-in-up"
        style={{ ["--stagger" as string]: stagger } as React.CSSProperties}
      >
        <div
          className="relative shrink-0 overflow-hidden"
          style={{
            width: 132,
            height: 100,
            background: "var(--bg-sunken)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          {place.photo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={place.photo_url}
              alt=""
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center font-display text-3xl"
              style={{
                background: `linear-gradient(135deg, ${color}26 0%, ${color}0a 100%)`,
                color,
                fontWeight: 600,
              }}
            >
              {place.name.charAt(0)}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <span
            className="eyebrow block mb-1.5"
            style={{ color: "var(--brand)" }}
          >
            {categoryLabel(String(place.category))}
          </span>
          <h3
            className="font-display text-lg leading-tight"
            style={{ color: "var(--fg)", fontWeight: 500 }}
          >
            {place.name}
          </h3>
          {captionText && (
            <p
              className="text-sm mt-1 truncate"
              style={{ color: "var(--fg-muted)" }}
            >
              {captionText}
            </p>
          )}
          <div className="flex items-baseline gap-3 mt-2">
            <span className="dateline">
              {mention} {mention === 1 ? "mention" : "mentions"}
            </span>
            {place.google_rating != null && (
              <span className="dateline">
                {place.google_rating.toFixed(1)}★
              </span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  // ──────── RANK: dense ranked row ────────
  return (
    <Link
      href={to}
      className="group flex items-baseline gap-5 py-4 animate-fade-in-up"
      style={
        {
          ["--stagger" as string]: stagger,
          borderTop: "1px solid var(--border)",
        } as React.CSSProperties
      }
    >
      {rank !== undefined && (
        <span
          className="font-display shrink-0 text-3xl tabular-nums"
          style={{
            color: "var(--fg-faint)",
            width: 48,
            fontWeight: 400,
          }}
        >
          {String(rank).padStart(2, "0")}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <span
          className="eyebrow"
          style={{ color: "var(--brand)" }}
        >
          {categoryLabel(String(place.category))}
        </span>
        <h3
          className="font-display text-2xl leading-tight mt-1 group-hover:text-[color:var(--brand)] transition-colors"
          style={{ color: "var(--fg)", fontWeight: 500 }}
        >
          {place.name}
        </h3>
        {captionText && (
          <p className="caption mt-1" style={{ color: "var(--fg-muted)" }}>
            {captionText}
          </p>
        )}
      </div>
      <div className="shrink-0 text-right">
        <div
          className="font-display text-2xl tabular-nums leading-none"
          style={{ color: "var(--fg)", fontWeight: 500 }}
        >
          {mention}
        </div>
        <div className="dateline mt-1">
          {mention === 1 ? "mention" : "mentions"}
        </div>
        {place.google_rating != null && (
          <div className="dateline mt-0.5">
            {place.google_rating.toFixed(1)}★
          </div>
        )}
      </div>
    </Link>
  );
}
