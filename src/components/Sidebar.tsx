"use client";

import { useState } from "react";
import type { RedditPostWithRestaurants } from "@/lib/types";

function formatTimeAgo(utc: number): string {
  const seconds = Math.floor(Date.now() / 1000 - utc);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 604800)}w ago`;
}

function SentimentDot({ sentiment }: { sentiment: string }) {
  const colors: Record<string, string> = {
    positive: "#22c55e",
    negative: "#ef4444",
    neutral: "#eab308",
  };
  return (
    <span
      className="inline-block w-2 h-2 rounded-full mr-1"
      style={{ background: colors[sentiment] || colors.neutral }}
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
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="fixed top-16 z-[1000] bg-[#1a1a2e] border border-[#2a2a3e] text-white px-2 py-2 rounded-r-lg transition-all duration-300 hover:bg-[#2a2a3e]"
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

      {/* Sidebar panel */}
      <div
        className="fixed top-12 left-0 h-[calc(100vh-80px)] z-[999] bg-[#0a0a0f] border-r border-[#2a2a3e] transition-transform duration-300 flex flex-col"
        style={{
          width: "320px",
          transform: isOpen ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        {/* Search */}
        <div className="p-3 border-b border-[#2a2a3e]">
          <input
            type="text"
            placeholder="Search restaurants..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 bg-[#1a1a2e] border border-[#2a2a3e] rounded-lg text-sm text-white placeholder-[#6b7280] outline-none focus:border-[#f97316]"
          />
        </div>

        {/* Filter pills */}
        <div className="flex gap-1 p-3 border-b border-[#2a2a3e] flex-wrap">
          {filters.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === f.key
                  ? "bg-[#f97316] text-white"
                  : "bg-[#1a1a2e] text-[#6b7280] hover:text-white"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Feed */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="p-4 text-center text-[#6b7280] text-sm">
              No posts found
            </div>
          )}
          {filtered.map((post) => (
            <div
              key={post.id}
              className="p-3 border-b border-[#2a2a3e] hover:bg-[#1a1a2e] cursor-pointer transition-colors"
              onClick={() => {
                const r = post.restaurants?.[0];
                if (r) onFlyTo(r.lat, r.lng);
              }}
            >
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {post.title.slice(0, 80)}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs px-1.5 py-0.5 bg-[#2a2a3e] rounded text-[#f97316]">
                      r/{post.subreddit}
                    </span>
                    <span className="text-xs text-[#6b7280]">
                      {post.score} pts
                    </span>
                    <span className="text-xs text-[#6b7280]">
                      {formatTimeAgo(post.created_utc)}
                    </span>
                  </div>
                  {post.restaurants && post.restaurants.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {post.restaurants.map((r) => (
                        <span
                          key={r.id}
                          className="inline-flex items-center text-xs text-[#e5e5e5] bg-[#1a1a2e] border border-[#2a2a3e] px-1.5 py-0.5 rounded"
                        >
                          <SentimentDot sentiment={r.sentiment} />
                          {r.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats footer */}
        <div className="p-3 border-t border-[#2a2a3e] text-xs text-[#6b7280]">
          Tracking {totalRestaurants} restaurants from {totalPosts} Reddit posts
        </div>
      </div>
    </>
  );
}
