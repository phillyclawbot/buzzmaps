"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import MoreMenu from "./MoreMenu";

export default function BottomNav() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [moreOpen, setMoreOpen] = useState(false);

  // Close the "more" sheet on route change
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  const switchView = (target: "map" | "list") => {
    if (isHome) {
      window.dispatchEvent(new CustomEvent("buzzmaps:setview", { detail: target }));
    } else {
      window.location.href = target === "list" ? "/?view=list" : "/";
    }
  };

  const itemStyle = (active: boolean) =>
    ({ color: active ? "var(--brand)" : "var(--fg-subtle)" }) as React.CSSProperties;

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-[1000] md:hidden flex items-stretch border-t"
        style={{
          background: "color-mix(in srgb, var(--bg-elevated) 95%, transparent)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          borderColor: "var(--border)",
          height: "56px",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
        aria-label="Primary"
      >
        <button
          type="button"
          onClick={() => switchView("map")}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 press-down"
          style={itemStyle(isHome)}
          aria-label="Explore map"
          aria-current={isHome ? "page" : undefined}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
            <line x1="8" y1="2" x2="8" y2="18" />
            <line x1="16" y1="6" x2="16" y2="22" />
          </svg>
          <span style={{ fontSize: "10px", fontWeight: 600 }}>Explore</span>
        </button>

        <button
          type="button"
          onClick={() => switchView("list")}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 press-down"
          style={itemStyle(false)}
          aria-label="List view"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          <span style={{ fontSize: "10px", fontWeight: 600 }}>List</span>
        </button>

        <Link
          href="/collections"
          prefetch
          className="flex-1 flex flex-col items-center justify-center gap-0.5 press-down"
          style={itemStyle(pathname.startsWith("/collections"))}
          aria-label="Collections"
          aria-current={pathname.startsWith("/collections") ? "page" : undefined}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
          </svg>
          <span style={{ fontSize: "10px", fontWeight: 600 }}>Collections</span>
        </Link>

        <Link
          href="/submit"
          prefetch
          className="flex-1 flex flex-col items-center justify-center gap-0.5 press-down"
          style={itemStyle(pathname === "/submit")}
          aria-label="Submit a place"
          aria-current={pathname === "/submit" ? "page" : undefined}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span style={{ fontSize: "10px", fontWeight: 600 }}>Submit</span>
        </Link>

        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 press-down"
          style={itemStyle(moreOpen)}
          aria-label="More"
          aria-haspopup="dialog"
          aria-expanded={moreOpen}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="1" />
            <circle cx="19" cy="12" r="1" />
            <circle cx="5" cy="12" r="1" />
          </svg>
          <span style={{ fontSize: "10px", fontWeight: 600 }}>More</span>
        </button>
      </nav>

      <MoreMenu open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}
