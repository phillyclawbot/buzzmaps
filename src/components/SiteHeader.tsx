"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, LayoutGroup } from "framer-motion";
import Logo from "./ui/Logo";
import { Search, User, Plus } from "lucide-react";

type NavLink = { href: string; label: string; match: (p: string) => boolean };

const LINKS: NavLink[] = [
  { href: "/", label: "Feed", match: (p) => p === "/" },
  { href: "/map", label: "Map", match: (p) => p === "/map" },
  { href: "/events", label: "Events", match: (p) => p.startsWith("/events") },
  {
    href: "/collections",
    label: "Collections",
    match: (p) => p.startsWith("/collections"),
  },
  {
    href: "/neighbourhoods",
    label: "Atlas",
    match: (p) => p.startsWith("/neighbourhood"),
  },
  { href: "/digest", label: "Dispatch", match: (p) => p.startsWith("/digest") },
];

/**
 * Desktop masthead — floating glass pill with animated active indicator.
 */
export default function SiteHeader() {
  const pathname = usePathname();

  // The map route renders its own chrome; don't stack a second header.
  if (pathname === "/map") return null;

  return (
    <header
      className="hidden md:block fixed top-0 left-0 right-0 z-[900] px-6 pt-4"
      aria-label="Primary"
    >
      <div className="max-w-[1400px] mx-auto flex items-center gap-4">
        <div
          className="glass flex items-center gap-2 rounded-full pl-4 pr-2 h-14 flex-1"
          style={{
            boxShadow: "var(--shadow-md)",
          }}
        >
          <Logo size="md" />

          <LayoutGroup id="primary-nav">
            <nav className="ml-6 flex items-center gap-1">
              {LINKS.map((l) => {
                const active = l.match(pathname);
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    prefetch
                    className="relative inline-flex items-center px-3.5 py-1.5 text-[13.5px] font-display-ui font-semibold rounded-full transition-colors"
                    style={{
                      color: active ? "var(--fg)" : "var(--fg-muted)",
                    }}
                    aria-current={active ? "page" : undefined}
                  >
                    {active && (
                      <motion.span
                        layoutId="nav-active-pill"
                        transition={{
                          type: "spring",
                          stiffness: 380,
                          damping: 30,
                        }}
                        className="absolute inset-0 rounded-full -z-0"
                        style={{
                          background: "var(--bg-sunken)",
                          border: "1px solid var(--border)",
                        }}
                        aria-hidden="true"
                      />
                    )}
                    <span className="relative z-[1]">{l.label}</span>
                  </Link>
                );
              })}
            </nav>
          </LayoutGroup>

          <div className="ml-auto flex items-center gap-1">
            <Link
              href="/search"
              prefetch
              aria-label="Search"
              title="Search (⌘K)"
              className="btn-ghost !p-2.5 !rounded-full"
              style={{ color: "var(--fg-muted)" }}
            >
              <Search size={17} />
            </Link>
            <Link
              href="/account"
              prefetch
              aria-label="Account"
              className="btn-ghost !p-2.5 !rounded-full"
              style={{
                color: pathname.startsWith("/account")
                  ? "var(--fg)"
                  : "var(--fg-muted)",
              }}
            >
              <User size={17} />
            </Link>
          </div>
        </div>

        <Link
          href="/submit"
          prefetch
          className="btn-primary !h-14 !px-5 !rounded-full"
          style={{ boxShadow: "var(--glow-brand)" }}
        >
          <Plus size={17} strokeWidth={2.5} />
          <span>Add a place</span>
        </Link>
      </div>
    </header>
  );
}
