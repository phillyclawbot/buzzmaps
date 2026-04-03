"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Sidebar from "@/components/Sidebar";
import type { Restaurant, RedditPostWithRestaurants, Stats } from "@/lib/types";

const MapView = dynamic(() => import("@/components/MapView"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-[#0a0a0f] flex items-center justify-center">
      <div className="text-[#6b7280] text-sm">Loading map...</div>
    </div>
  ),
});

function formatLastScraped(date: string | null): string {
  if (!date) return "never";
  const d = new Date(date);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function Home() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [posts, setPosts] = useState<RedditPostWithRestaurants[]>([]);
  const [stats, setStats] = useState<Stats>({ restaurants: 0, posts: 0, last_scraped: null });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [flyTo, setFlyTo] = useState<[number, number] | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [scraping, setScraping] = useState(false);
  const [filter, setFilter] = useState<{ since: string; sentiment: string }>({
    since: "all",
    sentiment: "all",
  });

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter.since !== "all") params.set("since", filter.since);
      if (filter.sentiment !== "all") params.set("sentiment", filter.sentiment);
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
    } catch {
      // silently fail on fetch errors
    }
  }, [filter, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleScrape = async () => {
    setScraping(true);
    try {
      await fetch("/api/scrape");
      await fetchData();
    } finally {
      setScraping(false);
    }
  };

  const handleFlyTo = (lat: number, lng: number) => {
    setFlyTo([lat, lng]);
    // Reset after use so same location can be triggered again
    setTimeout(() => setFlyTo(null), 100);
  };

  const filterButtons: { label: string; since: string }[] = [
    { label: "All Time", since: "all" },
    { label: "24h", since: "24h" },
    { label: "7d", since: "7d" },
    { label: "30d", since: "30d" },
  ];

  return (
    <div className="h-full w-full relative">
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 h-12 bg-[#0a0a0f]/90 backdrop-blur-sm border-b border-[#2a2a3e] z-[1000] flex items-center px-4 gap-3">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#f97316]" />
          <span className="font-semibold text-white text-sm tracking-tight">BuzzMaps</span>
        </div>

        <input
          type="text"
          placeholder="Search restaurants..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="ml-4 flex-1 max-w-xs px-3 py-1.5 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg text-xs text-white placeholder-[#6b7280] outline-none focus:border-[#f97316]"
        />

        <div className="flex gap-1">
          {filterButtons.map((f) => (
            <button
              key={f.since}
              onClick={() => setFilter((prev) => ({ ...prev, since: f.since }))}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                filter.since === f.since
                  ? "bg-[#f97316] text-white"
                  : "bg-[#1a1a2e] text-[#6b7280] hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleScrape}
          disabled={scraping}
          className="ml-auto px-3 py-1.5 bg-[#f97316] hover:bg-[#ea580c] disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors"
        >
          {scraping ? "Scraping..." : "Scrape Reddit"}
        </button>
      </div>

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
      <div className="h-full w-full pt-12 pb-8">
        <MapView restaurants={restaurants} flyTo={flyTo} />
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 h-8 bg-[#0a0a0f]/90 backdrop-blur-sm border-t border-[#2a2a3e] z-[1000] flex items-center px-4 text-xs text-[#6b7280]">
        <span>{stats.restaurants} restaurants</span>
        <span className="mx-2">|</span>
        <span>{stats.posts} posts</span>
        <span className="mx-2">|</span>
        <span>last scraped: {formatLastScraped(stats.last_scraped)}</span>
        <span className="ml-auto text-[#2a2a3e]">Toronto, ON</span>
      </div>
    </div>
  );
}
