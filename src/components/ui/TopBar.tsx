import type { ReactNode } from "react";
import Logo from "./Logo";
import BackLink from "./BackLink";

/**
 * Editorial mobile top bar (desktop uses SiteHeader).
 * Back arrow · logo · serif section title.
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
  return (
    <div
      className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 flex items-center px-4 gap-3"
      style={{
        background: "color-mix(in srgb, var(--bg) 95%, transparent)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {showBack ? <BackLink href={back} label={backLabel} /> : <Logo size="sm" />}

      {showBack && (
        <>
          <span className="hidden sm:inline" style={{ color: "var(--fg-faint)" }}>·</span>
          <Logo size="sm" className="hidden sm:inline-flex" />
        </>
      )}

      {title && (
        <>
          <span
            className="inline-block w-px h-3 ml-1"
            style={{ background: "var(--fg-faint)" }}
            aria-hidden="true"
          />
          <span
            className="font-display text-[15px] truncate"
            style={{ color: "var(--fg)", fontWeight: 500 }}
          >
            {title}
          </span>
        </>
      )}

      {right && <div className="ml-auto flex items-center gap-2">{right}</div>}
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
