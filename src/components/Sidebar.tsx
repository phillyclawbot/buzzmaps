"use client";

import { useState } from "react";
import type { RedditPostWithRestaurants, PlaceCategory } from "@/lib/types";
import { CATEGORY_EMOJI } from "@/lib/types";
import { SENTIMENT_COLORS, isPublication } from "@/lib/constants";
import { formatTimeAgo } from "@/lib/utils";

function SentimentDot({ sentiment }: { sentiment: string }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full mr-1"
      style={{ background: SENTIMENT_COLORS[sentiment] || SENTIMENT_COLORS.neutral }}
    />
  );
}

type Filter = "all" | "today" | "week" | "positive" | "negative";

export default function Sidebar({
  posts,
  isOpen,
  onToggle,
  onFlyTo,
  totalRestaurants,
  totalPosts,
}: {
  posts: RedditPostWithRestaurants[];
  isOpen: boolean;
  onToggle: () => void;
  onFlyTo: (lat: number, lng: number) => void;
  totalRestaurants: number;
  totalPosts: number;
}) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const now = Date.now() / 1000;

  const filtered = posts.filter((p) => {
    if (search) {
      const q = search.toLowerCase();
      const matchesTitle = p.title.toLowerCase().includes(q);
      const matchesRestaurant = p.restaurants?.some((r) =>
        r.name.toLowerCase().includes(q)
      );
      if (!matchesTitle && !matchesRestaurant) return false;
    }
    if (filter === "today" && now - p.created_utc > 86400) return false;
    if (filter === "week" && now - p.created_utc > 604800) return false;
    if (filter === "positive" && p.sentiment !== "positive") return false;
    if (filter === "negative" && p.sentiment !== "negative") return false;
    return true;
  });

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "today", label: "Today" },
    { key: "week", label: "This Week" },
    { key: "positive", label: "Positive" },
    { key: "negative", label: "Negative" },
  ];

  return (
    <>
      {/* Mobile: floating pill toggle button (bottom-right) */}
      <button
        onClick={onToggle}
        className="md:hidden fixed bottom-12 right-4 z-50 bg-slate-100 border border-slate-200 text-slate-900 px-4 py-2 min-h-[36px] rounded-full shadow-lg transition-all duration-300 hover:bg-slate-200 flex items-center gap-2"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.3s" }}
        >
          <path d="M3 6l5-4 5 4M3 10l5 4 5-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <span className="text-xs font-medium">Posts</span>
      </button>

      {/* Desktop: side toggle button */}
      <button
        onClick={onToggle}
        className="hidden md:block fixed top-16 z-[1000] bg-slate-100 border border-slate-200 text-slate-900 px-2 py-2 rounded-r-lg transition-all duration-300 hover:bg-slate-200"
        style={{ left: isOpen ? "320px" : "0px" }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          style={{ transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.3s" }}
        >
          <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>

      {/* Mobile: backdrop */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/20 z-[998]"
          onClick={onToggle}
        />
      )}

      {/* Desktop: left side panel */}
      <div
        className="hidden md:flex fixed top-12 left-0 h-[calc(100vh-80px)] z-[999] bg-white border-r border-slate-200 transition-transform duration-300 flex-col"
        style={{
          width: "320px",
          transform: isOpen ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        <SidebarContent
          search={search}
          setSearch={setSearch}
          filter={filter}
          setFilter={setFilter}
          filters={filters}
          filtered={filtered}
          onFlyTo={onFlyTo}
          totalRestaurants={totalRestaurants}
          totalPosts={totalPosts}
        />
      </div>

      {/* Mobile: bottom sheet */}
      <div
        className="md:hidden fixed left-0 right-0 bottom-8 z-[999] bg-white border-t border-slate-200 rounded-t-2xl transition-transform duration-300 flex flex-col"
        style={{
          height: "60vh",
          transform: isOpen ? "translateY(0)" : "translateY(100%)",
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center py-3">
          <div className="w-14 h-1.5 bg-slate-300 rounded-full" />
        </div>
        <SidebarContent
          search={search}
          setSearch={setSearch}
          filter={filter}
          setFilter={setFilter}
          filters={filters}
          filtered={filtered}
          onFlyTo={onFlyTo}
          totalRestaurants={totalRestaurants}
          totalPosts={totalPosts}
        />
      </div>
    </>
  );
}

function SidebarContent({
  search,
  setSearch,
  filter,
  setFilter,
  filters,
  filtered,
  onFlyTo,
  totalRestaurants,
  totalPosts,
}: {
  search: string;
  setSearch: (v: string) => void;
  filter: Filter;
  setFilter: (v: Filter) => void;
  filters: { key: Filter; label: string }[];
  filtered: RedditPostWithRestaurants[];
  onFlyTo: (lat: number, lng: number) => void;
  totalRestaurants: number;
  totalPosts: number;
}) {
  return (
    <>
      {/* Search */}
      <div className="p-3 border-b border-slate-200">
        <input
          type="text"
          placeholder="Search places..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-3 py-2 min-h-[36px] bg-slate-100 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder-[#9ca3af] outline-none focus:border-[#ff6b35]"
        />
      </div>

      {/* Filter pills */}
      <div className="flex gap-1 p-3 border-b border-slate-200 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`min-h-[36px] px-3 py-2 rounded-full text-xs font-medium transition-colors ${
              filter === f.key
                ? "bg-gradient-to-r from-[#ff6b35] to-[#ea580c] text-white"
                : "bg-slate-100 text-slate-500 hover:text-slate-900"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="p-4 text-center text-slate-500 text-sm">
            No posts found
          </div>
        )}
        {filtered.map((post) => {
          const sentimentColor =
            post.sentiment === "positive"
              ? "#22c55e"
              : post.sentiment === "negative"
              ? "#ef4444"
              : "#f59e0b";
          return (
            <div
              key={post.id}
              className="p-3 border-b border-slate-200 cursor-pointer group"
              style={{
                borderLeft: `3px solid ${sentimentColor}`,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
                e.currentTarget.style.background = "#f8fafc";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "";
                e.currentTarget.style.boxShadow = "none";
                e.currentTarget.style.background = "";
              }}
              onClick={() => {
                const r = post.restaurants?.[0];
                if (r) onFlyTo(r.lat, r.lng);
              }}
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {post.title.slice(0, 80)}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {isPublication(post.subreddit) ? (
                      <span className="text-xs px-1.5 py-0.5 bg-blue-50 rounded text-blue-600">
                        📰 {post.subreddit}
                      </span>
                    ) : (
                      <span className="text-xs px-1.5 py-0.5 bg-[#ff6b35]/20 rounded text-[#ff6b35]">
                        r/{post.subreddit}
                      </span>
                    )}
                    <span className="text-xs text-slate-500">
                      {post.score} pts
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatTimeAgo(post.created_utc)}
                    </span>
                  </div>
                  {post.restaurants && post.restaurants.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {post.restaurants.map((r) => (
                        <span
                          key={r.id}
                          className="inline-flex items-center gap-1 text-xs text-slate-800 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full font-medium"
                        >
                          <span>{CATEGORY_EMOJI[(r.category || "restaurant") as PlaceCategory] || "📍"}</span>
                          <span>{r.name}</span>
                          <SentimentDot sentiment={r.sentiment} />
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats footer */}
      <div className="p-3 border-t border-slate-200 text-xs text-slate-500">
        Tracking {totalRestaurants} places from {totalPosts} Reddit posts
      </div>
    </>
  );
}
