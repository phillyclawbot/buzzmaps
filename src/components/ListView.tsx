"use client";

import { useState, useMemo } from "react";
import type { Restaurant, PlaceCategory } from "@/lib/types";
import { CATEGORY_EMOJI } from "@/lib/types";
import { NEIGHBOURHOODS, filterByNeighbourhood } from "@/lib/neighbourhoods";
import CheckinButton from "@/components/CheckinButton";
import { CATEGORY_COLORS, CATEGORY_FILTERS, SENTIMENT_COLORS, isPublication } from "@/lib/constants";
import { formatTimeAgo } from "@/lib/utils";

type SortMode = "mentions" | "newest" | "az" | "rating" | "buzz";

function buzzScore(r: Restaurant): number {
  const now = Date.now() / 1000;
  const posts = r.posts ?? [];

  // Weight mentions by recency — fresh buzz counts most
  const recent7  = posts.filter(p => p.created_utc > now - 7  * 86400).length;
  const recent30 = posts.filter(p => p.created_utc > now - 30 * 86400).length;
  const older    = Math.max(0, r.mention_count - recent30);

  const mentionScore = Math.min(recent7 * 18 + (recent30 - recent7) * 7 + older * 1, 75);

  // Rating: meaningful above 4.0, big bonus at 4.5+
  const ratingScore = r.google_rating ? Math.max(0, (r.google_rating - 3.5) * 20) : 0;

  // Trending bonus: majority of mentions are recent
  const trendBonus = r.mention_count > 1 && recent30 / r.mention_count > 0.5 ? 10 : 0;

  return Math.round(Math.min(100, Math.max(0, mentionScore + ratingScore + trendBonus)));
}

function buzzLabel(score: number): string {
  if (score >= 80) return "🔥🔥 ";
  if (score >= 50) return "🔥 ";
  if (score >= 20) return "📈 ";
  return "💤 ";
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden shadow-md animate-pulse">
      <div className="w-full h-48 bg-slate-200" />
      <div className="bg-white p-4 space-y-2">
        <div className="h-4 bg-slate-200 rounded w-3/4" />
        <div className="h-3 bg-slate-100 rounded w-1/2" />
        <div className="flex gap-2 mt-2">
          <div className="h-5 bg-slate-200 rounded-full w-20" />
          <div className="h-5 bg-slate-200 rounded-full w-16" />
        </div>
      </div>
    </div>
  );
}

