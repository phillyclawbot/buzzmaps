import type { ReactNode } from "react";
import Link from "next/link";
import Logo from "./Logo";
import BackLink from "./BackLink";
import { Search } from "@/lib/icons-lucide";

/**
 * Mobile top bar (desktop uses SiteHeader).
 * Floating rounded chrome: back pill · logo · title · right slot.
 *
 * If `right` is not provided we drop in a default Search affordance,
 * since BottomNav has no search slot — this is mobile's only built-in
 * way to reach /search without ⌘K.
 */
export default function TopBar({
  title,
  back = "/",
  backLabel = "Back",
  showBack = true,
  right,
}: {
  title?: string;
  back?: string;
  backLabel?: string;
  showBack?: boolean;
  right?: ReactNode;
}) {
  const rightSlot =
    right ?? (
      <Link
        href="/search"
        prefetch
        aria-label="Search"
        className="btn-ghost !p-2.5 !rounded-full"
        style={{ color: "var(--fg-muted)" }}
      >
        <Search size={17} />
      </Link>
    );

  return (
    <div
      className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 flex items-center gap-3 px-3"
      style={{
        background: "color-mix(in srgb, var(--bg) 85%, transparent)",
        backdropFilter: "saturate(180%) blur(18px)",
        WebkitBackdropFilter: "saturate(180%) blur(18px)",
        borderBottom: "1px solid color-mix(in srgb, var(--border) 70%, transparent)",
      }}
    >
      {showBack ? <BackLink href={back} label={backLabel} /> : <Logo size="sm" />}

      {showBack && <Logo size="sm" className="hidden sm:inline-flex" />}

      {title && (
        <span
          className="font-display text-[17px] truncate"
          style={{ color: "var(--fg)", letterSpacing: "-0.01em" }}
        >
          {title}
        </span>
      )}

      <div className="ml-auto flex items-center gap-2">{rightSlot}</div>
    </div>
  );
}

/**
 * Spacer that pushes content below the fixed top chrome.
 * Mobile TopBar = 56px (h-14), desktop SiteHeader = 64px (h-16).
 */
export function TopBarOffset() {
  return <div className="h-14 md:h-16" aria-hidden="true" />;
}
