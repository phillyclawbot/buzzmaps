import Link from "next/link";
import { CATEGORY_COLORS } from "@/lib/constants";
import { CategoryIcon, IconStar, IconChat } from "@/lib/icons";
import type { PlaceCategory } from "@/lib/types";

/**
 * Canonical place card used by non-home surfaces: search results,
 * collections/[id], saved-places grid. The home ListView keeps its own
 * expanded/interactive card for now; this card is read-optimized and link-first.
 *
 * Variants:
 *  - "default": photo + stats + CTA (grid cell)
 *  - "compact": horizontal small thumbnail (ranked lists)
 *  - "row":    tall dense row (account, admin-like views)
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

function priceBadge(level?: number | null): string {
  if (!level || level < 1) return "";
  return "$".repeat(Math.min(level, 4));
}

export default function PlaceCard({
  place,
  variant = "default",
  rank,
  href,
  stagger = 0,
}: {
  place: PlaceCardData;
  variant?: "default" | "compact" | "row";
  /** Used in "compact" variant */
  rank?: number;
  /** Defaults to /place/[name] */
  href?: string;
  /** Index for staggered entry animation */
  stagger?: number;
}) {
  const to = href ?? `/place/${encodeURIComponent(place.name)}`;
  const color = colorFor(place.category);
  const mention = place.mention_count ?? 0;
  const price = priceBadge(place.price_level);

  // ─────────────────────── COMPACT (dense ranked list) ───────────────────────
  if (variant === "compact") {
    return (
      <Link
        href={to}
        className="app-card app-card-hover flex items-center gap-3 px-4 py-3 animate-fade-in-up"
        style={{ ["--stagger" as string]: stagger } as React.CSSProperties}
      >
        {rank !== undefined && (
          <span
            className="text-xl font-black w-7 text-center shrink-0"
            style={{ color: "var(--fg-faint)" }}
          >
            {rank}
          </span>
        )}
        {place.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={place.photo_url}
            alt=""
            className="w-11 h-11 rounded-xl object-cover shrink-0"
          />
        ) : (
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${color}1a`, color }}
          >
            <CategoryIcon category={place.category as PlaceCategory} size={18} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h3
            className="font-semibold text-sm truncate"
            style={{ color: "var(--fg)" }}
          >
            {place.name}
          </h3>
          {place.address && (
            <p
              className="text-[11px] truncate"
              style={{ color: "var(--fg-subtle)" }}
            >
              {place.address}
            </p>
          )}
        </div>
        <div className="text-right shrink-0 flex flex-col items-end gap-0.5">
          {mention > 0 && (
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: `${color}1f`, color }}
            >
              {mention} <IconChat size={10} className="inline-block -mt-0.5" />
            </span>
          )}
          {place.google_rating !== null && place.google_rating !== undefined && (
            <span className="text-[11px]" style={{ color: "var(--fg-muted)" }}>
              <IconStar size={10} className="inline-block -mt-0.5 text-amber-400" />{" "}
              {place.google_rating.toFixed(1)}
            </span>
          )}
        </div>
      </Link>
    );
  }

  // ─────────────────────── ROW (horizontal card, e.g. /account) ───────────────────────
  if (variant === "row") {
    return (
      <Link
        href={to}
        className="app-card app-card-hover flex overflow-hidden animate-fade-in-up"
        style={{ ["--stagger" as string]: stagger } as React.CSSProperties}
      >
        {place.photo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={place.photo_url}
            alt=""
            className="w-24 h-24 object-cover shrink-0"
          />
        ) : (
          <div
            className="w-24 h-24 flex items-center justify-center shrink-0"
            style={{ background: `${color}14`, color }}
          >
            <CategoryIcon category={place.category as PlaceCategory} size={28} />
          </div>
        )}
        <div className="p-3 min-w-0 flex-1">
          <h3
            className="text-sm font-bold truncate"
            style={{ color: "var(--fg)" }}
          >
            {place.name}
          </h3>
          <p
            className="text-[11px] truncate mt-0.5 capitalize"
            style={{ color: "var(--fg-subtle)" }}
          >
            {place.category}
            {price && ` · ${price}`}
          </p>
          {place.address && (
            <p
              className="text-xs truncate mt-0.5"
              style={{ color: "var(--fg-subtle)" }}
            >
              {place.address}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {mention > 0 && (
              <span
                className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background: `${color}1f`, color }}
              >
                {mention} mention{mention !== 1 ? "s" : ""}
              </span>
            )}
            {place.google_rating !== null && place.google_rating !== undefined && (
              <span
                className="text-[11px]"
                style={{ color: "var(--fg-muted)" }}
              >
                ⭐ {place.google_rating.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </Link>
    );
  }

  // ─────────────────────── DEFAULT (grid cell) ───────────────────────
  return (
    <Link
      href={to}
      className="app-card app-card-hover overflow-hidden flex flex-col animate-fade-in-up"
      style={{ ["--stagger" as string]: stagger } as React.CSSProperties}
    >
      <div
        className="relative h-36 overflow-hidden"
        style={{ background: "var(--bg-sunken)" }}
      >
        {place.photo_url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={place.photo_url}
              alt=""
              className="w-full h-full object-cover transition-transform duration-300 hover:scale-[1.03]"
            />
            <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/20 to-transparent" />
          </>
        ) : (
          <div
            className="w-full h-full flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${color}24 0%, ${color}08 100%)`,
              color,
            }}
          >
            <CategoryIcon category={place.category as PlaceCategory} size={36} />
          </div>
        )}
      </div>
      <div className="p-3.5 flex flex-col gap-1.5 flex-1">
        <span
          className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full self-start"
          style={{ background: `${color}1f`, color }}
        >
          <CategoryIcon category={place.category as PlaceCategory} size={11} />{" "}
          {place.category}
        </span>
        <h3
          className="font-semibold text-sm leading-snug"
          style={{ color: "var(--fg)" }}
        >
          {place.name}
        </h3>
        {place.cuisine_type && (
          <p className="text-[11px]" style={{ color: "var(--fg-subtle)" }}>
            {place.cuisine_type}
            {price && ` · ${price}`}
          </p>
        )}
        {place.address && (
          <p
            className="text-xs truncate"
            style={{ color: "var(--fg-subtle)" }}
            title={place.address}
          >
            {place.address}
          </p>
        )}
        <div className="flex items-center gap-2 mt-auto pt-1">
          {mention > 0 && (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-medium"
              style={{ color: "var(--fg-muted)" }}
            >
              <IconChat size={11} /> {mention}
            </span>
          )}
          {place.google_rating !== null && place.google_rating !== undefined && (
            <span
              className="inline-flex items-center gap-0.5 text-[11px]"
              style={{ color: "var(--fg-muted)" }}
            >
              <IconStar size={11} className="text-amber-400" />{" "}
              {place.google_rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
