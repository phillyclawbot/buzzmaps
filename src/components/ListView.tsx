"use client";

import { useState, useMemo, memo } from "react";
import type { Place } from "@/lib/types";
import {
  NEIGHBOURHOODS,
  filterByNeighbourhood,
  getNeighbourhood,
} from "@/lib/neighbourhoods";
import CheckinButton from "@/components/CheckinButton";
import { CATEGORY_COLORS, SENTIMENT_COLORS } from "@/lib/constants";
import { decodeHtmlEntities, getPostHref } from "@/lib/post-source";
import PostSource from "@/components/ui/PostSource";
import CategoryBadge from "@/components/ui/CategoryBadge";
import Skeleton from "@/components/ui/Skeleton";
import { formatTimeAgo } from "@/lib/utils";
import { CategoryIcon } from "@/lib/icons";
import {
  Search,
  MessageCircle,
  Star,
  Share2,
  Check,
  ChevronDown,
  Calendar,
  MapPin,
  Ticket,
  Zap,
} from "lucide-react";

type SortMode = "mentions" | "newest" | "az" | "rating" | "buzz" | "neighbourhood";

function buzzScore(r: Place): number {
  const now = Date.now() / 1000;
  const posts = r.posts ?? [];
  const recent7 = posts.filter((p) => p.created_utc > now - 7 * 86400).length;
  const recent30 = posts.filter((p) => p.created_utc > now - 30 * 86400).length;
  const older = Math.max(0, r.mention_count - recent30);
  const mentionScore = Math.min(
    recent7 * 18 + (recent30 - recent7) * 7 + older * 1,
    75
  );
  const ratingScore = r.google_rating
    ? Math.max(0, (r.google_rating - 3.5) * 20)
    : 0;
  const trendBonus =
    r.mention_count > 1 && recent30 / r.mention_count > 0.5 ? 10 : 0;
  return Math.round(
    Math.min(100, Math.max(0, mentionScore + ratingScore + trendBonus))
  );
}

function buzzLabel(score: number): string {
  if (score >= 80) return "Hot";
  if (score >= 50) return "Trending";
  if (score >= 20) return "Rising";
  return "";
}

function SkeletonCard() {
  return (
    <div
      className="overflow-hidden"
      style={{
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-xl)",
      }}
    >
      <Skeleton className="w-full h-40" rounded="none" />
      <div className="p-4 space-y-2.5">
        <Skeleton style={{ height: 12, width: "35%" }} />
        <Skeleton style={{ height: 18, width: "70%" }} />
        <Skeleton style={{ height: 12, width: "55%" }} />
        <div className="flex gap-2 mt-1">
          <Skeleton style={{ height: 26, width: 70 }} rounded="pill" />
          <Skeleton style={{ height: 26, width: 60 }} rounded="pill" />
        </div>
      </div>
    </div>
  );
}

