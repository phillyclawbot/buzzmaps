"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { COLLECTIONS } from "@/lib/collections";
import { CATEGORY_FILTERS } from "@/lib/constants";
import { getRecentPlaces, clearRecentPlaces, type RecentPlace } from "@/lib/recent-places";

type ActionKind = "navigate" | "random" | "clear-recents";

interface CommandItem {
  id: string;
  label: string;
  subtitle?: string;
  section: "Places" | "Recent" | "Collections" | "Categories" | "Pages" | "Actions";
  kind: ActionKind;
  href?: string;
}

const PAGES: CommandItem[] = [
  { id: "page-feed", label: "Feed", subtitle: "Home", section: "Pages", kind: "navigate", href: "/" },
  { id: "page-map", label: "Map", subtitle: "Explore pins", section: "Pages", kind: "navigate", href: "/map" },
  { id: "page-collections", label: "Collections", subtitle: "Curated lists", section: "Pages", kind: "navigate", href: "/collections" },
  { id: "page-events", label: "Events", subtitle: "What's on this week", section: "Pages", kind: "navigate", href: "/events" },
  { id: "page-dispatch", label: "Dispatch", subtitle: "Weekly email archive", section: "Pages", kind: "navigate", href: "/digest" },
  { id: "page-stats", label: "Index", subtitle: "The numbers", section: "Pages", kind: "navigate", href: "/stats" },
  { id: "page-about", label: "About", subtitle: "How it's made", section: "Pages", kind: "navigate", href: "/about" },
  { id: "page-submit", label: "Submit a place", subtitle: "Letter to the editor", section: "Pages", kind: "navigate", href: "/submit" },
  { id: "page-account", label: "Account", subtitle: "Saved places", section: "Pages", kind: "navigate", href: "/account" },
  { id: "page-search", label: "Search", subtitle: "Full index", section: "Pages", kind: "navigate", href: "/search" },
];

const ACTIONS: CommandItem[] = [
  {
    id: "action-random",
    label: "Take me somewhere new",
    subtitle: "Open a random place",
    section: "Actions",
    kind: "random",
  },
  {
    id: "action-clear-recents",
    label: "Clear recent places",
    subtitle: "Forgets your in-browser history",
    section: "Actions",
    kind: "clear-recents",
  },
];

function collectionItems(): CommandItem[] {
  return COLLECTIONS.map((c) => ({
    id: `coll-${c.id}`,
    label: c.title,
    subtitle: c.description,
    section: "Collections",
    kind: "navigate",
    href: `/collections/${c.id}`,
  }));
}

function categoryItems(): CommandItem[] {
  return CATEGORY_FILTERS.filter((c) => c.value !== "all").map((c) => ({
    id: `cat-${c.value}`,
    label: c.label,
    subtitle: `All ${c.label.toLowerCase()}`,
    section: "Categories",
    kind: "navigate",
    href: `/category/${c.value}`,
  }));
}

function recentItems(recents: RecentPlace[]): CommandItem[] {
  return recents.map((r) => ({
    id: `recent-${r.name}`,
    label: r.name,
    subtitle: r.category,
    section: "Recent",
    kind: "navigate",
    href: `/place/${encodeURIComponent(r.name)}`,
  }));
}

interface PlaceHit {
  id: number;
  name: string;
  category: string;
  address: string | null;
}

