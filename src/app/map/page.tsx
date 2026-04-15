"use client";

import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  Suspense,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { Place, PlaceCategory } from "@/lib/types";
import { CATEGORY_FILTERS, VALID_CATEGORIES } from "@/lib/constants";
import { haversineDistance } from "@/lib/utils";

// MapView is client-only (Leaflet needs window). Dynamic import with no SSR.
const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div
      className="h-full w-full flex items-center justify-center"
      style={{ background: "var(--bg-sunken)" }}
    >
      <p className="caption" style={{ color: "var(--fg-muted)" }}>
        Loading map…
      </p>
    </div>
  ),
});

type Category = (typeof VALID_CATEGORIES)[number] | "all";

function MapPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initial category from URL, so /map?category=bar deep-links
  const urlCategory = searchParams.get("category");
  const initialCategory: Category =
    urlCategory && (VALID_CATEGORIES as readonly string[]).includes(urlCategory)
      ? (urlCategory as Category)
      : "all";

  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [category, setCategory] = useState<Category>(initialCategory);
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null);
  const [nearMeActive, setNearMeActive] = useState(false);
  const [nearMeCoords, setNearMeCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [nearMeRadius, setNearMeRadius] = useState(2);

  const highlightedPlace = useRef<string | null>(null);

  // Fetch whenever the category changes — the API filters server-side.
  const fetchData = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (category !== "all") params.set("category", category);
        params.set("limit", "2000");
        const res = await fetch(`/api/places?${params}`, { signal });
        const data = await res.json();
        if (Array.isArray(data)) setPlaces(data);
        setFetchError(false);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        console.error("[map] fetch failed:", err);
        setFetchError(true);
      } finally {
        setLoading(false);
      }
    },
    [category]
  );

  useEffect(() => {
    const ctrl = new AbortController();
    fetchData(ctrl.signal);
    return () => ctrl.abort();
  }, [fetchData]);

  // Reflect category changes in the URL without a page reload
  useEffect(() => {
    const current = new URLSearchParams(window.location.search);
    if (category === "all") current.delete("category");
    else current.set("category", category);
    const qs = current.toString();
    const nextUrl = qs ? `/map?${qs}` : "/map";
    if (window.location.pathname + window.location.search !== nextUrl) {
      window.history.replaceState({}, "", nextUrl);
    }
  }, [category]);

  // Handle ?place=Foo — fly to the pin once places are loaded
  useEffect(() => {
    const placeName = searchParams.get("place");
    if (!placeName || places.length === 0) return;
    if (highlightedPlace.current === placeName) return;
    highlightedPlace.current = placeName;
    const found = places.find(
      (r) => r.name.toLowerCase() === placeName.toLowerCase()
    );
    if (found) {
      setFlyTo([found.lat, found.lng]);
      setTimeout(() => setFlyTo(null), 100);
      router.replace("/map", { scroll: false });
    }
  }, [searchParams, places, router]);

  // Filter: category is DB-filtered; near-me is client-side
  const filteredPlaces = useMemo(() => {
    let items = places;
    if (nearMeActive && nearMeCoords) {
      const { lat, lng } = nearMeCoords;
      items = items.filter(
        (p) => haversineDistance(lat, lng, p.lat, p.lng) <= nearMeRadius * 1000
      );
    }
    return items;
  }, [places, nearMeActive, nearMeCoords, nearMeRadius]);

  const handleNearMeToggle = useCallback(
    (coords: { lat: number; lng: number } | null) => {
      setNearMeCoords(coords);
      setNearMeActive(coords !== null);
    },
    []
  );

  return (
    <div
      className="h-full w-full relative overflow-hidden"
      style={{ background: "var(--bg)" }}
    >
      {/* ─── Slim top chrome ─── */}
      <div
        className="absolute top-0 left-0 right-0 z-[800]"
        style={{
          background:
            "color-mix(in srgb, var(--bg) 92%, transparent)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        {/* Row 1: back link · wordmark · search hint */}
        <div className="h-12 flex items-center gap-4 px-4 md:px-6">
          <Link
            href="/"
            className="eyebrow ink-underline inline-flex items-center gap-1.5"
            style={{ color: "var(--fg-muted)" }}
            aria-label="Back to feed"
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
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            <span className="hidden sm:inline">Feed</span>
          </Link>

          <span
            aria-hidden="true"
            className="hidden sm:inline"
            style={{ color: "var(--fg-faint)" }}
          >
            ·
          </span>

          <span
            className="hidden sm:inline font-display tracking-tight"
            style={{ color: "var(--fg)", fontWeight: 500, fontSize: 14 }}
          >
            Map
          </span>

          <p
            className="hidden md:block dateline truncate ml-auto"
            style={{ color: "var(--fg-subtle)" }}
          >
            {loading
              ? "Loading…"
              : fetchError
              ? "Couldn't load places"
              : `${filteredPlaces.length.toLocaleString()} ${
                  filteredPlaces.length === 1 ? "place" : "places"
                }`}
          </p>

          <button
            type="button"
            className="ml-auto md:ml-4 inline-flex items-center gap-2 press-down"
            style={{ color: "var(--fg-muted)" }}
            onClick={() => {
              // Dispatch a synthetic keystroke so CommandPalette (in layout) opens.
              const ev = new KeyboardEvent("keydown", {
                key: "k",
                metaKey: true,
                bubbles: true,
              });
              window.dispatchEvent(ev);
            }}
            aria-label="Open command palette (Cmd+K)"
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
            <span className="eyebrow hidden sm:inline">Search</span>
            <kbd
              className="font-mono px-1.5 py-0.5 text-[10px] hidden md:inline"
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
          </button>
        </div>

        {/* Row 2: category pill rail */}
        <div
          className="flex items-center gap-1 overflow-x-auto no-scrollbar px-4 md:px-6 py-2"
          style={{ borderTop: "1px solid var(--border)" }}
          role="tablist"
          aria-label="Filter by category"
        >
          {CATEGORY_FILTERS.map((opt) => {
            const active = category === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setCategory(opt.value as Category)}
                className="shrink-0 press-down transition-colors"
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  fontFamily: "var(--font-sans)",
                  fontSize: 12,
                  fontWeight: 500,
                  letterSpacing: "0.02em",
                  border: "1px solid",
                  borderColor: active ? "var(--fg)" : "var(--border)",
                  background: active ? "var(--fg)" : "transparent",
                  color: active ? "var(--fg-inverse)" : "var(--fg-muted)",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Map canvas ─── */}
      <div
        className="absolute left-0 right-0"
        style={{
          top: "calc(48px + 44px)", // top bar + pill row
          bottom: "0",
          // Mobile BottomNav takes the bottom 60px + safe-area; pad so the
          // NearMe FAB stays above it.
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <style>{`
          @media (max-width: 767px) {
            .mv-canvas { bottom: 60px !important; }
          }
        `}</style>
        <div className="mv-canvas absolute inset-0">
          <MapView
            places={filteredPlaces}
            flyTo={flyTo}
            onNearMeToggle={handleNearMeToggle}
            nearMeActive={nearMeActive}
            nearMeRadius={nearMeRadius}
            onRadiusChange={setNearMeRadius}
            nearMeCount={filteredPlaces.length}
          />
        </div>
      </div>

      {/* Error toast */}
      {fetchError && (
        <div
          className="absolute top-[104px] left-1/2 -translate-x-1/2 z-[900] animate-sheet-in"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--sent-neg)",
            borderRadius: "var(--radius-sm)",
            padding: "10px 14px",
            boxShadow: "var(--shadow-md)",
          }}
          role="alert"
        >
          <p
            className="dateline inline-flex items-center gap-3"
            style={{ color: "var(--sent-neg)" }}
          >
            Couldn&apos;t load the map data
            <button
              type="button"
              onClick={() => fetchData()}
              className="eyebrow ink-underline"
              style={{ color: "var(--fg-muted)" }}
            >
              Retry →
            </button>
          </p>
        </div>
      )}

      {/* Empty state — no pins for this filter */}
      {!loading && !fetchError && filteredPlaces.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[400]">
          <div
            className="pointer-events-auto text-center px-6 py-5"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-md)",
              maxWidth: 320,
            }}
          >
            <p
              className="eyebrow mb-2"
              style={{ color: "var(--fg-subtle)" }}
            >
              Nothing here
            </p>
            <h2
              className="font-display text-xl mb-3"
              style={{ color: "var(--fg)", fontWeight: 500 }}
            >
              {nearMeActive
                ? `No ${category === "all" ? "places" : category} within ${nearMeRadius}km.`
                : `No ${category === "all" ? "places" : category} to show.`}
            </h2>
            <button
              type="button"
              onClick={() => {
                setCategory("all");
                if (nearMeActive) handleNearMeToggle(null);
              }}
              className="eyebrow ink-underline"
              style={{ color: "var(--brand)" }}
            >
              Clear filters →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div
          className="h-full w-full flex items-center justify-center"
          style={{ background: "var(--bg)" }}
        >
          <p className="caption" style={{ color: "var(--fg-muted)" }}>
            Loading map…
          </p>
        </div>
      }
    >
      <MapPage />
    </Suspense>
  );
}
