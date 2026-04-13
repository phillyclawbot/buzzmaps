"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import MoreMenu from "./MoreMenu";

export default function BottomNav() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [moreOpen, setMoreOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  if (moreOpen && openedAt !== null && openedAt !== pathname) {
    setMoreOpen(false);
    setOpenedAt(null);
  }

  const openMore = () => {
    setOpenedAt(pathname);
    setMoreOpen(true);
  };
  const closeMore = () => {
    setMoreOpen(false);
    setOpenedAt(null);
  };

  const itemStyle = (active: boolean): React.CSSProperties => ({
    color: active ? "var(--fg)" : "var(--fg-muted)",
    fontWeight: active ? 600 : 400,
  });

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-[1000] md:hidden flex items-stretch"
        style={{
          background: "color-mix(in srgb, var(--bg) 95%, transparent)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          borderTop: "1px solid var(--border)",
          height: "60px",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
        aria-label="Primary"
      >
        <Link
          href="/"
          className="flex-1 flex flex-col items-center justify-center gap-1 press-down"
          style={itemStyle(isHome)}
          aria-label="Feed"
          aria-current={isHome ? "page" : undefined}
        >
          <span
            className="eyebrow"
            style={{
              color: "inherit",
              fontSize: "10px",
              letterSpacing: "0.16em",
            }}
          >
            Feed
          </span>
          {isHome && (
            <span
              className="inline-block w-1 h-1 rounded-full"
              style={{ background: "var(--brand)" }}
              aria-hidden="true"
            />
          )}
        </Link>

        <Link
          href="/collections"
          prefetch
          className="flex-1 flex flex-col items-center justify-center gap-1 press-down"
          style={itemStyle(pathname.startsWith("/collections"))}
          aria-label="Collections"
          aria-current={pathname.startsWith("/collections") ? "page" : undefined}
        >
          <span
            className="eyebrow"
            style={{
              color: "inherit",
              fontSize: "10px",
              letterSpacing: "0.16em",
            }}
          >
            Lists
          </span>
          {pathname.startsWith("/collections") && (
            <span
              className="inline-block w-1 h-1 rounded-full"
              style={{ background: "var(--brand)" }}
              aria-hidden="true"
            />
          )}
        </Link>

        <Link
          href="/map"
          prefetch
          className="flex-1 flex flex-col items-center justify-center gap-1 press-down"
          style={itemStyle(pathname === "/map")}
          aria-label="Map"
          aria-current={pathname === "/map" ? "page" : undefined}
        >
          <span
            className="eyebrow"
            style={{
              color: "inherit",
              fontSize: "10px",
              letterSpacing: "0.16em",
            }}
          >
            Map
          </span>
          {pathname === "/map" && (
            <span
              className="inline-block w-1 h-1 rounded-full"
              style={{ background: "var(--brand)" }}
              aria-hidden="true"
            />
          )}
        </Link>

        <Link
          href="/submit"
          prefetch
          className="flex-1 flex flex-col items-center justify-center gap-1 press-down"
          style={itemStyle(pathname === "/submit")}
          aria-label="Submit"
          aria-current={pathname === "/submit" ? "page" : undefined}
        >
          <span
            className="eyebrow"
            style={{
              color: "inherit",
              fontSize: "10px",
              letterSpacing: "0.16em",
            }}
          >
            Submit
          </span>
          {pathname === "/submit" && (
            <span
              className="inline-block w-1 h-1 rounded-full"
              style={{ background: "var(--brand)" }}
              aria-hidden="true"
            />
          )}
        </Link>

        <button
          type="button"
          onClick={openMore}
          className="flex-1 flex flex-col items-center justify-center gap-1 press-down"
          style={itemStyle(moreOpen)}
          aria-label="More"
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
        >
          <span
            className="eyebrow"
            style={{
              color: "inherit",
              fontSize: "10px",
              letterSpacing: "0.16em",
            }}
          >
            More
          </span>
          {moreOpen && (
            <span
              className="inline-block w-1 h-1 rounded-full"
              style={{ background: "var(--brand)" }}
              aria-hidden="true"
            />
          )}
        </button>
      </nav>

      <MoreMenu open={moreOpen} onClose={closeMore} />
    </>
  );
}
