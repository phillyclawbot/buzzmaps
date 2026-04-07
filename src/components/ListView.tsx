"use client";

import { useState, useMemo } from "react";
import type { Place, PlaceCategory } from "@/lib/types";
import { CATEGORY_EMOJI } from "@/lib/types";
import { NEIGHBOURHOODS, filterByNeighbourhood, getNeighbourhood } from "@/lib/neighbourhoods";
import CheckinButton from "@/components/CheckinButton";
import { CATEGORY_COLORS, SENTIMENT_COLORS, isPublication } from "@/lib/constants";
import { formatTimeAgo } from "@/lib/utils";

type SortMode = "mentions" | "newest" | "az" | "rating" | "buzz" | "neighbourhood";

function buzzScore(r: Place): number {
  const now = Date.now() / 1000;
  const posts = r.posts ?? [];
  const recent7  = posts.filter(p => p.created_utc > now - 7  * 86400).length;
  const recent30 = posts.filter(p => p.created_utc > now - 30 * 86400).length;
  const older    = Math.max(0, r.mention_count - recent30);
  const mentionScore = Math.min(recent7 * 18 + (recent30 - recent7) * 7 + older * 1, 75);
  const ratingScore = r.google_rating ? Math.max(0, (r.google_rating - 3.5) * 20) : 0;
  const trendBonus = r.mention_count > 1 && recent30 / r.mention_count > 0.5 ? 10 : 0;
  return Math.round(Math.min(100, Math.max(0, mentionScore + ratingScore + trendBonus)));
}

function buzzLabel(score: number): string {
  if (score >= 80) return "🔥🔥";
  if (score >= 50) return "🔥";
  if (score >= 20) return "📈";
  return "";
}

function SkeletonCard() {
  return (
    <div className="rounded-xl overflow-hidden bg-white border border-slate-100 animate-pulse">
      <div className="w-full h-36 bg-slate-100" />
      <div className="p-3.5 space-y-2.5">
        <div className="h-3 bg-slate-100 rounded w-1/4" />
        <div className="h-4 bg-slate-100 rounded w-3/4" />
        <div className="h-3 bg-slate-50 rounded w-1/2" />
        <div className="flex gap-2 mt-1">
          <div className="h-6 bg-slate-100 rounded-full w-16" />
          <div className="h-6 bg-slate-100 rounded-full w-14" />
        </div>
      </div>
    </div>
  );
}

