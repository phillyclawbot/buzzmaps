"use client";

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import Sidebar from "@/components/Sidebar";
import ListView from "@/components/ListView";
import type { Place, RedditPostWithPlaces, Stats, PlaceCategory } from "@/lib/types";
import { CATEGORY_EMOJI } from "@/lib/types";
import { CATEGORY_FILTERS, CATEGORY_COLORS } from "@/lib/constants";
import { formatLastScraped, haversineDistance } from "@/lib/utils";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-white flex items-center justify-center">
      <div className="text-slate-500 text-sm">Loading map...</div>
    </div>
  ),
});

function Home() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [posts, setPosts] = useState<RedditPostWithPlaces[]>([]);
  const [stats, setStats] = useState<Stats>({ places: 0, posts: 0, last_scraped: null });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [fetchError, setFetchError] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [scrapingPubs, setScrapingPubs] = useState(false);
  const [scrapingEvents, setScrapingEvents] = useState(false);
  const [scrapingAll, setScrapingAll] = useState(false);
  const [fetchingPhotos, setFetchingPhotos] = useState(false);
  const searchParamsRaw = useSearchParams();
  const [view, setView] = useState<"map" | "list">(
    () => (typeof window !== "undefined" && new URLSearchParams(window.location.search).get("view") === "list" ? "list" : "map")
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const [filter, setFilter] = useState<{ since: string; sentiment: string; category: string }>({
    since: "all",
    sentiment: "all",
    category: "all",
  });
  const [mapSearch, setMapSearch] = useState("");
  const [mapSearchInput, setMapSearchInput] = useState("");
  const [mapSearchSuggestions, setMapSearchSuggestions] = useState<Place[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [showLegend, setShowLegend] = useState(false);
  const [thisWeekOnly, setThisWeekOnly] = useState(false);
  const [nearMeActive, setNearMeActive] = useState(false);
  const [nearMeCoords, setNearMeCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [nearMeRadius, setNearMeRadius] = useState(2);
  const [searchOpen, setSearchOpen] = useState(false);
  const [trendingCollapsed, setTrendingCollapsed] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitForm, setSubmitForm] = useState({ name: "", category: "other", address: "", reason: "", eventDate: "", ticketUrl: "" });
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [submitError, setSubmitError] = useState("");
  const mapSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightedPlace = useRef<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Listen for view switch events from BottomNav (avoids URL navigation)
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as "map" | "list";
      setView(detail);
    };
    window.addEventListener("buzzmaps:setview", handler);
    return () => window.removeEventListener("buzzmaps:setview", handler);
  }, []);

  // Keyboard shortcut: "/" opens search, Escape clears/closes
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      if (e.key === "/") {
        e.preventDefault();
        setSearchOpen(true);
        setMenuOpen(false);
        setTimeout(() => searchInputRef.current?.focus(), 0);
      } else if (e.key === "Escape") {
        setSearchQuery("");
        setSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleMapSearchChange = (val: string) => {
    setMapSearchInput(val);
    if (mapSearchTimerRef.current) clearTimeout(mapSearchTimerRef.current);
    mapSearchTimerRef.current = setTimeout(() => setMapSearch(val), 300);
    if (val.trim().length >= 1) {
      const q = val.toLowerCase();
      const suggestions = places
        .filter((r) => r.name.toLowerCase().includes(q))
        .slice(0, 6);
      setMapSearchSuggestions(suggestions);
      setShowSuggestions(true);
    } else {
      setMapSearchSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (r: Place) => {
    handleFlyTo(r.lat, r.lng);
    setMapSearchInput("");
    setMapSearch("");
    setShowSuggestions(false);
    setMapSearchSuggestions([]);
  };

  const sevenDaysAgo = useMemo(() => Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000), []);

  const trendingNow = useMemo(() => places.filter(r => r.latest_mention > Date.now()/1000 - 7*86400).sort((a,b) => b.mention_count - a.mention_count).slice(0, 5), [places]);

  const filteredPlaces = useMemo(() => {
    let items = places;
    if (mapSearch) {
      const q = mapSearch.toLowerCase();
      items = items.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.address.toLowerCase().includes(q)
      );
    }
    if (thisWeekOnly) {
      items = items.filter((r) => r.latest_mention >= sevenDaysAgo);
    }
    if (nearMeActive && nearMeCoords) {
      const { lat, lng } = nearMeCoords;
      items = items.filter((r) => {
        return haversineDistance(lat, lng, r.lat, r.lng) <= nearMeRadius * 1000;
      });
    }
    return items;
  }, [places, mapSearch, thisWeekOnly, sevenDaysAgo, nearMeActive, nearMeCoords, nearMeRadius]);

  const fetchData = useCallback(async (background = false) => {
    if (!background) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.since !== "all") params.set("since", filter.since);
      if (filter.sentiment !== "all") params.set("sentiment", filter.sentiment);
      if (filter.category !== "all") params.set("category", filter.category);
      if (searchQuery) params.set("q", searchQuery);

      const [rRes, pRes, sRes] = await Promise.all([
        fetch(`/api/places??${params}&limit=2000`),
        fetch("/api/posts"),
        fetch("/api/stats"),
      ]);
      const [rData, pData, sData] = await Promise.all([
        rRes.json(),
        pRes.json(),
        sRes.json(),
      ]);

      if (Array.isArray(rData)) setPlaces(rData);
      if (Array.isArray(pData)) setPosts(pData);
      if (sData.places !== undefined) setStats(sData);
      setFetchError(false);

      if (background) {
        setToast("Updated ✓");
        setTimeout(() => setToast(null), 2000);
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
      if (!background) {
        setFetchError(true);
      }
    } finally {
      if (!background) setLoading(false);
    }
  }, [filter, searchQuery]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // URL-based place highlighting
  useEffect(() => {
    const placeName = searchParamsRaw.get("place");
    if (!placeName || places.length === 0) return;
    if (highlightedPlace.current === placeName) return;
    highlightedPlace.current = placeName;
    const found = places.find(
      (r) => r.name.toLowerCase() === placeName.toLowerCase()
    );
    if (found) {
      handleFlyTo(found.lat, found.lng);
      router.replace("/", { scroll: false });
    }
  }, [searchParamsRaw, places]);  // eslint-disable-line react-hooks/exhaustive-deps

  const handleScrape = async () => {
    setScraping(true);
    try {
      await fetch("/api/scrape");
      await fetchData();
    } finally {
      setScraping(false);
    }
  };

  const handleScrapePubs = async () => {
    setScrapingPubs(true);
    try {
      await fetch("/api/scrape/publications");
      await fetchData();
    } finally {
      setScrapingPubs(false);
    }
  };

  const handleScrapeEvents = async () => {
    setScrapingEvents(true);
    try {
      const res = await fetch("/api/scrape/events");
      if (res.ok) {
        const data = await res.json();
        setToast(`Found ${data.places_found || 0} events (${data.eventbrite || 0} Eventbrite, ${data.ticketmaster || 0} Ticketmaster)`);
        setTimeout(() => setToast(null), 4000);
      }
      await fetchData();
    } finally {
      setScrapingEvents(false);
    }
  };

  const handleScrapeAll = async () => {
    setScrapingAll(true);
    let totalPlaces = 0;
    for (const ep of [
      { name: "Reddit", url: "/api/scrape" },
      { name: "Publications", url: "/api/scrape/publications" },
      { name: "Popular lists", url: "/api/scrape/popular" },
      { name: "Events", url: "/api/scrape/events" },
    ]) {
      try {
        setToast(`Scraping ${ep.name}...`);
        const res = await fetch(ep.url, { signal: AbortSignal.timeout(90000) });
        if (res.ok) {
          const data = await res.json().catch(() => ({}));
          totalPlaces += data.places_found || 0;
        }
      } catch { /* continue */ }
    }
    let offset = 0;
    let batch = 1;
    while (true) {
      try {
        setToast(`Backfill batch ${batch}...`);
        const res = await fetch(`/api/scrape/backfill?queries=15&offset=${offset}`, { signal: AbortSignal.timeout(90000) });
        if (!res.ok) break;
        const data = await res.json();
        totalPlaces += data.places_found || 0;
        if (!data.next_offset) break;
        offset = data.next_offset;
        batch++;
      } catch { break; }
    }
    try { await fetchData(true); } catch {}
    setToast(`Scrape complete: ${totalPlaces} places found`);
    setTimeout(() => setToast(null), 4000);
    setScrapingAll(false);
  };

  const handleFetchPhotos = async () => {
    setFetchingPhotos(true);
    try {
      const res = await fetch("/api/places/enrich");
      const data = await res.json();
      setToast(`Found ${data.enriched} new photo${data.enriched !== 1 ? "s" : ""} (checked ${data.total_checked} places)`);
      setTimeout(() => setToast(null), 3000);
      await fetchData(true);
    } catch {
      setToast("Failed to fetch photos");
      setTimeout(() => setToast(null), 2000);
    } finally {
      setFetchingPhotos(false);
    }
  };

  const handleFlyTo = useCallback((lat: number, lng: number) => {
    setFlyTo([lat, lng]);
    setTimeout(() => setFlyTo(null), 100);
  }, []);

  const handleViewOnMap = useCallback((lat: number, lng: number) => {
    setFlyTo([lat, lng]);
    setTimeout(() => setFlyTo(null), 100);
    setView("map");
  }, []);

  const handleNearMeToggle = useCallback((coords: { lat: number; lng: number } | null) => {
    setNearMeCoords(coords);
    setNearMeActive(coords !== null);
  }, []);

  const filterButtons: { label: string; since: string }[] = [
    { label: "All Time", since: "all" },
    { label: "24h", since: "24h" },
    { label: "7d", since: "7d" },
    { label: "30d", since: "30d" },
  ];

  const thisWeekChip = (
    <button
      onClick={() => setThisWeekOnly((v) => !v)}
      className="shrink-0 transition-all"
      style={{
        padding: "6px 16px",
        height: "36px",
        borderRadius: "20px",
        fontSize: "12px",
        fontWeight: thisWeekOnly ? 600 : 500,
        border: thisWeekOnly ? "none" : "1px solid #e2e8f0",
        background: thisWeekOnly ? "#1e293b" : "white",
        color: thisWeekOnly ? "white" : "#64748b",
        cursor: "pointer",
      }}
    >
      This Week
    </button>
  );

  return (
    <div className="h-full w-full relative overflow-hidden">
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 h-12 bg-white/95 backdrop-blur-sm border-b border-slate-200 z-[1000] flex items-center px-4 gap-2">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff6b35]" />
          <span className="font-semibold text-sm tracking-tight bg-gradient-to-r from-[#ff6b35] to-[#f59e0b] bg-clip-text text-transparent">BuzzMaps</span>
        </div>

        {/* View toggle — desktop only */}
        <div className="hidden md:flex bg-slate-100 rounded-lg overflow-hidden ml-2 p-0.5 shrink-0">
          <button
            onClick={() => setView("map")}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              view === "map" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            Map
          </button>
          <button
            onClick={() => setView("list")}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
              view === "list" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            List
          </button>
          <Link
            href="/collections"
            className="px-3 py-1 rounded-md text-xs font-semibold transition-all text-slate-400 hover:text-slate-600"
          >
            Collections
          </Link>
        </div>

        {/* Mobile legend — only in map view */}
        {view === "map" && (
          <div className="flex md:hidden items-center gap-2.5 ml-2 overflow-x-auto no-scrollbar shrink">
            {[
              { label: "Food", color: "#E05D36" },
              { label: "Bar", color: "#8B5CF6" },
              { label: "Cafe", color: "#D97706" },
              { label: "Park", color: "#22c55e" },
              { label: "Shop", color: "#06b6d4" },
              { label: "Venue", color: "#3B82F6" },
              { label: "Event", color: "#d946ef" },
            ].map((c) => (
              <span key={c.label} className="flex items-center gap-1 shrink-0">
                <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
                <span className="text-[10px] text-slate-500 font-medium">{c.label}</span>
              </span>
            ))}
          </div>
        )}

        {/* Desktop search */}
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search places..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="hidden md:block ml-2 flex-1 max-w-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 outline-none focus:border-[#ff6b35] focus:ring-1 focus:ring-[#ff6b35]/20"
        />

        {/* Desktop time filters */}
        <div className="hidden md:flex gap-0.5 ml-2">
          {filterButtons.map((f) => (
            <button
              key={f.since}
              onClick={() => setFilter((prev) => ({ ...prev, since: f.since }))}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                filter.since === f.since
                  ? "bg-slate-900 text-white"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Desktop nav links */}
        <div className="hidden md:flex ml-auto gap-1 items-center">
          <a href="/about" className="px-2 py-1 text-xs text-slate-400 hover:text-[#ff6b35] transition-colors">About</a>
          <button
            onClick={handleScrapeAll}
            disabled={scrapingAll}
            className="ml-1 px-3 py-1.5 bg-[#ff6b35] hover:bg-[#ea580c] disabled:opacity-50 text-white text-[11px] font-semibold rounded-lg transition-colors"
          >
            {scrapingAll ? "Scraping..." : "⚡ Scrape All"}
          </button>
        </div>

        {/* Mobile: search toggle (hamburger replaced by bottom nav) */}
        <button
          onClick={() => { setSearchOpen(!searchOpen); if (!searchOpen) setTimeout(() => searchInputRef.current?.focus(), 0); }}
          className="md:hidden ml-auto p-2 text-slate-600"
          aria-label="Search"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </button>
      </div>

      {/* Category filter bar — always visible */}
      <div className="fixed top-12 left-0 right-0 h-11 bg-white/95 backdrop-blur-sm border-b border-slate-100 z-[999] flex items-center px-3 gap-1.5 overflow-x-auto no-scrollbar">
        {CATEGORY_FILTERS.map((c) => {
          const isActive = filter.category === c.value;
          return (
            <button
              key={c.value}
              onClick={() => setFilter((prev) => ({ ...prev, category: c.value }))}
              className="shrink-0 transition-all"
              style={{
                padding: "6px 16px",
                height: "36px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: isActive ? 600 : 500,
                border: isActive ? "none" : "1px solid #e2e8f0",
                background: isActive ? "#1e293b" : "white",
                color: isActive ? "white" : "#64748b",
                cursor: "pointer",
              }}
            >
              {c.label}
            </button>
          );
        })}
        <div className="shrink-0 border-l border-slate-200 pl-1.5 ml-0.5">{thisWeekChip}</div>
      </div>

      {/* Mobile search panel */}
      {searchOpen && (
        <div className="fixed top-[92px] left-0 right-0 z-[998] bg-white/95 backdrop-blur-sm border-b border-slate-200 p-3 md:hidden">
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search places..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#ff6b35]"
          />
        </div>
      )}

      {/* Mobile "More" dropdown panel */}
      {menuOpen && (
        <div className="fixed top-[92px] left-0 right-0 z-[998] bg-white/95 backdrop-blur-sm border-b border-slate-200 p-3 flex flex-col gap-3 md:hidden">
          <div className="flex gap-1 flex-wrap">
            {filterButtons.map((f) => (
              <button
                key={f.since}
                onClick={() => setFilter((prev) => ({ ...prev, since: f.since }))}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                  filter.since === f.since
                    ? "bg-slate-900 text-white"
                    : "text-slate-400 hover:text-slate-600 bg-slate-50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-1.5">
            <a href="/about" className="px-3 py-2 text-sm text-slate-600 hover:text-[#ff6b35] transition-colors rounded-lg hover:bg-slate-50">About</a>
            <a href="/stats" className="px-3 py-2 text-sm text-slate-600 hover:text-[#ff6b35] transition-colors rounded-lg hover:bg-slate-50">📊 Stats</a>
            <a href="/digest" className="px-3 py-2 text-sm text-slate-600 hover:text-[#ff6b35] transition-colors rounded-lg hover:bg-slate-50">📬 Digest</a>
          </div>
          <div className="flex gap-1.5 flex-wrap border-t border-slate-100 pt-3">
            <button
              onClick={() => { handleScrapeAll(); setMenuOpen(false); }}
              disabled={scrapingAll}
              className="px-3 py-1.5 bg-[#ff6b35] disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              {scrapingAll ? "Scraping..." : "⚡ Scrape All"}
            </button>
          </div>
        </div>
      )}

      {/* Active filter chips */}
      {(filter.category !== "all" || filter.since !== "all" || filter.sentiment !== "all" || searchQuery) && (
        <div className="fixed top-[92px] left-0 right-0 z-[597] px-3 py-1.5 flex items-center gap-2 overflow-x-auto no-scrollbar bg-white/80 backdrop-blur-sm border-b border-slate-100" style={{ top: "92px" }}>
          <span className="text-[10px] text-slate-400 shrink-0">Showing {filteredPlaces.length} of {places.length} places</span>
          <div className="flex gap-1.5 ml-auto">
            {filter.category !== "all" && (
              <button
                onClick={() => setFilter((prev) => ({ ...prev, category: "all" }))}
                className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 bg-[#ff6b35]/10 text-[#ff6b35] text-[11px] font-medium rounded-full hover:bg-[#ff6b35]/20 transition-colors"
              >
                {CATEGORY_EMOJI[filter.category as PlaceCategory] || ""} {filter.category}
                <span className="ml-0.5">&times;</span>
              </button>
            )}
            {filter.since !== "all" && (
              <button
                onClick={() => setFilter((prev) => ({ ...prev, since: "all" }))}
                className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-[11px] font-medium rounded-full hover:bg-slate-200 transition-colors"
              >
                {filter.since}
                <span className="ml-0.5">&times;</span>
              </button>
            )}
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-[11px] font-medium rounded-full hover:bg-slate-200 transition-colors"
              >
                &ldquo;{searchQuery.slice(0, 20)}{searchQuery.length > 20 ? "..." : ""}&rdquo;
                <span className="ml-0.5">&times;</span>
              </button>
            )}
          </div>
        </div>
      )}

      {view === "map" && trendingNow.length > 0 && !trendingCollapsed && (
        <div
          className="fixed z-[600] pointer-events-auto"
          style={{ bottom: "80px", left: "50%", transform: "translateX(-50%)", maxWidth: "90vw", width: "340px" }}
        >
          <div style={{
            background: "white",
            borderRadius: "16px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            padding: "12px 16px",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "8px" }}>
              <span style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>Trending this week</span>
              <button onClick={() => setTrendingCollapsed(true)} style={{ background: "none", border: "none", cursor: "pointer", padding: "2px", color: "#94a3b8", fontSize: "16px", lineHeight: 1 }}>&times;</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {trendingNow.map(r => (
                <button key={r.id} onClick={() => handleFlyTo(r.lat, r.lng)}
                  style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 8px", borderRadius: "10px", border: "none", background: "transparent", cursor: "pointer", textAlign: "left", transition: "background 0.15s" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "#f8fafc"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                >
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: CATEGORY_COLORS[r.category as PlaceCategory] || "#ff6b35", flexShrink: 0 }} />
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#1e293b", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                  <span style={{ fontSize: "11px", color: "#94a3b8", flexShrink: 0 }}>{r.mention_count} mentions</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Map view — kept mounted, hidden via CSS when not active */}
      <div className={view === "map" ? "" : "invisible absolute inset-0 pointer-events-none -z-10"}>
          {/* Sidebar */}
          <Sidebar
            posts={posts}
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            onFlyTo={handleFlyTo}
            totalRestaurants={stats.places}
            totalPosts={stats.posts}
          />

          {/* Map */}
          <div className="h-full w-full pt-[92px] pb-14 md:pb-8 relative">
            {/* Top edge fade */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "40px", background: "linear-gradient(to bottom, rgba(255,255,255,0.6) 0%, transparent 100%)", pointerEvents: "none", zIndex: 500 }} />
            {/* Floating search */}
            <div ref={searchContainerRef} style={{ position: "absolute", top: "8px", left: "50%", transform: "translateX(-50%)", zIndex: 600, width: "280px" }}>
              <input
                type="text"
                placeholder="🔍 Search places..."
                value={mapSearchInput}
                onChange={(e) => handleMapSearchChange(e.target.value)}
                onFocus={() => { if (mapSearchSuggestions.length > 0) setShowSuggestions(true); }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                style={{
                  background: "rgba(255,255,255,0.85)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  borderRadius: showSuggestions && mapSearchSuggestions.length > 0 ? "16px 16px 0 0" : "9999px",
                  boxShadow: "0 2px 16px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.6)",
                  padding: "8px 16px",
                  width: "100%",
                  border: "1px solid rgba(226,232,240,0.8)",
                  borderBottom: showSuggestions && mapSearchSuggestions.length > 0 ? "1px solid #f1f5f9" : "1px solid rgba(226,232,240,0.8)",
                  fontSize: "16px",
                  color: "#0f172a",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
              {showSuggestions && mapSearchSuggestions.length > 0 && (
                <div style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  background: "white",
                  borderRadius: "0 0 16px 16px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                  border: "1px solid #e2e8f0",
                  borderTop: "none",
                  zIndex: 700,
                  maxHeight: "256px",
                  overflowY: "auto",
                }}>
                  {mapSearchSuggestions.map((r) => (
                    <div
                      key={r.id}
                      onMouseDown={() => handleSuggestionClick(r)}
                      style={{
                        padding: "8px 16px",
                        cursor: "pointer",
                        fontSize: "14px",
                        color: "#334155",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "#f8fafc"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "white"; }}
                    >
                      <span style={{ fontSize: "16px" }}>{CATEGORY_EMOJI[r.category as PlaceCategory] || "📍"}</span>
                      <span style={{ flex: 1, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
                      {r.address && <span style={{ fontSize: "11px", color: "#94a3b8" }}>{r.address.split(",")[0]}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Category legend toggle */}
            <div style={{ position: "absolute", bottom: "32px", right: "12px", zIndex: 500 }}>
              <button
                onClick={() => setShowLegend((v) => !v)}
                style={{
                  background: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "6px 10px",
                  fontSize: "12px",
                  fontWeight: 600,
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                  color: "#334155",
                }}
              >
                🏷️ Legend
              </button>
              {showLegend && (
                <div style={{
                  position: "absolute",
                  bottom: "38px",
                  right: 0,
                  background: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  padding: "10px 14px",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                  minWidth: "160px",
                }}>
                  <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Categories</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 12px" }}>
                    {([
                      ["restaurant", "🍽️", "Restaurant"],
                      ["bar", "🍺", "Bar"],
                      ["cafe", "☕", "Cafe"],
                      ["club", "🎵", "Club"],
                      ["shop", "🛍️", "Shop"],
                      ["park", "🌳", "Park"],
                      ["gym", "🏋️", "Gym"],
                      ["venue", "⭐", "Venue"],
                      ["market", "🏪", "Market"],
                      ["museum", "🏛️", "Museum"],
                      ["other", "📍", "Other"],
                    ] as [string, string, string][]).map(([cat, emoji, label]) => (
                      <div key={cat} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", color: "#334155" }}>
                        <span>{emoji}</span>
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

<MapView places={filteredPlaces} flyTo={flyTo} nearMeActive={nearMeActive} nearMeRadius={nearMeRadius} onNearMeToggle={handleNearMeToggle} onRadiusChange={setNearMeRadius} nearMeCount={filteredPlaces.length} />
          </div>
      </div>

      {/* List view — kept mounted, hidden via CSS when not active */}
      <div className={view === "list" ? "" : "invisible absolute inset-0 pointer-events-none -z-10"}>
        <ListView
          places={places}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          loading={loading}
          activeCategory={filter.category}
          onViewOnMap={handleViewOnMap}
        />
      </div>

      {/* Submit a Place Button — hidden on mobile (bottom nav has Submit) */}
      <button
        onClick={() => { setSubmitOpen(true); setSubmitState("idle"); setSubmitError(""); setSubmitForm({ name: "", category: "other", address: "", reason: "", eventDate: "", ticketUrl: "" }); }}
        className="fixed z-50 bg-white border border-slate-200 shadow-lg rounded-full px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#ff6b35] hover:text-[#ff6b35] transition-all hidden md:flex items-center gap-1.5"
        style={{ bottom: "44px", right: "12px" }}
      >
        ➕ Submit a Place
      </button>

      {/* Submit a Place Modal */}
      {submitOpen && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md">
            {submitState === "success" ? (
              <div className="p-6 flex flex-col items-center gap-4">
                <span className="text-4xl">✓</span>
                <p className="text-base font-semibold text-slate-800">Added to the map!</p>
                <p className="text-sm text-slate-500 text-center">Thanks for contributing to BuzzMaps Toronto.</p>
                <button
                  onClick={() => { setSubmitOpen(false); fetchData(true); }}
                  className="px-6 py-2 bg-[#ff6b35] text-white text-sm font-semibold rounded-full hover:bg-[#ea580c] transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-slate-800">Submit a Place</h2>
                  <button onClick={() => setSubmitOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors text-lg leading-none">&times;</button>
                </div>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Place Name <span className="text-[#ff6b35]">*</span></label>
                    <input
                      type="text"
                      value={submitForm.name}
                      onChange={(e) => setSubmitForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Bar Raval"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-base md:text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#ff6b35]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
                    <select
                      value={submitForm.category}
                      onChange={(e) => setSubmitForm((f) => ({ ...f, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:border-[#ff6b35] bg-white"
                    >
                      <option value="restaurant">🍽️ Restaurant</option>
                      <option value="bar">🍺 Bar</option>
                      <option value="cafe">☕ Cafe</option>
                      <option value="shop">🛍️ Shop</option>
                      <option value="park">🌳 Park</option>
                      <option value="gym">🏋️ Gym</option>
                      <option value="venue">🎵 Venue</option>
                      <option value="museum">🏛️ Museum</option>
                      <option value="event">🎪 Event</option>
                      <option value="other">📍 Other</option>
                    </select>
                  </div>
                  {submitForm.category === "event" && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Event Date</label>
                        <input
                          type="datetime-local"
                          value={submitForm.eventDate}
                          onChange={(e) => setSubmitForm((f) => ({ ...f, eventDate: e.target.value }))}
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-700 outline-none focus:border-[#ff6b35] bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1">Ticket URL <span className="text-slate-400">(optional)</span></label>
                        <input
                          type="url"
                          value={submitForm.ticketUrl}
                          onChange={(e) => setSubmitForm((f) => ({ ...f, ticketUrl: e.target.value }))}
                          placeholder="https://..."
                          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#ff6b35]"
                        />
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Address <span className="text-[#ff6b35]">*</span></label>
                    <input
                      type="text"
                      value={submitForm.address}
                      onChange={(e) => setSubmitForm((f) => ({ ...f, address: e.target.value }))}
                      placeholder="e.g. 123 Queen St W, Toronto"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-base md:text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#ff6b35]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Why do you recommend it? <span className="text-slate-400">(optional)</span></label>
                    <textarea
                      value={submitForm.reason}
                      onChange={(e) => setSubmitForm((f) => ({ ...f, reason: e.target.value }))}
                      placeholder="Why do you recommend it?"
                      maxLength={300}
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#ff6b35] resize-none"
                    />
                    <p className="text-[10px] text-slate-400 mt-0.5 text-right">{submitForm.reason.length}/300</p>
                  </div>
                  {submitError && (
                    <p className="text-xs text-red-500">{submitError}</p>
                  )}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setSubmitOpen(false)}
                      className="flex-1 px-4 py-2 border border-slate-200 rounded-full text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={submitState === "loading" || !submitForm.name.trim() || !submitForm.address.trim()}
                      onClick={async () => {
                        setSubmitState("loading");
                        setSubmitError("");
                        try {
                          const res = await fetch("/api/places/submit", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(submitForm),
                          });
                          const data = await res.json();
                          if (!res.ok) {
                            setSubmitError(data.error || "Something went wrong");
                            setSubmitState("error");
                          } else {
                            setSubmitState("success");
                          }
                        } catch {
                          setSubmitError("Network error. Please try again.");
                          setSubmitState("error");
                        }
                      }}
                      className="flex-1 px-4 py-2 bg-[#ff6b35] text-white rounded-full text-sm font-semibold hover:bg-[#ea580c] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {submitState === "loading" ? "Submitting..." : "Submit"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Inline error retry banner */}
      {fetchError && (
        <div className="fixed top-[92px] left-1/2 -translate-x-1/2 z-[2000] bg-red-50 border border-red-200 text-red-700 text-xs font-medium px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 mt-2">
          <span>Something went wrong loading data.</span>
          <button
            onClick={() => { setFetchError(false); fetchData(); }}
            className="px-2 py-0.5 bg-red-100 hover:bg-red-200 rounded-md font-semibold transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-14 left-1/2 -translate-x-1/2 z-[2000] bg-slate-800 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg pointer-events-none">
          {toast}
        </div>
      )}

      {/* Bottom bar — hidden on mobile where bottom nav is shown */}
      <div className="fixed bottom-0 left-0 right-0 h-8 bg-white/95 backdrop-blur-sm border-t border-slate-200 z-[1000] hidden md:flex items-center px-4 text-xs text-slate-500">
        <span>🗺️ <span className="text-[#ff6b35] font-medium">{stats.places}</span> places · 💬 <span className="text-[#ff6b35] font-medium">{stats.posts}</span> posts · Updated {formatLastScraped(stats.last_scraped)}</span>
        <a href="/stats" className="ml-auto text-slate-500 hover:text-[#ff6b35] transition-colors">📊 Stats</a>
      </div>

      {/* Mobile bottom navigation is handled by BottomNav in layout.tsx */}
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="h-full w-full bg-white flex items-center justify-center"><div className="text-slate-500 text-sm">Loading...</div></div>}>
      <Home />
    </Suspense>
  );
}
