import { CATEGORY_COLORS, CATEGORY_COLORS_DARK } from "@/lib/constants";
import type { PlaceCategory } from "@/lib/types";

/**
 * BuzzMaps category + collection glyphs.
 *
 * Duotone SVGs — each icon has a soft filled backdrop in the category color
 * plus a bold motif on top. Designed to feel playful and characterful at
 * both tiny (14px, in pin) and large (56px, in hero) sizes.
 *
 * For UI chrome icons (search, menu, plus, etc.) we use `lucide-react`
 * via `src/lib/icons-lucide.ts`.
 */

// ─────────────────────────────────────────────
// Category glyphs — one per PlaceCategory
// ─────────────────────────────────────────────

// Shared wrapper: lays a soft circular wash + the motif on top.
function Glyph({
  size = 20,
  className = "",
  color,
  children,
  tone = "mono",
}: {
  size?: number;
  className?: string;
  color?: string;
  tone: "solid" | "duotone" | "mono";
  children: React.ReactNode;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      style={tone === "mono" ? { color: "currentColor" } : { color: color ?? "currentColor" }}
      aria-hidden="true"
    >
      {tone === "duotone" && (
        <circle cx="12" cy="12" r="11" fill="currentColor" opacity="0.14" />
      )}
      {tone === "solid" && (
        <circle cx="12" cy="12" r="11" fill="currentColor" />
      )}
      {children}
    </svg>
  );
}

const CATEGORY_GLYPHS: Record<string, React.FC<{ tone: "solid" | "duotone" | "mono" }>> = {
  restaurant: ({ tone }) => (
    <g
      stroke={tone === "solid" ? "#fff" : "currentColor"}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    >
      {/* Fork */}
      <path d="M8 6v6a2 2 0 0 0 2 2h0v4" />
      <path d="M8 6v4" />
      <path d="M10 6v4" />
      <path d="M12 6v4" />
      {/* Knife */}
      <path d="M16 6c-1 1-2 2.6-2 4.5S15 14 16 14v4" />
    </g>
  ),
  bar: ({ tone }) => (
    <g
      stroke={tone === "solid" ? "#fff" : "currentColor"}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    >
      {/* Cocktail glass + olive on pick */}
      <path d="M5 6h14l-7 7-7-7z" />
      <path d="M12 13v5" />
      <path d="M9 18h6" />
      <circle
        cx="15.8"
        cy="5.4"
        r="1"
        fill={tone === "solid" ? "#fff" : "currentColor"}
      />
      <path d="M15.8 5.4 18 3" />
    </g>
  ),
  cafe: ({ tone }) => (
    <g
      stroke={tone === "solid" ? "#fff" : "currentColor"}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    >
      {/* Steam swirls */}
      <path d="M8 3c0 1 1 1.5 1 2.5S8 7 8 8" />
      <path d="M12 3c0 1 1 1.5 1 2.5S12 7 12 8" />
      <path d="M16 3c0 1 1 1.5 1 2.5s-1 1.5-1 2.5" />
      {/* Mug */}
      <path d="M5 10h11v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4v-5z" />
      <path d="M16 12h2a2.5 2.5 0 0 1 0 5h-2" />
    </g>
  ),
  club: ({ tone }) => (
    <g
      stroke={tone === "solid" ? "#fff" : "currentColor"}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    >
      {/* Disco ball with sparkles */}
      <circle cx="12" cy="12" r="5.5" />
      <path d="M6.5 12h11" />
      <path d="M12 6.5v11" />
      <path d="M8 8l8 8" />
      <path d="M16 8l-8 8" />
      <path d="M12 3v1.5" />
      <path d="M19 5l-.8.8" />
      <path d="M5 5l.8.8" />
    </g>
  ),
  shop: ({ tone }) => (
    <g
      stroke={tone === "solid" ? "#fff" : "currentColor"}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    >
      {/* Shopping bag */}
      <path d="M5 8h14l-1 11a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 8z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </g>
  ),
  park: ({ tone }) => (
    <g
      stroke={tone === "solid" ? "#fff" : "currentColor"}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    >
      {/* Pine tree */}
      <path d="M12 3l4 5h-2.5L16 11h-2.5L16 14H8l2.5-3H8l2.5-3H8l4-5z" />
      <path d="M12 14v6" />
      <path d="M9 20h6" />
    </g>
  ),
  gym: ({ tone }) => (
    <g
      stroke={tone === "solid" ? "#fff" : "currentColor"}
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    >
      {/* Dumbbell */}
      <path d="M3 10v4" />
      <path d="M21 10v4" />
      <rect x="5" y="8" width="3" height="8" rx="0.8" />
      <rect x="16" y="8" width="3" height="8" rx="0.8" />
      <path d="M8 12h8" />
    </g>
  ),
  venue: ({ tone }) => (
    <g
      stroke={tone === "solid" ? "#fff" : "currentColor"}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    >
      {/* Ticket */}
      <path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V9z" />
      <path d="M14 7v2" />
      <path d="M14 13v2" />
      <path d="M14 17v0" />
    </g>
  ),
  market: ({ tone }) => (
    <g
      stroke={tone === "solid" ? "#fff" : "currentColor"}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    >
      {/* Striped awning + stand */}
      <path d="M4 8h16v3H4z" />
      <path d="M8 8v3" />
      <path d="M12 8v3" />
      <path d="M16 8v3" />
      <path d="M6 11v8" />
      <path d="M18 11v8" />
      <path d="M6 15h12" />
    </g>
  ),
  museum: ({ tone }) => (
    <g
      stroke={tone === "solid" ? "#fff" : "currentColor"}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    >
      {/* Greek pediment */}
      <path d="M3 10 12 4l9 6" />
      <path d="M4 10v10" />
      <path d="M20 10v10" />
      <path d="M3 20h18" />
      <path d="M8 14v4" />
      <path d="M12 14v4" />
      <path d="M16 14v4" />
    </g>
  ),
  event: ({ tone }) => (
    <g
      stroke={tone === "solid" ? "#fff" : "currentColor"}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    >
      {/* Calendar + confetti */}
      <rect x="4" y="6" width="16" height="14" rx="2" />
      <path d="M4 10h16" />
      <path d="M8 4v4" />
      <path d="M16 4v4" />
      <circle
        cx="9"
        cy="14"
        r="0.8"
        fill={tone === "solid" ? "#fff" : "currentColor"}
      />
      <circle
        cx="13"
        cy="16"
        r="0.8"
        fill={tone === "solid" ? "#fff" : "currentColor"}
      />
      <circle
        cx="15"
        cy="13"
        r="0.8"
        fill={tone === "solid" ? "#fff" : "currentColor"}
      />
    </g>
  ),
  landmark: ({ tone }) => (
    <g
      stroke={tone === "solid" ? "#fff" : "currentColor"}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    >
      {/* CN Tower silhouette */}
      <path d="M12 3v3" />
      <path d="M10 6h4v3h-4z" />
      <path d="M11 9h2v11h-2z" />
      <path d="M8 20h8" />
      <path d="M9 12h6" />
    </g>
  ),
  attraction: ({ tone }) => (
    <g
      stroke={tone === "solid" ? "#fff" : "currentColor"}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    >
      {/* Ferris wheel */}
      <circle cx="12" cy="11" r="7" />
      <circle
        cx="12"
        cy="11"
        r="1.2"
        fill={tone === "solid" ? "#fff" : "currentColor"}
      />
      <path d="M12 4v14" />
      <path d="M5 11h14" />
      <path d="M7 16l10-10" />
      <path d="M17 16L7 6" />
      <path d="M8 20h8" />
    </g>
  ),
  other: ({ tone }) => (
    <g
      stroke={tone === "solid" ? "#fff" : "currentColor"}
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    >
      {/* Compass */}
      <circle cx="12" cy="12" r="8" />
      <path d="m14.8 9.2-1.8 4.8-4.8 1.8 1.8-4.8 4.8-1.8z" />
    </g>
  ),
};

