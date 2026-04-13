"use client";

import Link from "next/link";
import { useEffect } from "react";

type Item = { href: string; label: string; desc: string; emoji: string };

const ITEMS: Item[] = [
  { href: "/digest", label: "Weekly Digest", desc: "Get Toronto's top picks by email", emoji: "📧" },
  { href: "/stats", label: "Stats", desc: "Trends, movers, and totals", emoji: "📊" },
  { href: "/about", label: "About", desc: "How BuzzMaps works", emoji: "ℹ️" },
  { href: "/account", label: "Account", desc: "Sign in & saved places", emoji: "⭐" },
];

export default function MoreMenu({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1100] md:hidden flex items-end"
      role="dialog"
      aria-modal="true"
      aria-label="More options"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: "rgba(15, 23, 42, 0.45)" }}
      />

      {/* Sheet */}
      <div
        className="relative w-full animate-sheet-in rounded-t-2xl overflow-hidden"
        style={{
          background: "var(--bg-elevated)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
          boxShadow: "var(--shadow-lg)",
          borderTop: "1px solid var(--border)",
        }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <span
            className="w-10 h-1.5 rounded-full"
            style={{ background: "var(--border-strong)" }}
          />
        </div>
        <div className="px-4 pb-2">
          <h2
            className="text-xs font-bold uppercase tracking-wider mb-2"
            style={{ color: "var(--fg-subtle)" }}
          >
            More
          </h2>
          <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
            {ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className="flex items-center gap-3 py-3 press-down"
                >
                  <span className="text-xl shrink-0" aria-hidden="true">
                    {item.emoji}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span
                      className="block text-sm font-semibold"
                      style={{ color: "var(--fg)" }}
                    >
                      {item.label}
                    </span>
                    <span
                      className="block text-[11px]"
                      style={{ color: "var(--fg-subtle)" }}
                    >
                      {item.desc}
                    </span>
                  </span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ color: "var(--fg-faint)" }}
                    aria-hidden="true"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
