"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./ui/Logo";

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
  { href: "/about", label: "About", match: (p) => p.startsWith("/about") },
];

/**
 * Editorial masthead: wordmark on left, understated inline nav, small
 * actions on the right. No gradients, no pills — newspaper masthead energy.
 * Desktop only; BottomNav covers mobile.
 */
export default function SiteHeader() {
  const pathname = usePathname();

  // The map route renders its own app-specific chrome (view toggles,
  // filters, in-map search). Don't stack a second header on top.
  if (pathname === "/map") return null;

  return (
    <header
      className="hidden md:block fixed top-0 left-0 right-0 z-[900]"
      style={{
        background: "color-mix(in srgb, var(--bg) 92%, transparent)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        borderBottom: "1px solid var(--border)",
      }}
      aria-label="Primary"
    >
      <div className="max-w-[1400px] mx-auto h-16 flex items-baseline gap-10 px-8">
        <Logo size="md" />

        <nav className="flex items-baseline gap-6">
          {LINKS.map((l) => {
            const active = l.match(pathname);
            return (
              <Link
                key={l.href}
                href={l.href}
                prefetch
                className="text-sm transition-colors"
                style={{
                  color: active ? "var(--fg)" : "var(--fg-muted)",
                  fontWeight: active ? 600 : 400,
                  textDecoration: active ? "underline" : "none",
                  textUnderlineOffset: "6px",
                  textDecorationThickness: "1px",
                  textDecorationColor: "var(--brand)",
                }}
                aria-current={active ? "page" : undefined}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-baseline gap-5">
          <Link
            href="/search"
            prefetch
            className="inline-flex items-baseline gap-2 text-sm transition-colors hover:text-[color:var(--fg)]"
            style={{ color: "var(--fg-muted)" }}
            aria-label="Search"
            title="Search (⌘K opens palette)"
          >
            <span>Search</span>
            <kbd
              className="font-mono px-1 py-0.5 text-[10px]"
              style={{
                background: "var(--bg-sunken)",
                color: "var(--fg-subtle)",
                border: "1px solid var(--border)",
                borderRadius: 3,
                lineHeight: 1,
              }}
              aria-hidden="true"
            >
              ⌘K
            </kbd>
          </Link>

          <Link
            href="/submit"
            prefetch
            className="text-sm transition-colors hover:text-[color:var(--fg)]"
            style={{ color: "var(--fg-muted)" }}
          >
            Submit
          </Link>

          <span
            className="inline-block w-px h-4"
            style={{ background: "var(--border)", transform: "translateY(2px)" }}
            aria-hidden="true"
          />

          <Link
            href="/account"
            prefetch
            className="text-sm transition-colors"
            style={{
              color: pathname.startsWith("/account") ? "var(--fg)" : "var(--fg-muted)",
              fontWeight: pathname.startsWith("/account") ? 600 : 400,
            }}
            aria-label="Account"
          >
            Account
          </Link>
        </div>
      </div>
    </header>
  );
}