export function CategoryIcon({
  category,
  size = 16,
  className = "",
  tone = "mono",
  color,
}: {
  category: string;
  size?: number;
  className?: string;
  tone?: "solid" | "duotone" | "mono";
  color?: string;
}) {
  const Glyphable = CATEGORY_GLYPHS[category] || CATEGORY_GLYPHS.other;
  const resolvedColor =
    color ??
    (CATEGORY_COLORS as Record<string, string>)[category] ??
    "currentColor";
  return (
    <Glyph size={size} className={className} color={resolvedColor} tone={tone}>
      <Glyphable tone={tone} />
    </Glyph>
  );
}

/** Pure motif (no wash circle) — used inside pin teardrops etc. */
export function CategoryGlyphMark({
  category,
  size = 14,
  color = "#fff",
}: {
  category: string;
  size?: number;
  color?: string;
}) {
  const Glyphable = CATEGORY_GLYPHS[category] || CATEGORY_GLYPHS.other;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      style={{ color }}
      aria-hidden="true"
    >
      <Glyphable tone="solid" />
    </svg>
  );
}

export function categoryColor(category: string): string {
  return (
    (CATEGORY_COLORS as Record<string, string>)[category] ??
    CATEGORY_COLORS.other
  );
}

export function categoryColorDark(category: string): string {
  return (
    (CATEGORY_COLORS_DARK as Record<string, string>)[category] ??
    CATEGORY_COLORS_DARK.other
  );
}

