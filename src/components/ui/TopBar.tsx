import type { ReactNode } from "react";
import Logo from "./Logo";
import BackLink from "./BackLink";

/**
 * Consistent sticky page header used by all non-home routes.
 *
 * Left:   optional back link
 * Center: Logo · title
 * Right:  optional action slot
 */
export default function TopBar({
  title,
  back = "/",
  backLabel = "Back to map",
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
      className="md:hidden fixed top-0 left-0 right-0 z-50 h-12 flex items-center px-3 sm:px-4 gap-3 border-b"
      style={{
        background: "color-mix(in srgb, var(--bg-elevated) 95%, transparent)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        borderColor: "var(--border)",
      }}
    >
      {showBack ? (
        <BackLink href={back} label={backLabel} />
      ) : (
        <Logo />
      )}

      {showBack && (
        <>
          <span className="hidden sm:inline" style={{ color: "var(--fg-faint)" }}>·</span>
          <Logo className="hidden sm:flex" />
        </>
      )}

      {title && (
        <>
          <span style={{ color: "var(--fg-faint)" }} aria-hidden="true">·</span>
          <span
            className="text-sm font-semibold truncate"
            style={{ color: "var(--fg)" }}
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
 * Spacer to offset page content below the fixed top chrome.
 * Mobile TopBar is h-12 (48px); desktop SiteHeader is h-14 (56px).
 * Use this as the first child of the page container.
 */
export function TopBarOffset() {
  return <div className="h-12 md:h-14" aria-hidden="true" />;
}
