import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found — BuzzMaps",
  description: "We couldn't find that place. Try the map or browse by category.",
};

const QUICK_LINKS: { href: string; label: string; emoji: string }[] = [
  { href: "/", label: "Explore the map", emoji: "🗺️" },
  { href: "/category/restaurant", label: "Restaurants", emoji: "🍽️" },
  { href: "/category/bar", label: "Bars", emoji: "🍸" },
  { href: "/category/cafe", label: "Cafes", emoji: "☕" },
  { href: "/collections", label: "Curated collections", emoji: "📚" },
  { href: "/submit", label: "Submit a place", emoji: "➕" },
];

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="max-w-xl w-full text-center">
        <div
          className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6"
          style={{ background: "rgba(255,107,53,0.12)" }}
        >
          <span className="text-4xl" aria-hidden>
            📍
          </span>
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900">
          We couldn&apos;t find that place
        </h1>
        <p className="mt-4 text-slate-600 text-base sm:text-lg">
          The page you&apos;re looking for doesn&apos;t exist, or it may have moved.
          Try one of these instead.
        </p>

        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex flex-col items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-4 text-sm font-medium text-slate-700 hover:border-[var(--accent)] hover:text-[var(--accent)] transition press-down"
            >
              <span className="text-2xl" aria-hidden>
                {link.emoji}
              </span>
              <span>{link.label}</span>
            </Link>
          ))}
        </div>

        <div className="mt-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-white font-semibold shadow-sm hover:brightness-95 press-down"
          >
            Back to the map
          </Link>
        </div>
      </div>
    </main>
  );
}