function PlaceCard({
  r,
  onViewOnMap,
}: {
  r: Restaurant;
  onViewOnMap: (lat: number, lng: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const posts = r.posts ?? [];
  const hasPosts = posts.length > 0;
  const color = CATEGORY_COLORS[r.category] || "#ff6b35";
  const fallbackBg = `linear-gradient(135deg, ${color}dd 0%, ${color}66 100%)`;

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `https://buzzmaps.vercel.app/?place=${encodeURIComponent(r.name)}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-shadow bg-white border border-slate-200"
      style={{ cursor: hasPosts ? "pointer" : "default" }}
      onClick={() => hasPosts && setExpanded(!expanded)}
    >
      {/* Image section — fully self-contained relative block */}
      <div className="relative h-48 overflow-hidden">
        {r.photo_url ? (
          <img
            src={r.photo_url}
            alt={r.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-5xl" style={{ background: fallbackBg }}>
            {CATEGORY_EMOJI[r.category] || "📍"}
          </div>
        )}
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
        {/* Category badge — top left */}
        <div className="absolute top-3 left-3">
          <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white uppercase tracking-wide" style={{ background: color }}>
            {CATEGORY_EMOJI[r.category]} {r.category}
          </span>
        </div>
        {/* Buzz + share — top right */}
        <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
          <span className="text-xs font-bold bg-black/50 text-white px-2 py-1 rounded-full backdrop-blur-sm">
            {buzzLabel(buzzScore(r))}{buzzScore(r)}
          </span>
          <button
            onClick={handleShare}
            className="bg-black/50 backdrop-blur-sm text-white rounded-full p-1.5 hover:bg-black/70 transition-colors"
            title="Copy link"
          >
            {copied ? (
              <span className="text-[10px] px-0.5 font-semibold">✓</span>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
            )}
          </button>
        </div>
        {/* Name / stats pinned to bottom of image */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="font-black text-white text-sm leading-tight mb-0.5 drop-shadow">{r.name}</h3>
          <p className="text-white/55 text-xs truncate mb-1.5">{r.address}</p>
          <div className="flex items-center gap-2 flex-wrap">
            {r.category === "event" && r.metadata?.event_date ? (
              <span className="text-xs font-semibold bg-white/20 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
                📅 {new Date(r.metadata.event_date).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
              </span>
            ) : (
              <span className="text-xs font-semibold bg-white/20 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">
                {r.mention_count} mention{Number(r.mention_count) !== 1 ? "s" : ""}
              </span>
            )}
            {r.google_rating && (
              <span className="text-xs text-amber-300 font-semibold">⭐ {r.google_rating.toFixed(1)}</span>
            )}
            {r.category === "event" && r.metadata?.venue_name && (
              <span className="text-white/55 text-xs truncate">📍 {r.metadata.venue_name}</span>
            )}
            <span className="text-white/45 text-xs ml-auto">{formatTimeAgo(r.latest_mention)}</span>
          </div>
          {!expanded && posts[0] && (
            <p className="text-white/40 text-xs italic mt-1 line-clamp-1">&ldquo;{posts[0].title}&rdquo;</p>
          )}
        </div>
      </div>

      {/* Expanded posts — normal flow below image */}
      {expanded && hasPosts && (
        <div className="px-4 py-3 border-t border-slate-200">
          <div className="space-y-2">
            {posts.map((p) => (
              <a
                key={p.id}
                href={isPublication(p.subreddit) ? p.permalink : `https://reddit.com${p.permalink}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-start gap-2 text-xs text-slate-600 hover:text-[#ff6b35] transition-colors"
              >
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full mt-1 shrink-0"
                  style={{ background: SENTIMENT_COLORS[p.sentiment] || SENTIMENT_COLORS.neutral }}
                />
                <div className="flex-1 min-w-0">
                  <p className="truncate">{p.title}</p>
                  <p className="text-slate-400 text-[10px]">
                    {isPublication(p.subreddit) ? (
                      <span className="inline-block px-1 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 rounded text-[10px] mr-1">📰 {p.subreddit}</span>
                    ) : (
                      <span>r/{p.subreddit} · </span>
                    )}
                    {p.score} pts · {formatTimeAgo(p.created_utc)}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons — normal flow, never overlaps */}
      <div className="px-4 pb-3 pt-2 flex gap-2" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => onViewOnMap(r.lat, r.lng)}
          className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600 hover:bg-[#ff6b35] hover:text-white hover:border-[#ff6b35] transition-all"
        >
          Map →
        </button>
        {r.category === "event" && r.metadata?.ticket_url ? (
          <a
            href={r.metadata.ticket_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex-1 px-3 py-2 rounded-xl text-xs font-medium text-white text-center transition-all"
            style={{ background: color }}
          >
            🎟️ Tickets
          </a>
        ) : (
          <a
            href={`/place/${encodeURIComponent(r.name)}`}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600 hover:bg-[#ff6b35] hover:text-white hover:border-[#ff6b35] transition-all text-center"
          >
            Profile →
          </a>
        )}
      </div>
      <div className="px-4 pb-4" onClick={(e) => e.stopPropagation()}>
        <CheckinButton placeId={r.id} />
      </div>
    </div>
  );
}

export default function ListView({
  restaurants,
  searchQuery,
  onSearchChange,
  onViewOnMap,
  loading = false,
}: {
  restaurants: Restaurant[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onViewOnMap: (lat: number, lng: number) => void;
  loading?: boolean;
}) {
  const [sort, setSort] = useState<SortMode>("mentions");
  const [category, setCategory] = useState("all");
  const [neighbourhood, setNeighbourhood] = useState("all");

  const isFiltersActive = !!(searchQuery || category !== "all" || neighbourhood !== "all");

  const mostLoved = useMemo(() => {
    return [...restaurants]
      .sort((a, b) => b.mention_count - a.mention_count)
      .slice(0, 5);
  }, [restaurants]);

  const filtered = useMemo(() => {
    let items = restaurants;
    if (category !== "all") items = items.filter((r) => r.category === category);
    if (neighbourhood !== "all") items = filterByNeighbourhood(items, neighbourhood);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter((r) => r.name.toLowerCase().includes(q) || r.address.toLowerCase().includes(q));
    }
    const sorted = [...items];
    switch (sort) {
      case "mentions": sorted.sort((a, b) => b.mention_count - a.mention_count); break;
      case "newest": sorted.sort((a, b) => b.latest_mention - a.latest_mention); break;
      case "az": sorted.sort((a, b) => a.name.localeCompare(b.name)); break;
      case "rating":
        sorted.sort((a, b) => {
          if (a.google_rating === null && b.google_rating === null) return 0;
          if (a.google_rating === null) return 1;
          if (b.google_rating === null) return -1;
          return b.google_rating - a.google_rating;
        });
        break;
      case "buzz": sorted.sort((a, b) => buzzScore(b) - buzzScore(a)); break;
      default: break;
    }
    return sorted;
  }, [restaurants, category, neighbourhood, searchQuery, sort]);

  return (
    <div className="h-full pt-12 pb-8 overflow-y-auto bg-slate-50 page-enter">
      <div className="max-w-5xl mx-auto px-4 py-4">
        {/* Search */}
        <input
          type="text"
          placeholder="Search places..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#ff6b35] mb-4 shadow-sm"
        />

        {/* Sort + filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-3">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortMode)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:border-[#ff6b35] cursor-pointer"
          >
            <option value="mentions">Most Mentioned</option>
            <option value="newest">Newest</option>
            <option value="az">A-Z</option>
            <option value="rating">⭐ Rating</option>
            <option value="buzz">🔥 Sort by Buzz</option>
          </select>
          <select
            value={neighbourhood}
            onChange={(e) => setNeighbourhood(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 outline-none focus:border-[#ff6b35] cursor-pointer"
          >
            <option value="all">📍 All Neighbourhoods</option>
            {NEIGHBOURHOODS.map((n) => (
              <option key={n.name} value={n.name}>{n.name}</option>
            ))}
          </select>
          <div className="flex gap-1 overflow-x-auto flex-nowrap pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
            {CATEGORY_FILTERS.map((c) => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={`min-h-[36px] px-3 py-2 rounded-full text-xs font-medium transition-colors shrink-0 ${
                  category === c.value
                    ? "bg-gradient-to-r from-[#ff6b35] to-[#ea580c] text-white"
                    : "bg-white border border-slate-200 text-slate-600 hover:text-slate-900"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Most Loved */}
        {!isFiltersActive && !loading && mostLoved.length > 0 && (
          <div className="mb-5">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">⭐ Most Loved</div>
            <div className="flex gap-2 overflow-x-auto pb-1 flex-nowrap">
              {mostLoved.map((r) => (
                <button
                  key={r.id}
                  onClick={() => onViewOnMap(r.lat, r.lng)}
                  className="shrink-0 flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 hover:border-[#ff6b35] hover:shadow-md transition-all group"
                >
                  <span className="text-lg leading-none">{CATEGORY_EMOJI[r.category] || "📍"}</span>
                  <div className="text-left min-w-0">
                    <div className="text-xs font-semibold text-slate-700 truncate max-w-[100px] group-hover:text-[#ff6b35]">{r.name}</div>
                    <div className="text-[10px] font-bold text-[#ff6b35] bg-[#ff6b35]/10 px-1.5 py-0.5 rounded-full inline-block mt-0.5">
                      {r.mention_count} 💬
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <span className="text-4xl mb-3">🔍</span>
            {searchQuery ? (
              <>
                <p className="text-sm font-medium text-slate-400">No places found for &ldquo;{searchQuery}&rdquo;</p>
                <button onClick={() => onSearchChange("")} className="mt-3 px-4 py-2 bg-[#ff6b35] text-white text-sm rounded-full font-medium hover:bg-[#ea580c] transition-colors">
                  Clear search
                </button>
              </>
            ) : (
              <p className="text-sm">No places match these filters</p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((r) => (
              <PlaceCard key={r.id} r={r} onViewOnMap={onViewOnMap} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
