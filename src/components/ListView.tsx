"use client";

import { useState, useMemo } from "react";
import type { Restaurant, PlaceCategory } from "@/lib/types";
import { CATEGORY_EMOJI } from "@/lib/types";
import { NEIGHBOURHOODS, filterByNeighbourhood, getNeighbourhood } from "@/lib/neighbourhoods";
import CheckinButton from "@/components/CheckinButton";
import { CATEGORY_COLORS, CATEGORY_FILTERS, SENTIMENT_COLORS, isPublication } from "@/lib/constants";
import { formatTimeAgo } from "@/lib/utils";

type SortMode = "mentions" | "newest" | "az" | "rating" | "buzz" | "neighbourhood";

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
  const fallbackBg = `linear-gradient(135deg, ${color}22 0%, ${color}08 100%)`;
  const score = buzzScore(r);

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
      className="group rounded-2xl overflow-hidden bg-white border border-slate-200/80 hover:border-slate-300 shadow-sm hover:shadow-lg transition-all duration-200"
      style={{ cursor: hasPosts ? "pointer" : "default" }}
      onClick={() => hasPosts && setExpanded(!expanded)}
    >
      {/* Image */}
      <div className="relative h-44 overflow-hidden">
        {r.photo_url ? (
          <img
            src={r.photo_url}
            alt={r.name}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl" style={{ background: fallbackBg }}>
            {CATEGORY_EMOJI[r.category] || "📍"}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        {/* Category pill */}
        <span
          className="absolute top-2.5 left-2.5 text-[10px] font-bold px-2 py-0.5 rounded-full text-white/90 uppercase tracking-wider backdrop-blur-sm"
          style={{ background: `${color}cc` }}
        >
          {CATEGORY_EMOJI[r.category]} {r.category}
        </span>
        {/* Buzz score */}
        {score >= 20 && (
          <span className="absolute top-2.5 right-2.5 text-[10px] font-bold bg-white/15 backdrop-blur-sm text-white px-2 py-0.5 rounded-full">
            {buzzLabel(score)}{score}
          </span>
        )}
        {/* Title overlay */}
        <div className="absolute bottom-0 left-0 right-0 px-3.5 pb-3">
          <h3 className="font-bold text-white text-[15px] leading-snug drop-shadow-sm">{r.name}</h3>
        </div>
      </div>

      {/* Body */}
      <div className="px-3.5 pt-2.5 pb-3">
        <p className="text-[11px] text-slate-400 truncate mb-2.5">{r.address}</p>

        {/* Stats row */}
        <div className="flex items-center gap-1.5 mb-2.5">
          <span
            className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: `${color}12`, color }}
          >
            {r.mention_count} mention{Number(r.mention_count) !== 1 ? "s" : ""}
          </span>
          {r.google_rating && (
            <span className="text-[11px] text-amber-500 font-medium">⭐ {r.google_rating.toFixed(1)}</span>
          )}
          <span className="text-[10px] text-slate-300 ml-auto">{formatTimeAgo(r.latest_mention)}</span>
        </div>

        {/* Preview quote */}
        {!expanded && posts[0] && (
          <p className="text-[11px] text-slate-400 italic line-clamp-1 mb-2.5">&ldquo;{posts[0].title}&rdquo;</p>
        )}

        {/* Action buttons */}
        <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onViewOnMap(r.lat, r.lng)}
            className="flex-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors border"
            style={{
              borderColor: `${color}30`,
              color,
              background: `${color}08`,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = color; e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = color; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = `${color}08`; e.currentTarget.style.color = color; e.currentTarget.style.borderColor = `${color}30`; }}
          >
            Map
          </button>
          <a
            href={`/place/${encodeURIComponent(r.name)}`}
            onClick={(e) => e.stopPropagation()}
            className="flex-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-slate-500 border border-slate-200 hover:border-slate-300 hover:text-slate-700 transition-colors text-center"
          >
            Profile
          </a>
          <button
            onClick={handleShare}
            className="px-2 py-1.5 rounded-lg text-slate-400 border border-slate-200 hover:border-slate-300 hover:text-slate-600 transition-colors"
            title="Copy link"
          >
            {copied ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Expanded posts */}
      {expanded && hasPosts && (
        <div className="px-3.5 pb-3 pt-0 border-t border-slate-100">
          <div className="space-y-1.5 pt-2.5">
            {posts.map((p) => (
              <a
                key={p.id}
                href={isPublication(p.subreddit) ? p.permalink : `https://reddit.com${p.permalink}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-start gap-2 text-xs text-slate-500 hover:text-[#ff6b35] transition-colors py-1 rounded-lg hover:bg-slate-50 px-1.5 -mx-1.5"
              >
                <span
                  className="inline-block w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                  style={{ background: SENTIMENT_COLORS[p.sentiment] || SENTIMENT_COLORS.neutral }}
                />
                <div className="flex-1 min-w-0">
                  <p className="truncate leading-relaxed">{p.title}</p>
                  <p className="text-slate-300 text-[10px]">
                    {isPublication(p.subreddit) ? (
                      <span className="inline-block px-1 py-0.5 bg-blue-50 text-blue-500 rounded text-[10px] mr-1">📰 {p.subreddit}</span>
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

      {/* Check-in */}
      <div className="px-3.5 pb-3" onClick={(e) => e.stopPropagation()}>
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
      case "neighbourhood": sorted.sort((a, b) => {
        const na = getNeighbourhood(a.lat, a.lng) || "zzz";
        const nb = getNeighbourhood(b.lat, b.lng) || "zzz";
        if (na !== nb) return na.localeCompare(nb);
        return b.mention_count - a.mention_count;
      }); break;
      default: break;
    }
    return sorted;
  }, [restaurants, category, neighbourhood, searchQuery, sort]);

  const grouped = useMemo(() => {
    if (sort !== "neighbourhood") return null;
    const groups: Record<string, Restaurant[]> = {};
    for (const r of filtered) {
      const hood = getNeighbourhood(r.lat, r.lng) || "Other Areas";
      if (!groups[hood]) groups[hood] = [];
      groups[hood].push(r);
    }
    // Sort groups by place count descending
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [filtered, sort]);

  return (
    <div className="h-full pt-12 pb-8 overflow-y-auto bg-slate-50 page-enter">
      <div className="max-w-5xl mx-auto px-4 py-4">
        {/* Search */}
        <input
          type="text"
          placeholder="Search places..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-base md:text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#ff6b35] mb-4 shadow-sm"
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
            <option value="neighbourhood">📍 By Neighbourhood</option>
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
        ) : grouped ? (
          <div className="space-y-6">
            {grouped.map(([hood, places]) => (
              <div key={hood}>
                <div className="flex items-center gap-2 mb-3">
                  <h2 className="text-sm font-bold text-slate-800">{hood}</h2>
                  <span className="text-[11px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {places.length} place{places.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {places.map((r) => (
                    <PlaceCard key={r.id} r={r} onViewOnMap={onViewOnMap} />
                  ))}
                </div>
              </div>
            ))}
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