function PlaceCard({
  r,
  onViewOnMap,
}: {
  r: Place;
  onViewOnMap: (lat: number, lng: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const posts = r.posts ?? [];
  const hasPosts = posts.length > 0;
  const color = CATEGORY_COLORS[r.category] || "#ff6b35";
  const score = buzzScore(r);
  const label = buzzLabel(score);

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `https://buzzmaps.vercel.app/?place=${encodeURIComponent(r.name)}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const isEvent = r.category === "event";

  return (
    <div
      className="group rounded-xl overflow-hidden bg-white border border-slate-200/60 hover:border-slate-300 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:scale-[1.01]"
      style={isEvent ? { borderLeft: `3px solid ${color}` } : undefined}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Image — clean, no overlay */}
      <div className="relative h-36 overflow-hidden bg-slate-50">
        {r.photo_url ? (
          <img
            src={r.photo_url}
            alt={r.name}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-3xl"
            style={{ background: `linear-gradient(135deg, ${color}15 0%, ${color}05 100%)` }}
          >
            {CATEGORY_EMOJI[r.category] || "📍"}
          </div>
        )}
        {/* Buzz badge — top right on image */}
        {score >= 20 && (
          <span className="absolute top-2 right-2 text-[10px] font-bold bg-white/90 backdrop-blur-sm text-slate-700 px-2 py-0.5 rounded-full shadow-sm">
            {label} {score}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-3.5">
        {/* Category pill + event badge */}
        <div className="flex items-center gap-1.5 mb-2">
          <span
            className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: `${color}12`, color }}
          >
            {CATEGORY_EMOJI[r.category]} {r.category}
          </span>
          {isEvent && (
            <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">
              📅 Upcoming
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-semibold text-sm text-slate-900 leading-snug mb-0.5">{r.name}</h3>
        {r.cuisine_type && (
          <p className="text-[11px] text-slate-500 mb-0.5">{r.cuisine_type}{r.price_level ? ` · ${"$".repeat(r.price_level)}` : ""}</p>
        )}
        <p className="text-xs text-slate-400 truncate mb-3" title={r.address}>{r.address}</p>

        {/* Stats */}
        <div className="flex items-center gap-2 mb-3">
          {isEvent && r.metadata?.event_date ? (
            <span className="text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
              📅 {new Date(r.metadata.event_date).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
            </span>
          ) : (
            <span className="text-[11px] font-medium text-slate-500">
              {r.mention_count} mention{Number(r.mention_count) !== 1 ? "s" : ""}
            </span>
          )}
          {r.google_rating && (
            <span className="text-[11px] text-amber-500 font-medium">⭐ {r.google_rating.toFixed(1)}</span>
          )}
          {isEvent && r.metadata?.venue_name && (
            <span className="text-[10px] text-slate-400 truncate">📍 {r.metadata.venue_name}</span>
          )}
          <span className="text-[10px] text-slate-300 ml-auto">{formatTimeAgo(r.latest_mention)}</span>
        </div>

        {/* Preview quote */}
        {!expanded && posts[0] && (
          <p className="text-[11px] text-slate-400 italic line-clamp-1 mb-3">&ldquo;{posts[0].title}&rdquo;</p>
        )}

        {/* Action buttons */}
        <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onViewOnMap(r.lat, r.lng)}
            className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            Map
          </button>
          {isEvent && r.metadata?.ticket_url ? (
            <a
              href={r.metadata.ticket_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white text-center transition-colors"
              style={{ background: color }}
            >
              Tickets
            </a>
          ) : (
            <a
              href={`/place/${encodeURIComponent(r.name)}`}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors text-center"
            >
              Profile
            </a>
          )}
          <button
            onClick={handleShare}
            className="px-2 py-1.5 rounded-lg text-slate-400 bg-slate-50 hover:bg-slate-100 transition-colors"
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
      {expanded && (
        <div className="px-3.5 pb-3 border-t border-slate-100">
          {hasPosts ? (
            <div className="space-y-1 pt-2.5">
              {posts.map((p) => (
                <a
                  key={p.id}
                  href={isPublication(p.subreddit) ? p.permalink : `https://reddit.com${p.permalink}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-start gap-2 text-xs text-slate-500 hover:text-[#ff6b35] transition-colors py-1 px-1.5 -mx-1.5 rounded-lg hover:bg-slate-50"
                >
                  <span
                    className="inline-block w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                    style={{ background: SENTIMENT_COLORS[p.sentiment] || SENTIMENT_COLORS.neutral }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="truncate leading-relaxed">{p.title}</p>
                    <p className="text-slate-400 text-[10px]">
                      {isPublication(p.subreddit) ? (
                        <span className="inline-block px-1 py-0.5 bg-blue-50 text-blue-500 rounded text-[10px] mr-1">📰 {p.subreddit}</span>
                      ) : (
                        <span>r/{p.subreddit} · </span>
                      )}
                      {p.score} pts · {formatTimeAgo(p.created_utc)}
                      {(p.mentions_in_thread ?? 1) > 1 && (
                        <span className="ml-1 text-[#ff6b35]">· {p.mentions_in_thread}x mentioned</span>
                      )}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="py-3 text-center">
              <p className="text-xs text-slate-400">No Reddit mentions yet</p>
              <a
                href={`/place/${encodeURIComponent(r.name)}`}
                onClick={(e) => e.stopPropagation()}
                className="inline-block mt-2 text-xs font-medium text-[#ff6b35] hover:underline"
              >
                View place profile →
              </a>
            </div>
          )}
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
  places,
  searchQuery,
  onSearchChange,
  onViewOnMap,
  loading = false,
  activeCategory = "all",
}: {
  places: Place[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onViewOnMap: (lat: number, lng: number) => void;
  loading?: boolean;
  activeCategory?: string;
}) {
  const [sort, setSort] = useState<SortMode>("buzz");
  const [neighbourhood, setNeighbourhood] = useState("all");

  const isFiltersActive = !!(searchQuery || activeCategory !== "all" || neighbourhood !== "all");

  const mostLoved = useMemo(() => {
    return [...places]
      .sort((a, b) => b.mention_count - a.mention_count)
      .slice(0, 5);
  }, [places]);

  const filtered = useMemo(() => {
    let items = places;
    if (activeCategory !== "all") items = items.filter((r) => r.category === activeCategory);
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
  }, [places, activeCategory, neighbourhood, searchQuery, sort]);

  const grouped = useMemo(() => {
    if (sort !== "neighbourhood") return null;
    const groups: Record<string, Place[]> = {};
    for (const r of filtered) {
      const hood = getNeighbourhood(r.lat, r.lng) || "Other Areas";
      if (!groups[hood]) groups[hood] = [];
      groups[hood].push(r);
    }
    return Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
  }, [filtered, sort]);

  return (
    <div className="h-full pt-[92px] pb-16 md:pb-8 overflow-y-auto bg-slate-50/50 page-enter">
      <div className="max-w-5xl mx-auto px-4 py-4">
        {/* Search + sort controls */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <input
            type="text"
            placeholder="Search places..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#ff6b35] focus:ring-1 focus:ring-[#ff6b35]/20"
          />
          <div className="flex gap-2">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 outline-none focus:border-[#ff6b35] cursor-pointer"
            >
              <option value="buzz">🔥 Buzz</option>
              <option value="mentions">Most Mentioned</option>
              <option value="newest">Newest</option>
              <option value="az">A-Z</option>
              <option value="rating">⭐ Rating</option>
              <option value="neighbourhood">📍 Neighbourhood</option>
            </select>
            <select
              value={neighbourhood}
              onChange={(e) => setNeighbourhood(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 outline-none focus:border-[#ff6b35] cursor-pointer"
            >
              <option value="all">All Areas</option>
              {NEIGHBOURHOODS.map((n) => (
                <option key={n.name} value={n.name}>{n.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-slate-400">
            {filtered.length} place{filtered.length !== 1 ? "s" : ""}
            {activeCategory !== "all" && ` in ${activeCategory}`}
          </span>
        </div>

        {/* Most Loved */}
        {!isFiltersActive && !loading && mostLoved.length > 0 && (
          <div className="mb-5">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Most Loved</div>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {mostLoved.map((r) => (
                <button
                  key={r.id}
                  onClick={() => onViewOnMap(r.lat, r.lng)}
                  className="shrink-0 flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2 hover:border-[#ff6b35] hover:shadow-sm transition-all group"
                >
                  <span className="text-base">{CATEGORY_EMOJI[r.category] || "📍"}</span>
                  <div className="text-left">
                    <div className="text-xs font-medium text-slate-700 truncate max-w-[100px] group-hover:text-[#ff6b35]">{r.name}</div>
                    <div className="text-[10px] text-slate-400">{r.mention_count} mentions</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <span className="text-3xl mb-3">🔍</span>
            {searchQuery ? (
              <>
                <p className="text-sm">No places found for &ldquo;{searchQuery}&rdquo;</p>
                <p className="text-xs text-slate-400 mt-1">Try searching for a neighbourhood name or cuisine type</p>
                <button onClick={() => onSearchChange("")} className="mt-3 px-4 py-1.5 bg-slate-900 text-white text-xs rounded-lg font-medium hover:bg-slate-800 transition-colors">
                  Clear search
                </button>
              </>
            ) : activeCategory !== "all" ? (
              <>
                <p className="text-sm">No {activeCategory} places match these filters</p>
                <p className="text-xs text-slate-400 mt-1">Try adjusting your neighbourhood or sort options</p>
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
                  <h2 className="text-sm font-semibold text-slate-800">{hood}</h2>
                  <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {places.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {places.map((r) => (
                    <PlaceCard key={r.id} r={r} onViewOnMap={onViewOnMap} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((r) => (
              <PlaceCard key={r.id} r={r} onViewOnMap={onViewOnMap} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