export function categoryGradient(category: PlaceCategory | string): string {
  const c = categoryColor(category);
  const d = categoryColorDark(category);
  return `linear-gradient(135deg, ${c} 0%, ${d} 100%)`;
}

// ─────────────────────────────────────────────
// Collection icons — curated themed motifs
// ─────────────────────────────────────────────

const COLLECTION_GLYPHS: Record<
  string,
  (props: { size?: number; className?: string }) => React.ReactElement
> = {
  buzzing: ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="g-buzzing" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff5b3a" />
          <stop offset="1" stopColor="#ff8a3d" />
        </linearGradient>
      </defs>
      <path
        d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"
        fill="url(#g-buzzing)"
      />
      <path
        d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"
        stroke="#ff5b3a"
        strokeWidth="1.2"
        strokeLinejoin="round"
        opacity="0.6"
      />
    </svg>
  ),
  coffee: ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M6 3c0 1.2 1 1.8 1 3s-1 1.8-1 3" stroke="#6366f1" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M10 3c0 1.2 1 1.8 1 3s-1 1.8-1 3" stroke="#6366f1" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M14 3c0 1.2 1 1.8 1 3s-1 1.8-1 3" stroke="#6366f1" strokeWidth="1.6" strokeLinecap="round" />
      <path
        d="M3 10h14v6a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5v-6z"
        fill="#6366f1"
        opacity="0.18"
      />
      <path
        d="M3 10h14v6a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5v-6z"
        stroke="#6366f1"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M17 12h2a3 3 0 0 1 0 6h-2" stroke="#6366f1" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  parks: ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 22V14" stroke="#047857" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M5 13l7-10 7 10H5z" fill="#10b981" opacity="0.22" stroke="#10b981" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M8 17l4-6 4 6H8z" fill="#10b981" opacity="0.4" stroke="#10b981" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="18" cy="6" r="1.2" fill="#f59e0b" />
    </svg>
  ),
  bars: ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M5 5l7 7 7-7H5z" fill="#8b5cf6" opacity="0.22" stroke="#8b5cf6" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 12v7" stroke="#8b5cf6" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M9 19h6" stroke="#8b5cf6" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="16" cy="3.8" r="1" fill="#8b5cf6" />
      <path d="M16 3.8 18 2" stroke="#8b5cf6" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  shops: ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M5 8h14l-1 12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 8z" fill="#06b6d4" opacity="0.18" stroke="#06b6d4" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" stroke="#06b6d4" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  kensington: ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" fill="#f59e0b" opacity="0.22" stroke="#f59e0b" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M9 22v-8h6v8" stroke="#f59e0b" strokeWidth="1.8" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="1" fill="#f59e0b" />
    </svg>
  ),
  danforth: ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M18 9h1a3 3 0 0 1 0 6h-1" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M2 9h16v8a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V9z"
        fill="#ef4444"
        opacity="0.15"
        stroke="#ef4444"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M6 2v3M10 2v3M14 2v3" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  ),
  chinatown: ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 2C9 7 4 9 4 14a8 8 0 0 0 16 0c0-5-5-7-8-12z"
        fill="#dc2626"
        opacity="0.2"
        stroke="#dc2626"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="14" r="1" fill="#dc2626" />
    </svg>
  ),
  "little-italy": ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#16a34a" opacity="0.18" />
      <circle cx="12" cy="12" r="10" stroke="#16a34a" strokeWidth="1.8" />
      <path d="M12 7v10M7 12h10" stroke="#16a34a" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="12" cy="12" r="2" fill="#16a34a" />
    </svg>
  ),
  ramen: ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M3 12h18" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M5 12v4a7 7 0 0 0 14 0v-4"
        fill="#f97316"
        opacity="0.18"
        stroke="#f97316"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M7 5c0 2 2 3 2 5M12 4c0 2 2 3 2 5M17 5c0 2 2 3 2 5"
        stroke="#f97316"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="12" cy="14" r="1.2" fill="#f97316" />
    </svg>
  ),
  museums: ({ size = 24, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M3 10 12 4l9 6" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 10h16" stroke="#3b82f6" strokeWidth="1.8" />
      <path d="M4 10v10h16V10" stroke="#3b82f6" strokeWidth="1.8" fill="#3b82f6" fillOpacity="0.1" />
      <path d="M4 20h16" stroke="#3b82f6" strokeWidth="1.8" />
      <path d="M8 14v4M12 14v4M16 14v4" stroke="#3b82f6" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  ),
};

export function CollectionIcon({
  id,
  size = 24,
  className = "",
}: {
  id: string;
  size?: number;
  className?: string;
}) {
  const Icon = COLLECTION_GLYPHS[id];
  if (Icon) return <Icon size={size} className={className} />;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="4"
        fill="currentColor"
        opacity="0.18"
      />
      <path
        d="M8 12h8M12 8v8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
