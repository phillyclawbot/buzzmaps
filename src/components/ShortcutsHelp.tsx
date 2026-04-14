"use client";

import { useEffect, useState } from "react";

const SHORTCUTS: Array<{ key: string; label: string }> = [
  { key: "⌘K / Ctrl+K", label: "Open the command palette" },
  { key: "/", label: "Open the command palette" },
  { key: "?", label: "Show this shortcut list" },
  { key: "Esc", label: "Close any open dialog" },
  { key: "↑ ↓", label: "Navigate the palette" },
  { key: "↵", label: "Open the focused item" },
];

export default function ShortcutsHelp() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      const typing =
        tag === "input" ||
        tag === "textarea" ||
        (e.target as HTMLElement | null)?.isContentEditable;
      if (typing) return;

      // "?" is Shift+/ on most layouts. Listen for both.
      if (!open && (e.key === "?" || (e.shiftKey && e.key === "/"))) {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1900] flex items-center justify-center p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onClick={() => setOpen(false)}
    >
      <div
        className="absolute inset-0"
        style={{ background: "rgba(20, 18, 17, 0.55)" }}
      />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md animate-sheet-in"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-strong)",
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-lg)",
          padding: "28px 28px 20px",
        }}
      >
        <p
          className="eyebrow mb-3"
          style={{ color: "var(--brand)" }}
        >
          Keyboard
        </p>
        <h2
          className="font-display text-3xl mb-6"
          style={{ color: "var(--fg)", fontWeight: 500 }}
        >
          Shortcuts.
        </h2>
        <ul>
          {SHORTCUTS.map((s) => (
            <li
              key={s.label}
              className="flex items-baseline justify-between gap-4 py-3"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <span
                className="font-serif text-base"
                style={{ color: "var(--fg)" }}
              >
                {s.label}
              </span>
              <kbd
                className="font-mono text-xs px-2 py-1 shrink-0"
                style={{
                  background: "var(--bg-sunken)",
                  color: "var(--fg-muted)",
                  border: "1px solid var(--border)",
                  borderRadius: 4,
                  letterSpacing: "0.05em",
                }}
              >
                {s.key}
              </kbd>
            </li>
          ))}
        </ul>
        <button
          onClick={() => setOpen(false)}
          className="mt-6 dateline hover:text-[color:var(--brand)] transition-colors"
          style={{ color: "var(--fg-muted)" }}
        >
          Close (Esc)
        </button>
      </div>
    </div>
  );
}
