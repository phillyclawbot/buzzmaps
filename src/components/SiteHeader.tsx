"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./ui/Logo";

type NavLink = { href: string; label: string; match: (p: string) => boolean };

const LINKS: NavLink[] = [
  { href: "/", label: "Explore", match: (p) => p === "/" },
  { href: "/collections", label: "Collections", match: (p) => p.startsWith("/collections") },
  { href: "/digest", label: "Digest", match: (p) => p.startsWith("/digest") },
  { href: "/stats", label: "Stats", match: (p) => p.startsWith("/stats") },
  { href: "/about", label: "About", match: (p) => p.startsWith("/about") },
];

/**
 * Desktop-only persistent header. Hidden on mobile (the BottomNav takes
 * over). Also hides itself on pages that already render a TopBar of their
 * own, to avoid a double header.
 *
 * Pages that render their own chrome (static routes like /about, /digest,
 * etc.) opt out by setting <body data-chrome="page">, but by default we
 * render the header on the home map and anywhere with an undecorated body.
 */
export default function SiteHeader() {
  const pathname = usePathname();

  // Home ("/") renders its own app-specific chrome (view toggle, filters,
  // map search). Don't stack a second header on top of it. Every other route
  // gets the persistent site header on desktop.
  if (pathname === "/") return null;

  return (
    <header
      className="hidden md:flex fixed top-0 left-0 right-0 z-[900] h-14 items-center gap-6 px-6 border-b"
      style={{
        background: "color-mix(in srgb, var(--bg-elevated) 92%, transparent)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        borderColor: "var(--border)",
      }}
      aria-label="Primary"
    >
      <Logo />

      <nav className="flex items-center gap-1">
        {LINKS.map((l) => {
          const active = l.match(pathname);
          return (
            <Link
              key={l.href}
              href={l.href}
              prefetch
              className="px-3 py-1.5 rounded-full text-sm font-medium transition-colors"
              style={{
                color: active ? "var(--brand)" : "var(--fg-muted)",
                background: active ? "var(--brand-tint)" : "transparent",
              }}
              aria-current={active ? "page" : undefined}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <Link
          href="/search"
          prefetch
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors focus-ring"
          style={{
            color: "var(--fg-muted)",
            background: "var(--bg-sunken)",
            border: "1px solid var(--border)",
          }}
          aria-label="Search"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span className="hidden lg:inline">Search</span>
        </Link>

        <Link
          href="/submit"
          prefetch
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold transition-opacity hover:opacity-90 focus-ring"
          style={{
            backgroundImage: "linear-gradient(135deg, var(--brand), var(--brand-hover))",
            color: "var(--fg-inverse)",
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Submit
        </Link>

        <Link
          href="/account"
          prefetch
          className="inline-flex items-center justify-center w-9 h-9 rounded-full transition-colors focus-ring"
          style={{
            background: pathname.startsWith("/account") ? "var(--brand-tint)" : "var(--bg-sunken)",
            color: pathname.startsWith("/account") ? "var(--brand)" : "var(--fg-muted)",
            border: "1px solid var(--border)",
          }}
          aria-label="Account"
          aria-current={pathname.startsWith("/account") ? "page" : undefined}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </Link>
      </div>
    </header>
  );
}