function matches(query: string, item: CommandItem): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  return (
    item.label.toLowerCase().includes(q) ||
    (item.subtitle?.toLowerCase().includes(q) ?? false)
  );
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<PlaceHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(0);
  const [recents, setRecents] = useState<RecentPlace[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  // Keyboard: Cmd/Ctrl+K to open, Esc to close, ? opens shortcut help
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      const typing = tag === "input" || tag === "textarea" || (e.target as HTMLElement | null)?.isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        return;
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
        return;
      }
      // Only fire slash/? outside of input contexts
      if (!typing && !open) {
        if (e.key === "/") {
          e.preventDefault();
          setOpen(true);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Focus input + refresh recents when opened
  useEffect(() => {
    if (!open) return;
    setRecents(getRecentPlaces());
    setTimeout(() => inputRef.current?.focus(), 10);
  }, [open]);

  // Live recents update in the same tab
  useEffect(() => {
    const handler = () => setRecents(getRecentPlaces());
    window.addEventListener("buzzmaps:recent-places:updated", handler);
    return () => window.removeEventListener("buzzmaps:recent-places:updated", handler);
  }, []);

  // Debounced place search
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 3) {
      setPlaces([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await fetch(
          `/api/places/similar?q=${encodeURIComponent(q)}`,
          { signal: ctrl.signal }
        );
        if (res.ok) {
          const data = await res.json();
          setPlaces(Array.isArray(data?.matches) ? data.matches : []);
        }
      } catch {
        /* aborted or network */
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open]);

  // Build the full flat item list (in render order), filtered by query
  const sections = useMemo(() => {
    const placeHits: CommandItem[] = places.map((p) => ({
      id: `place-${p.id}`,
      label: p.name,
      subtitle: p.address ?? p.category,
      section: "Places",
      kind: "navigate",
      href: `/place/${encodeURIComponent(p.name)}`,
    }));

    const allGrouped: Record<string, CommandItem[]> = {
      Places: placeHits,
      Recent: query ? [] : recentItems(recents),
      Collections: collectionItems().filter((c) => matches(query, c)),
      Categories: categoryItems().filter((c) => matches(query, c)),
      Pages: PAGES.filter((c) => matches(query, c)),
      Actions: ACTIONS.filter((c) => matches(query, c)),
    };

    // Drop empty sections
    const entries = Object.entries(allGrouped).filter(
      ([, items]) => items.length > 0
    );
    const flat = entries.flatMap(([, items]) => items);
    return { entries, flat };
  }, [places, query, recents]);

  // Clamp active index whenever the flat list changes
  useEffect(() => {
    setActive(0);
  }, [sections.flat.length]);

  const runAction = async (item: CommandItem) => {
    if (item.kind === "navigate" && item.href) {
      setOpen(false);
      router.push(item.href);
      return;
    }
    if (item.kind === "random") {
      try {
        const res = await fetch("/api/places/random", { cache: "no-store" });
        if (res.ok) {
          const p = await res.json();
          if (p?.name) {
            setOpen(false);
            router.push(`/place/${encodeURIComponent(p.name)}`);
          }
        }
      } catch {
        /* no-op */
      }
      return;
    }
    if (item.kind === "clear-recents") {
      clearRecentPlaces();
      setRecents([]);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, sections.flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = sections.flat[active];
      if (item) runAction(item);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-start justify-center pt-[10vh] px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(20, 18, 17, 0.55)" }}
        onClick={() => setOpen(false)}
      />

      {/* Panel */}
      <div
        className="relative w-full max-w-xl animate-sheet-in"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border-strong)",
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-lg)",
          overflow: "hidden",
        }}
      >
        <div className="flex items-center px-4 py-3" style={{ borderBottom: "1px solid var(--border)" }}>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search places, collections, pages…"
            className="flex-1 bg-transparent outline-none text-base font-serif"
            style={{ color: "var(--fg)" }}
            aria-label="Command palette search"
          />
          {loading && (
            <span className="dateline ml-3" style={{ color: "var(--fg-subtle)" }}>
              searching…
            </span>
          )}
          <kbd
            className="ml-3 px-1.5 py-0.5 text-[10px] font-mono"
            style={{
              background: "var(--bg-sunken)",
              color: "var(--fg-muted)",
              border: "1px solid var(--border)",
              borderRadius: 4,
            }}
          >
            ESC
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {sections.entries.length === 0 && (
            <div className="py-10 text-center">
              <p className="caption" style={{ color: "var(--fg-muted)" }}>
                No matches.
              </p>
            </div>
          )}

          {sections.entries.map(([section, items]) => {
            // Figure out this section's starting index in the flat list for
            // the keyboard cursor highlight.
            const start = sections.flat.indexOf(items[0]);
            return (
              <div key={section}>
                <p
                  className="eyebrow px-4 pt-3 pb-1"
                  style={{ color: "var(--fg-subtle)" }}
                >
                  {section}
                </p>
                <ul>
                  {items.map((item, i) => {
                    const flatIndex = start + i;
                    const isActive = flatIndex === active;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => runAction(item)}
                          onMouseEnter={() => setActive(flatIndex)}
                          className="w-full text-left flex items-baseline gap-3 px-4 py-2.5 transition-colors"
                          style={{
                            background: isActive
                              ? "var(--brand-tint)"
                              : "transparent",
                          }}
                        >
                          <span
                            className="font-serif text-base truncate flex-1"
                            style={{
                              color: isActive ? "var(--brand)" : "var(--fg)",
                            }}
                          >
                            {item.label}
                          </span>
                          {item.subtitle && (
                            <span
                              className="dateline truncate shrink-0 max-w-[45%]"
                              style={{ color: "var(--fg-subtle)" }}
                            >
                              {item.subtitle}
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>

        <div
          className="flex items-center justify-between px-4 py-2"
          style={{
            borderTop: "1px solid var(--border)",
            background: "var(--bg-sunken)",
          }}
        >
          <p className="dateline" style={{ color: "var(--fg-subtle)" }}>
            ↑↓ navigate · ↵ open · esc close
          </p>
          <p className="dateline" style={{ color: "var(--fg-subtle)" }}>
            ⌘K anywhere
          </p>
        </div>
      </div>
    </div>
  );
}
