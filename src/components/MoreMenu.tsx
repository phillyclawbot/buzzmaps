"use client";

import Link from "next/link";
import { useEffect } from "react";

type Item = { href: string; label: string; desc: string };

const ITEMS: Item[] = [
  { href: "/digest", label: "Dispatch", desc: "Weekly email. This week's top picks." },
  { href: "/stats", label: "Index", desc: "Trends, movers, totals." },
  { href: "/about", label: "About", desc: "How BuzzMaps works." },
  { href: "/account", label: "Account", desc: "Saved places · sign in." },
];

export default function MoreMenu({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
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
      aria-label="More"
    >
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: "rgba(20, 18, 17, 0.55)" }}
      />

      <div
        className="relative w-full animate-sheet-in overflow-hidden"
        style={{
          background: "var(--bg)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
          boxShadow: "var(--shadow-lg)",
          borderTop: "1px solid var(--border)",
        }}
      >
        <div className="flex justify-center pt-3 pb-2">
          <span
            className="w-10 h-1 rounded-full"
            style={{ background: "var(--border-strong)" }}
          />
        </div>
        <div className="px-6 pt-4 pb-2">
          <p className="eyebrow mb-4">More from BuzzMaps</p>
          <ul>
            {ITEMS.map((item, i) => (
              <li
                key={item.href}
                style={{
                  borderTop: i === 0 ? "1px solid var(--fg)" : "1px solid var(--border)",
                }}
              >
                <Link
                  href={item.href}
                  onClick={onClose}
                  className="flex items-baseline justify-between gap-4 py-4 press-down group"
                >
                  <span className="flex-1 min-w-0">
                    <span
                      className="font-display block text-2xl leading-tight"
                      style={{ color: "var(--fg)", fontWeight: 500 }}
                    >
                      {item.label}
                    </span>
                    <span
                      className="caption block mt-1"
                      style={{ color: "var(--fg-muted)" }}
                    >
                      {item.desc}
                    </span>
                  </span>
                  <span
                    className="eyebrow shrink-0 group-hover:text-[color:var(--brand)] transition-colors"
                    style={{ color: "var(--fg-subtle)" }}
                  >
                    Go →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
