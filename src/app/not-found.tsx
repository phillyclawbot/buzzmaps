import Link from "next/link";
import type { Metadata } from "next";
import { LayoutGrid, Map as MapIcon, Plus } from "@/lib/icons-lucide";
import { CategoryIcon } from "@/lib/icons";
import GradientMesh from "@/components/ui/GradientMesh";
import type { PlaceCategory } from "@/lib/types";
import { CATEGORY_COLORS } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Page not found — BuzzMaps",
  description: "We couldn't find that place. Try the map or browse by category.",
};

type LucideIcon = typeof MapIcon;

type QuickLink =
  | { href: string; label: string; kind: "category"; category: PlaceCategory }
  | { href: string; label: string; kind: "lucide"; icon: LucideIcon; tone: string };

const QUICK_LINKS: QuickLink[] = [
  { href: "/map", label: "Map", kind: "lucide", icon: MapIcon, tone: "var(--map)" },
  { href: "/category/restaurant", label: "Restaurants", kind: "category", category: "restaurant" },
  { href: "/category/bar", label: "Bars", kind: "category", category: "bar" },
  { href: "/category/cafe", label: "Cafés", kind: "category", category: "cafe" },
  { href: "/collections", label: "Collections", kind: "lucide", icon: LayoutGrid, tone: "var(--plum)" },
  { href: "/submit", label: "Submit a place", kind: "lucide", icon: Plus, tone: "var(--brand)" },
];

export default function NotFound() {
  return (
    <main
      className="min-h-screen flex items-center justify-center px-6 py-16 page-enter"
      style={{ background: "var(--bg)" }}
    >
      <GradientMesh tone="warm" />
      <div className="max-w-xl w-full text-center relative">
        <p className="eyebrow mb-3" style={{ color: "var(--brand)" }}>
          404 — Off the map
        </p>
        <h1
          className="font-display text-5xl sm:text-6xl md:text-7xl text-gradient-brand"
          style={{ fontWeight: 500, lineHeight: 1, letterSpacing: "-0.02em" }}
        >
          Lost the trail.
        </h1>
        <p
          className="mt-6 max-w-md mx-auto text-base sm:text-lg"
          style={{ color: "var(--fg-muted)" }}
        >
          We couldn&apos;t find that place. It may have moved, been renamed, or
          never existed. Try one of these instead.
        </p>

        <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {QUICK_LINKS.map((link) => {
            const tone =
              link.kind === "category"
                ? (CATEGORY_COLORS as Record<string, string>)[link.category]
                : link.tone;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="chip-pill flex-col gap-2 py-4"
                style={{ borderRadius: "var(--radius-lg)" }}
              >
                <span
                  aria-hidden
                  className="inline-flex items-center justify-center"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "var(--radius-md)",
                    background: `${tone}1f`,
                    color: tone,
                  }}
                >
                  {link.kind === "category" ? (
                    <CategoryIcon
                      category={link.category}
                      size={18}
                      tone="mono"
                      color={tone}
                    />
                  ) : (
                    <link.icon size={18} strokeWidth={2.2} />
                  )}
                </span>
                <span className="font-display-ui text-[13px] font-semibold">
                  {link.label}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="mt-10 flex items-center justify-center gap-3">
          <Link href="/" className="btn-primary">
            Back to the map
          </Link>
          <Link href="/search" className="btn-secondary">
            Search instead
          </Link>
        </div>
      </div>
    </main>
  );
}