function PlaceCard({
  r,
  onViewOnMap,
  index = 0,
  linkedEvents = [],
}: {
  r: Place;
  onViewOnMap: (lat: number, lng: number) => void;
  index?: number;
  linkedEvents?: Place[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showEvents, setShowEvents] = useState(false);
  const posts = r.posts ?? [];
  const hasPosts = posts.length > 0;
  const color = CATEGORY_COLORS[r.category] || "var(--brand)";
  const score = buzzScore(r);
  const label = buzzLabel(score);

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `https://buzzmaps.vercel.app/?place=${encodeURIComponent(
      r.name
    )}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const isEvent = r.category === "event";

  return (
    <div
      className="group overflow-hidden cursor-pointer animate-fade-in-up place-card-hover"
      style={
        {
          ["--stagger" as string]: index,
          ["--card-glow" as string]: `${color}44`,
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-xl)",
          boxShadow: "var(--shadow-sm)",
        } as React.CSSProperties
      }
      onClick={() => setExpanded(!expanded)}
    >
      {/* Image */}
      <div
        className="relative h-40 overflow-hidden"
        style={{
          background: r.photo_url
            ? "var(--bg-sunken)"
            : `linear-gradient(135deg, ${color} 0%, ${color}99 100%)`,
        }}
      >
        {r.photo_url ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={r.photo_url}
            alt={r.name}
            className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-700"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <CategoryIcon category={r.category} size={52} color="#ffffffdd" />
          </div>
        )}
        <div className="absolute top-3 left-3">
          <CategoryBadge category={r.category} size="sm" />
        </div>
        {score >= 20 && (
          <span
            className="absolute top-3 right-3 inline-flex items-center gap-1 font-display-ui font-semibold"
            style={{
              background: "rgba(255,255,255,0.95)",
              color: "var(--fg)",
              padding: "3px 10px",
              borderRadius: 9999,
              fontSize: 11,
              letterSpacing: "0.02em",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <Zap size={11} style={{ color: "var(--brand)" }} />
            {label}
          </span>
        )}
      </div>

      {/* Body */}
      <div className="p-4">
        <h3
          className="font-display-ui font-semibold text-[17px] leading-snug group-hover:text-[color:var(--brand)] transition-colors"
          style={{ color: "var(--fg)" }}
        >
          {r.name}
        </h3>
        {r.cuisine_type && (
          <p
            className="text-[12.5px] mt-0.5"
            style={{ color: "var(--fg-muted)" }}
          >
            {r.cuisine_type}
            {r.price_level ? ` · ${"$".repeat(r.price_level)}` : ""}
          </p>
        )}
        <p
          className="text-[12px] truncate mt-0.5"
          style={{ color: "var(--fg-subtle)" }}
          title={r.address}
        >
          {r.address}
        </p>

        <div
          className="flex items-center gap-3 mt-3 text-[11.5px] font-display-ui font-semibold"
          style={{ color: "var(--fg-muted)" }}
        >
          {isEvent && r.metadata?.event_date ? (
            <span className="inline-flex items-center gap-1">
              <Calendar size={12} />
              {new Date(r.metadata.event_date).toLocaleDateString("en-CA", {
                month: "short",
                day: "numeric",
              })}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1">
              <MessageCircle size={12} />
              {r.mention_count}
            </span>
          )}
          {r.google_rating && (
            <span
              className="inline-flex items-center gap-1"
              style={{ color: "var(--gold)" }}
            >
              <Star size={12} fill="currentColor" />
              {r.google_rating.toFixed(1)}
            </span>
          )}
          {isEvent && r.metadata?.venue_name && (
            <span
              className="inline-flex items-center gap-1 truncate"
              style={{ color: "var(--fg-subtle)" }}
            >
              <MapPin size={11} />
              {r.metadata.venue_name}
            </span>
          )}
          <span
            className="ml-auto"
            style={{ color: "var(--fg-subtle)" }}
          >
            {formatTimeAgo(r.latest_mention)}
          </span>
        </div>

        {!expanded && posts[0] && (
          <p
            className="font-serif italic line-clamp-1 mt-3 text-[13px]"
            style={{ color: "var(--fg-muted)" }}
          >
            &ldquo;{decodeHtmlEntities(posts[0].title)}&rdquo;
          </p>
        )}

        <div
          className="flex gap-2 mt-4"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => onViewOnMap(r.lat, r.lng)}
            className="flex-1 btn-secondary !py-2"
          >
            <MapPin size={13} />
            Map
          </button>
          {isEvent && r.metadata?.ticket_url ? (
            <a
              href={r.metadata.ticket_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex-1 btn-primary !py-2 text-center"
            >
              <Ticket size={13} />
              Tickets
            </a>
          ) : (
            <a
              href={`/place/${encodeURIComponent(r.name)}`}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 btn-primary !py-2 text-center"
            >
              Details
            </a>
          )}
          <button
            onClick={handleShare}
            className="btn-secondary !py-2 !px-3"
            title="Copy link"
          >
            {copied ? (
              <Check size={14} style={{ color: "var(--sent-pos)" }} />
            ) : (
              <Share2 size={14} />
            )}
          </button>
        </div>
      </div>

      {linkedEvents.length > 0 && (
        <div
          className="px-4 pb-3"
          style={{ borderTop: "1px solid var(--border)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => setShowEvents((v) => !v)}
            className="flex items-center justify-between w-full py-2 text-left"
          >
            <span
              className="eyebrow inline-flex items-center gap-1"
              style={{ color: "var(--plum)" }}
            >
              <Ticket size={11} /> {linkedEvents.length} Upcoming Event
              {linkedEvents.length !== 1 ? "s" : ""}
            </span>
            <ChevronDown
              size={14}
              className={`transition-transform ${showEvents ? "rotate-180" : ""}`}
              style={{ color: "var(--fg-subtle)" }}
            />
          </button>
          {showEvents && (
            <div className="space-y-1.5 pb-1">
              {linkedEvents.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-center gap-2 py-1.5"
                  style={{ borderTop: "1px solid var(--border)" }}
                >
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[12.5px] font-display-ui font-semibold truncate"
                      style={{ color: "var(--fg)" }}
                    >
                      {ev.name}
                    </p>
                    <p
                      className="text-[11px]"
                      style={{ color: "var(--fg-subtle)" }}
                    >
                      {ev.metadata?.event_date
                        ? new Date(ev.metadata.event_date).toLocaleDateString(
                            "en-CA",
                            { weekday: "short", month: "short", day: "numeric" }
                          )
                        : ""}
                      {ev.metadata?.genre ? ` · ${ev.metadata.genre}` : ""}
                    </p>
                  </div>
                  {ev.metadata?.ticket_url && (
                    <a
                      href={ev.metadata.ticket_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="shrink-0 btn-primary !py-1 !px-3 !text-[10px]"
                      style={{
                        background: "linear-gradient(135deg, #8b5cf6, #d946ef)",
                      }}
                    >
                      Tickets
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div
        className={`expand-grid ${expanded ? "open" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <div
            className="px-4 pb-4 pt-3"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            {hasPosts ? (
              <div className="flex flex-col gap-1 pt-1">
                {posts.map((p) => (
                  <a
                    key={p.id}
                    href={getPostHref(p.subreddit, p.permalink)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-start gap-2 text-[12.5px] py-1.5 px-2 -mx-2 rounded-[var(--radius-md)] transition-colors hover:bg-[var(--bg-sunken)]"
                    style={{ color: "var(--fg-muted)" }}
                  >
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                      style={{
                        background:
                          SENTIMENT_COLORS[p.sentiment] ||
                          SENTIMENT_COLORS.neutral,
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="line-clamp-2">
                        {decodeHtmlEntities(p.title)}
                      </p>
                      <p
                        className="text-[11px] mt-0.5 inline-flex items-center gap-1.5"
                        style={{ color: "var(--fg-subtle)" }}
                      >
                        <PostSource subreddit={p.subreddit} variant="tag" />
                        {p.score} pts · {formatTimeAgo(p.created_utc)}
                      </p>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <p
                className="py-3 text-center text-[13px]"
                style={{ color: "var(--fg-subtle)" }}
              >
                No Reddit mentions yet
              </p>
            )}
            <a
              href={`/place/${encodeURIComponent(r.name)}`}
              onClick={(e) => e.stopPropagation()}
              className="mt-3 btn-secondary w-full !justify-center !text-[12.5px]"
            >
              View full details →
            </a>
          </div>
        </div>
      </div>

      <div
        className="px-4 pb-4"
        onClick={(e) => e.stopPropagation()}
      >
        <CheckinButton placeId={r.id} />
      </div>
    </div>
  );
}

export default memo(function ListView({
  places,
  searchQuery,
  onSearchChange,
  onViewOnMap,
  loading = false,
  activeCategory = "all",
  venueEvents = new Map(),
  linkedEventIds = new Set(),
}: {
  places: Place[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onViewOnMap: (lat: number, lng: number) => void;
  loading?: boolean;
  activeCategory?: string;
  venueEvents?: Map<number, Place[]>;
  linkedEventIds?: Set<number>;
}) {
  const [sort, setSort] = useState<SortMode>("buzz");
  const [neighbourhood, setNeighbourhood] = useState("all");

  const isFiltersActive = !!(
    searchQuery ||
    activeCategory !== "all" ||
    neighbourhood !== "all"
  );

  const mostLoved = useMemo(() => {
    return [...places]
      .sort((a, b) => b.mention_count - a.mention_count)
      .slice(0, 5);
  }, [places]);

  const filtered = useMemo(() => {
    let items = places;
    if (activeCategory !== "all")
      items = items.filter((r) => r.category === activeCategory);
    if (activeCategory !== "event") {
      items = items.filter(
        (p) => p.category !== "event" || !linkedEventIds.has(p.id)
      );
    }
    if (neighbourhood !== "all")
      items = filterByNeighbourhood(items, neighbourhood);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.address.toLowerCase().includes(q)
      );
    }
    const sorted = [...items];
    switch (sort) {
      case "mentions":
        sorted.sort((a, b) => b.mention_count - a.mention_count);
        break;
      case "newest":
        sorted.sort((a, b) => b.latest_mention - a.latest_mention);
        break;
      case "az":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "rating":
        sorted.sort((a, b) => {
          if (a.google_rating === null && b.google_rating === null) return 0;
          if (a.google_rating === null) return 1;
          if (b.google_rating === null) return -1;
          return b.google_rating - a.google_rating;
        });
        break;
      case "buzz":
        sorted.sort((a, b) => buzzScore(b) - buzzScore(a));
        break;
      case "neighbourhood":
        sorted.sort((a, b) => {
          const na = getNeighbourhood(a.lat, a.lng) || "zzz";
          const nb = getNeighbourhood(b.lat, b.lng) || "zzz";
          if (na !== nb) return na.localeCompare(nb);
          return b.mention_count - a.mention_count;
        });
        break;
      default:
        break;
    }
    return sorted;
  }, [places, activeCategory, neighbourhood, searchQuery, sort, linkedEventIds]);

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

  const selectStyle: React.CSSProperties = {
    background: "var(--bg-elevated)",
    color: "var(--fg)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-pill)",
    padding: "8px 16px",
    fontSize: 13,
    fontFamily: "var(--font-display-ui)",
    fontWeight: 600,
    cursor: "pointer",
  };

  return (
    <div
      className="h-full pt-14 md:pt-[92px] pb-24 md:pb-8 overflow-y-auto page-enter"
      style={{ background: "var(--bg)" }}
    >
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div
            className="flex-1 flex items-center gap-2 px-4"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-pill)",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <Search size={16} style={{ color: "var(--fg-subtle)" }} />
            <input
              type="text"
              placeholder="Search places…"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="flex-1 bg-transparent outline-none py-2.5 text-[14.5px]"
              style={{ color: "var(--fg)" }}
            />
          </div>
          <div className="flex gap-2">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
              style={selectStyle}
              className="focus-ring"
            >
              <option value="buzz">Buzz Score</option>
              <option value="mentions">Most Mentioned</option>
              <option value="newest">Newest</option>
              <option value="az">A–Z</option>
              <option value="rating">Rating</option>
              <option value="neighbourhood">Neighbourhood</option>
            </select>
            <select
              value={neighbourhood}
              onChange={(e) => setNeighbourhood(e.target.value)}
              style={selectStyle}
              className="focus-ring"
            >
              <option value="all">All Areas</option>
              {NEIGHBOURHOODS.map((n) => (
                <option key={n.name} value={n.name}>
                  {n.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <span
            className="eyebrow"
            style={{ color: "var(--fg-subtle)" }}
          >
            {filtered.length} place{filtered.length !== 1 ? "s" : ""}
            {activeCategory !== "all" && ` · ${activeCategory}`}
          </span>
        </div>

        {!isFiltersActive && !loading && mostLoved.length > 0 && (
          <div className="mb-6">
            <div
              className="eyebrow mb-2.5"
              style={{ color: "var(--brand)" }}
            >
              <Zap size={11} className="inline -mt-0.5 mr-1" /> Most Loved
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
              {mostLoved.map((r) => (
                <button
                  key={r.id}
                  onClick={() => onViewOnMap(r.lat, r.lng)}
                  className="shrink-0 flex items-center gap-3 press-down group"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-pill)",
                    padding: "6px 14px 6px 6px",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      width: 32,
                      height: 32,
                      borderRadius: 9999,
                      alignItems: "center",
                      justifyContent: "center",
                      background: `${CATEGORY_COLORS[r.category] || "#64748b"}1f`,
                      color: CATEGORY_COLORS[r.category] || "#64748b",
                    }}
                  >
                    <CategoryIcon category={r.category} size={16} />
                  </span>
                  <span className="text-left">
                    <span
                      className="block font-display-ui font-semibold text-[13px] truncate max-w-[140px] group-hover:text-[color:var(--brand)]"
                      style={{ color: "var(--fg)" }}
                    >
                      {r.name}
                    </span>
                    <span
                      className="block text-[11px]"
                      style={{ color: "var(--fg-subtle)" }}
                    >
                      {r.mention_count} mentions
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-20"
            style={{ color: "var(--fg-subtle)" }}
          >
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 9999,
                background: "var(--brand-gradient)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                boxShadow: "var(--glow-brand)",
                marginBottom: 16,
              }}
            >
              <Search size={32} strokeWidth={2} />
            </div>
            {searchQuery ? (
              <>
                <p
                  className="font-display text-xl"
                  style={{ color: "var(--fg)", fontWeight: 600 }}
                >
                  Nothing matches &ldquo;{searchQuery}&rdquo;
                </p>
                <p
                  className="text-[13.5px] mt-1"
                  style={{ color: "var(--fg-muted)" }}
                >
                  Try a neighbourhood, cuisine, or different spelling.
                </p>
                <button
                  onClick={() => onSearchChange("")}
                  className="btn-primary mt-5"
                >
                  Clear search
                </button>
              </>
            ) : activeCategory !== "all" ? (
              <p
                className="font-display text-xl"
                style={{ color: "var(--fg)", fontWeight: 600 }}
              >
                No {activeCategory} places match these filters
              </p>
            ) : (
              <p
                className="font-display text-xl"
                style={{ color: "var(--fg)", fontWeight: 600 }}
              >
                No places match these filters
              </p>
            )}
          </div>
        ) : grouped ? (
          <div className="space-y-8">
            {grouped.map(([hood, places]) => (
              <div key={hood}>
                <div className="flex items-center gap-2 mb-3">
                  <h2
                    className="font-display text-xl"
                    style={{
                      color: "var(--fg)",
                      fontWeight: 600,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {hood}
                  </h2>
                  <span
                    className="eyebrow"
                    style={{
                      background: "var(--bg-sunken)",
                      color: "var(--fg-muted)",
                      padding: "3px 10px",
                      borderRadius: 9999,
                    }}
                  >
                    {places.length}
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {places.map((r, pi) => (
                    <PlaceCard
                      key={r.id}
                      r={r}
                      onViewOnMap={onViewOnMap}
                      index={pi}
                      linkedEvents={venueEvents.get(r.id) ?? []}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((r, i) => (
              <PlaceCard
                key={r.id}
                r={r}
                onViewOnMap={onViewOnMap}
                index={i}
                linkedEvents={venueEvents.get(r.id) ?? []}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
