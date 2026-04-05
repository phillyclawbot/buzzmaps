"use client";

import { useState, useEffect, useCallback, useRef, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Sidebar from "@/components/Sidebar";
import ListView from "@/components/ListView";
import type { Restaurant, RedditPostWithRestaurants, Stats, PlaceCategory } from "@/lib/types";
import { CATEGORY_EMOJI } from "@/lib/types";
import { CATEGORY_FILTERS } from "@/lib/constants";
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
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [posts, setPosts] = useState<RedditPostWithRestaurants[]>([]);
  const [stats, setStats] = useState<Stats>({ restaurants: 0, posts: 0, last_scraped: null });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [scraping, setScraping] = useState(false);
  const [scrapingPubs, setScrapingPubs] = useState(false);
  const [scrapingAll, setScrapingAll] = useState(false);
  const [fetchingPhotos, setFetchingPhotos] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [view, setView] = useState<"map" | "list">("map");
  const [filter, setFilter] = useState<{ since: string; sentiment: string; category: string }>({
    since: "all",
    sentiment: "all",
    category: "all",
  });
  const [mapSearch, setMapSearch] = useState("");
  const [mapSearchInput, setMapSearchInput] = useState("");
  const [mapSearchSuggestions, setMapSearchSuggestions] = useState<Restaurant[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [showLegend, setShowLegend] = useState(false);
  const [thisWeekOnly, setThisWeekOnly] = useState(false);
  const [nearMeActive, setNearMeActive] = useState(false);
  const [nearMeCoords, setNearMeCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [nearMeRadius, setNearMeRadius] = useState(2);
  const [searchOpen, setSearchOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitForm, setSubmitForm] = useState({ name: "", category: "other", address: "", reason: "" });
  const [submitState, setSubmitState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [submitError, setSubmitError] = useState("");
  const mapSearchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightedPlace = useRef<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchParams = useSearchParams();

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
      const suggestions = restaurants
        .filter((r) => r.name.toLowerCase().includes(q))
        .slice(0, 6);
      setMapSearchSuggestions(suggestions);
      setShowSuggestions(true);
    } else {
      setMapSearchSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (r: Restaurant) => {
    handleFlyTo(r.lat, r.lng);
    setMapSearchInput("");
    setMapSearch("");
    setShowSuggestions(false);
    setMapSearchSuggestions([]);
  };

  const sevenDaysAgo = useMemo(() => Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000), []);

  const trendingNow = useMemo(() => restaurants.filter(r => r.latest_mention > Date.now()/1000 - 7*86400).sort((a,b) => b.mention_count - a.mention_count).slice(0, 5), [restaurants]);

  const filteredRestaurants = useMemo(() => {
    let items = restaurants;
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
  }, [restaurants, mapSearch, thisWeekOnly, sevenDaysAgo, nearMeActive, nearMeCoords, nearMeRadius]);

  const fetchData = useCallback(async (background = false) => {
    if (!background) setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.since !== "all") params.set("since", filter.since);
      if (filter.sentiment !== "all") params.set("sentiment", filter.sentiment);
      if (filter.category !== "all") params.set("category", filter.category);
      if (searchQuery) params.set("q", searchQuery);

      const [rRes, pRes, sRes] = await Promise.all([
        fetch(`/api/restaurants?${params}`),
        fetch("/api/posts"),
        fetch("/api/stats"),
      ]);
      const [rData, pData, sData] = await Promise.all([
        rRes.json(),
        pRes.json(),
        sRes.json(),
      ]);

      if (Array.isArray(rData)) setRestaurants(rData);
      if (Array.isArray(pData)) setPosts(pData);
      if (sData.restaurants !== undefined) setStats(sData);

      if (background) {
        setToast("Updated ✓");
        setTimeout(() => setToast(null), 2000);
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
      if (!background) {
        setToast("Failed to load data. Please try again.");
        setTimeout(() => setToast(null), 3000);
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
    const placeName = searchParams.get("place");
    if (!placeName || restaurants.length === 0) return;
    if (highlightedPlace.current === placeName) return;
    highlightedPlace.current = placeName;
    const found = restaurants.find(
      (r) => r.name.toLowerCase() === placeName.toLowerCase()
    );
    if (found) {
      handleFlyTo(found.lat, found.lng);
      setView("map");
    }
  }, [searchParams, restaurants]);  // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleScrapeAll = async () => {
    setScrapingAll(true);
    try {
      await fetch("/api/scrape");
      await fetch("/api/scrape/publications");
      await fetch("/api/scrape/backfill");
      await fetch("/api/scrape/popular");
      await fetchData();
      setToast("Scrape All complete ✓");
      setTimeout(() => setToast(null), 3000);
    } catch {
      setToast("Scrape All failed");
      setTimeout(() => setToast(null), 2000);
    } finally {
      setScrapingAll(false);
    }
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

  const handleFlyTo = (lat: number, lng: number) => {
    setFlyTo([lat, lng]);
    setTimeout(() => setFlyTo(null), 100);
  };

  const filterButtons: { label: string; since: string }[] = [
    { label: "All Time", since: "all" },
    { label: "24h", since: "24h" },
    { label: "7d", since: "7d" },
    { label: "30d", since: "30d" },
  ];

  const thisWeekChip = (
    <button
      onClick={() => setThisWeekOnly((v) => !v)}
      className={`min-h-[36px] px-3 py-2 rounded-full text-xs font-medium transition-colors ${
        thisWeekOnly
          ? "bg-gradient-to-r from-[#ff6b35] to-[#ea580c] text-white"
          : "bg-slate-100 text-slate-500 hover:text-slate-900"
      }`}
    >
      🆕 This Week
    </button>
  );

  return (
    <div className="h-full w-full relative overflow-hidden">
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 h-12 bg-white/95 backdrop-blur-sm border-b border-slate-200 z-[1000] flex items-center px-4 gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff6b35] shrink-0" />
          <div className="flex flex-col leading-none">
            <span className="font-semibold text-sm tracking-tight bg-gradient-to-r from-[#ff6b35] to-[#f59e0b] bg-clip-text text-transparent leading-tight">BuzzMaps</span>
            <span className="text-[10px] text-slate-400 leading-tight">Toronto&#39;s places, as told by the internet</span>
          </div>
        </div>

        {/* View toggle */}
        <div className="flex bg-slate-100 rounded-full border border-slate-200 overflow-hidden ml-2 p-0.5">
          <button
            onClick={() => setView("map")}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
              view === "map"
                ? "bg-gradient-to-r from-[#ff6b35] to-[#ea580c] text-white shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Map
          </button>
          <button
            onClick={() => setView("list")}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
              view === "list"
                ? "bg-gradient-to-r from-[#ff6b35] to-[#ea580c] text-white shadow-sm"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            List
          </button>
        </div>

        {/* Desktop: inline search + filters + scrape */}
        <input
          ref={searchInputRef}
          type="text"
          placeholder="Search places... (press / to focus)"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="hidden md:block ml-4 flex-1 max-w-xs px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-[#9ca3af] outline-none focus:border-[#ff6b35]"
        />

        <div className="hidden md:flex gap-1">
          {filterButtons.map((f) => (
            <button
              key={f.since}
              onClick={() => setFilter((prev) => ({ ...prev, since: f.since }))}
              className={`min-h-[36px] px-3 py-2 rounded-full text-xs font-medium transition-colors ${
                filter.since === f.since
                  ? "bg-gradient-to-r from-[#ff6b35] to-[#ea580c] text-white"
                  : "bg-slate-100 text-slate-500 hover:text-slate-900"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="hidden md:flex gap-1 border-l border-slate-200 pl-2 ml-1 overflow-x-auto no-scrollbar flex-nowrap">
          {CATEGORY_FILTERS.map((c) => (
            <button
              key={c.value}
              onClick={() => setFilter((prev) => ({ ...prev, category: c.value }))}
              className={`min-h-[36px] px-3 py-2 rounded-full text-xs font-medium transition-colors shrink-0 ${
                filter.category === c.value
                  ? "bg-gradient-to-r from-[#ff6b35] to-[#ea580c] text-white"
                  : "bg-slate-100 text-slate-500 hover:text-slate-900"
              }`}
            >
              {c.label}
            </button>
          ))}
          <div className="border-l border-slate-200 pl-2 ml-1 shrink-0">{thisWeekChip}</div>
        </div>

        <div className="hidden md:flex ml-auto gap-2 items-center">
          <a href="/collections" className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-[#ff6b35] transition-colors">📚 Collections</a>
          <a href="/stats" className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-[#ff6b35] transition-colors">📊 Stats</a>
          <a href="/about" className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-[#ff6b35] transition-colors">About</a>
          <button
            onClick={handleFetchPhotos}
            disabled={fetchingPhotos}
            className="px-3 py-2 min-h-[36px] bg-green-50 hover:bg-green-100 disabled:opacity-50 text-green-700 text-xs font-medium rounded-lg transition-colors border border-green-200"
          >
            {fetchingPhotos ? "Fetching..." : "📷 Fetch Photos"}
          </button>
          <button
            onClick={handleScrapePubs}
            disabled={scrapingPubs}
            className="px-3 py-2 min-h-[36px] bg-blue-50 hover:bg-blue-100 disabled:opacity-50 text-blue-600 text-xs font-medium rounded-lg transition-colors border border-blue-200"
          >
            {scrapingPubs ? "Scraping..." : "📰 Scrape Publications"}
          </button>
          <button
            onClick={handleScrape}
            disabled={scraping}
            className="px-3 py-2 min-h-[36px] bg-gradient-to-r from-[#ff6b35] to-[#ea580c] hover:bg-[#ea580c] disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
          >
            {scraping ? "Scraping..." : "Scrape Sources"}
          </button>
          <button
            onClick={handleScrapeAll}
            disabled={scrapingAll}
            className="px-3 py-2 min-h-[36px] bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
          >
            {scrapingAll ? "Scraping All..." : "⚡ Scrape All"}
          </button>
        </div>

        {/* Mobile: hamburger button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden ml-auto p-2 min-h-[36px] text-slate-900"
          aria-label="Toggle menu"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            {menuOpen ? (
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            ) : (
              <>
                <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </>
            )}
          </svg>
        </button>
      </div>

      {/* Mobile dropdown panel */}
      {menuOpen && (
        <div className="fixed top-12 left-0 right-0 z-[999] bg-white/95 backdrop-blur-sm border-b border-slate-200 p-3 flex flex-col gap-3 md:hidden">
          {/* Mobile view toggle */}
          <div className="flex bg-slate-100 rounded-full border border-slate-200 overflow-hidden self-start p-0.5">
            <button
              onClick={() => setView("map")}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                view === "map"
                  ? "bg-gradient-to-r from-[#ff6b35] to-[#ea580c] text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Map
            </button>
            <button
              onClick={() => setView("list")}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                view === "list"
                  ? "bg-gradient-to-r from-[#ff6b35] to-[#ea580c] text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              List
            </button>
          </div>
          <input
            type="text"
            placeholder="Search places..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 min-h-[36px] bg-slate-100 border border-slate-200 rounded-lg text-base text-slate-900 placeholder-[#9ca3af] outline-none focus:border-[#ff6b35]"
          />
          <div className="flex gap-1 flex-wrap">
            {filterButtons.map((f) => (
              <button
                key={f.since}
                onClick={() => {
                  setFilter((prev) => ({ ...prev, since: f.since }));
                }}
                className={`min-h-[36px] px-3 py-2 rounded-full text-xs font-medium transition-colors ${
                  filter.since === f.since
                    ? "bg-gradient-to-r from-[#ff6b35] to-[#ea580c] text-white"
                    : "bg-slate-100 text-slate-500 hover:text-slate-900"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 flex-nowrap overflow-x-auto no-scrollbar pb-1">
            {CATEGORY_FILTERS.map((c) => (
              <button
                key={c.value}
                onClick={() => {
                  setFilter((prev) => ({ ...prev, category: c.value }));
                }}
                className={`min-h-[36px] px-3 py-2 rounded-full text-xs font-medium transition-colors shrink-0 ${
                  filter.category === c.value
                    ? "bg-gradient-to-r from-[#ff6b35] to-[#ea580c] text-white"
                    : "bg-slate-100 text-slate-500 hover:text-slate-900"
                }`}
              >
                {c.label}
              </button>
            ))}
            <div className="shrink-0">{thisWeekChip}</div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => {
                handleFetchPhotos();
                setMenuOpen(false);
              }}
              disabled={fetchingPhotos}
              className="px-3 py-2 min-h-[36px] bg-green-50 border border-green-200 hover:bg-green-100 disabled:opacity-50 text-green-700 text-xs font-medium rounded-lg transition-colors"
            >
              {fetchingPhotos ? "Fetching..." : "📷 Fetch Photos"}
            </button>
            <button
              onClick={() => {
                handleScrapePubs();
                setMenuOpen(false);
              }}
              disabled={scrapingPubs}
              className="px-3 py-2 min-h-[36px] bg-blue-50 border border-blue-200 hover:bg-blue-100 disabled:opacity-50 text-blue-600 text-xs font-medium rounded-lg transition-colors"
            >
              {scrapingPubs ? "Scraping..." : "📰 Scrape Publications"}
            </button>
            <button
              onClick={() => {
                handleScrape();
                setMenuOpen(false);
              }}
              disabled={scraping}
              className="px-3 py-2 min-h-[36px] bg-slate-100 border border-slate-200 hover:bg-slate-200 disabled:opacity-50 text-slate-500 text-xs font-medium rounded-lg transition-colors"
            >
              {scraping ? "Scraping..." : "Scrape Sources"}
            </button>
            <button
              onClick={() => {
                handleScrapeAll();
                setMenuOpen(false);
              }}
              disabled={scrapingAll}
              className="px-3 py-2 min-h-[36px] bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
            >
              {scrapingAll ? "Scraping All..." : "⚡ Scrape All"}
            </button>
          </div>
        </div>
      )}

      {view === "map" && trendingNow.length > 0 && (
        <div className="fixed top-12 left-0 right-0 z-[600] px-3 py-1.5 overflow-x-auto no-scrollbar flex gap-2 pointer-events-none">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide shrink-0 self-center pointer-events-none">🔥 Trending</span>
          {trendingNow.map(r => (
            <button key={r.id} onClick={() => { handleFlyTo(r.lat, r.lng); }}
              className="shrink-0 px-3 py-1 bg-white/90 backdrop-blur-sm border border-[#ff6b35]/30 rounded-full text-xs font-medium text-slate-700 hover:border-[#ff6b35] hover:text-[#ff6b35] shadow-sm transition-all pointer-events-auto whitespace-nowrap">
              {CATEGORY_EMOJI[r.category as PlaceCategory] || "📍"} {r.name}
            </button>
          ))}
        </div>
      )}

      {view === "map" ? (
        <>
          {/* Sidebar */}
          <Sidebar
            posts={posts}
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
            onFlyTo={handleFlyTo}
            totalRestaurants={stats.restaurants}
            totalPosts={stats.posts}
          />

          {/* Map */}
          <div className="h-full w-full pt-12 pb-8 relative">
            {/* Floating search */}
            <div ref={searchContainerRef} style={{ position: "absolute", top: "56px", left: "50%", transform: "translateX(-50%)", zIndex: 600, width: "280px" }}>
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

<MapView restaurants={filteredRestaurants} flyTo={flyTo} nearMeActive={nearMeActive} nearMeRadius={nearMeRadius} onNearMeToggle={(coords) => { setNearMeCoords(coords); setNearMeActive(coords !== null); }} onRadiusChange={setNearMeRadius} nearMeCount={filteredRestaurants.length} />
          </div>
        </>
      ) : (
        <ListView
          restaurants={restaurants}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          loading={loading}
          onViewOnMap={(lat, lng) => {
            handleFlyTo(lat, lng);
            setView("map");
          }}
        />
      )}

      {/* Submit a Place Button */}
      <button
        onClick={() => { setSubmitOpen(true); setSubmitState("idle"); setSubmitError(""); setSubmitForm({ name: "", category: "other", address: "", reason: "" }); }}
        className="fixed z-50 bg-white border border-slate-200 shadow-lg rounded-full px-4 py-2 text-sm font-semibold text-slate-700 hover:border-[#ff6b35] hover:text-[#ff6b35] transition-all flex items-center gap-1.5"
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
                      <option value="other">📍 Other</option>
                    </select>
                  </div>
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

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-14 left-1/2 -translate-x-1/2 z-[2000] bg-slate-800 text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg pointer-events-none">
          {toast}
        </div>
      )}

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 h-8 bg-white/95 backdrop-blur-sm border-t border-slate-200 z-[1000] flex items-center px-4 text-xs text-slate-500">
        <span>🗺️ <span className="text-[#ff6b35] font-medium">{stats.restaurants}</span> places · 💬 <span className="text-[#ff6b35] font-medium">{stats.posts}</span> posts · Updated {formatLastScraped(stats.last_scraped)}</span>
        <a href="/stats" className="ml-auto text-slate-500 hover:text-[#ff6b35] transition-colors">📊 Stats</a>
      </div>
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
