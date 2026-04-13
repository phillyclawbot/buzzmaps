import { CATEGORY_COLORS } from "@/lib/constants";
import { CategoryIcon } from "@/lib/icons";
import type { PlaceCategory } from "@/lib/types";

/**
 * Tinted category pill. Uses CATEGORY_COLORS as the accent, applied at
 * ~12% opacity for background and full opacity for icon + text.
 */
export default function CategoryBadge({
  category,
  size = "sm",
  showLabel = true,
}: {
  category: PlaceCategory;
  size?: "xs" | "sm" | "md";
  showLabel?: boolean;
}) {
  const color = CATEGORY_COLORS[category] || "var(--fg-muted)";
  const px = size === "xs" ? "px-1.5 py-0.5 text-[10px]" : size === "md" ? "px-3 py-1 text-xs" : "px-2 py-0.5 text-[11px]";
  const icon = size === "xs" ? 10 : size === "md" ? 14 : 11;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold ${px}`}
      style={{ background: `${color}1f`, color }}
    >
      <CategoryIcon category={category} size={icon} />
      {showLabel && category}
    </span>
  );
}
