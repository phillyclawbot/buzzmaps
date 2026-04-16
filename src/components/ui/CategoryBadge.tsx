import { CATEGORY_COLORS } from "@/lib/constants";
import { CategoryIcon } from "@/lib/icons";
import type { PlaceCategory } from "@/lib/types";

const LABELS: Record<string, string> = {
  restaurant: "Food",
  bar: "Bar",
  cafe: "Café",
  club: "Club",
  shop: "Shop",
  park: "Park",
  gym: "Gym",
  venue: "Venue",
  market: "Market",
  museum: "Museum",
  event: "Event",
  landmark: "Landmark",
  attraction: "Attraction",
  other: "Place",
};

/**
 * Pill badge with glyph + label, tinted in the category color.
 */
export default function CategoryBadge({
  category,
  size = "sm",
  showLabel = true,
  variant = "tint",
}: {
  category: PlaceCategory;
  size?: "xs" | "sm" | "md";
  showLabel?: boolean;
  variant?: "tint" | "solid";
}) {
  const color =
    (CATEGORY_COLORS as Record<string, string>)[category] || "var(--fg-muted)";
  const padding =
    size === "xs" ? "3px 8px" : size === "md" ? "6px 12px" : "4px 10px";
  const fontSize = size === "xs" ? 10 : size === "md" ? 12 : 11;
  const iconSize = size === "xs" ? 11 : size === "md" ? 14 : 12;
  const label = LABELS[category] ?? category;

  const styleForVariant: React.CSSProperties =
    variant === "solid"
      ? { background: color, color: "#fff" }
      : { background: `${color}1f`, color };

  return (
    <span
      className="inline-flex items-center gap-1.5 font-display-ui"
      style={{
        padding,
        fontSize,
        fontWeight: 600,
        borderRadius: 9999,
        letterSpacing: "0.02em",
        lineHeight: 1,
        ...styleForVariant,
      }}
    >
      <CategoryIcon
        category={category}
        size={iconSize}
        tone="mono"
        color={variant === "solid" ? "#fff" : color}
      />
      {showLabel && label}
    </span>
  );
}
