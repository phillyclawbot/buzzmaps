"use client";

import { useState } from "react";
import Link from "next/link";
import type { CollectionPlaceRow } from "@/lib/types";
import { CATEGORY_EMOJI } from "@/lib/types";

interface CollectionCardProps {
  emoji: string;
  title: string;
  description: string;
  linkParams: string;
  places: CollectionPlaceRow[];
}

export default function CollectionCard({
  emoji,
  title,
  description,
  linkParams,
  places,
}: CollectionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const previewCount = 5;
  const hasMore = places.length > previewCount;
  const visiblePlaces = expanded ? places : places.slice(0, previewCount);

  return (
    <div
      className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-[#ff6b35]/40 transition-all overflow-hidden cursor-pointer"
      onClick={() => setExpanded(!expanded)}
    >
      {/* Header */}
      <div className="bg-gradient-to-br from-[#ff6b35]/10 to-[#f59e0b]/5 px-5 pt-5 pb-3">
        <div className="flex items-start gap-3">
          <span className="text-3xl leading-none">{emoji}</span>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-slate-900 group-hover:text-[#ff6b35] transition-colors leading-tight">
              {title}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              {description}
            </p>
          </div>
          {/* Chevron indicator */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`text-slate-400 shrink-0 mt-1 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>

      {/* Count badge + place list */}
      <div className="px-5 pb-5 pt-3">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold bg-[#ff6b35]/10 text-[#ff6b35] px-2.5 py-1 rounded-full">
            {places.length} place{places.length !== 1 ? "s" : ""}
          </span>
          <Link
            href={`/${linkParams}`}
            className="text-xs text-slate-400 hover:text-[#ff6b35] transition-colors ml-auto"
            onClick={(e) => e.stopPropagation()}
          >
            View all →
          </Link>
        </div>

        {places.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No places found yet</p>
        ) : (
          <div className="space-y-1.5">
            {visiblePlaces.map((place, i) => (
              <div key={place.id} className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400 w-4 shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm leading-none shrink-0">
                  {CATEGORY_EMOJI[place.category] || "📍"}
                </span>
                <span className="text-xs font-medium text-slate-700 flex-1 truncate">
                  {place.name}
                </span>
                {place.google_rating && (
                  <span className="text-[10px] text-slate-400 shrink-0">
                    ⭐ {place.google_rating.toFixed(1)}
                  </span>
                )}
                <span className="text-[10px] text-[#ff6b35] font-semibold shrink-0 bg-[#ff6b35]/10 px-1.5 py-0.5 rounded-full">
                  {place.mention_count}💬
                </span>
              </div>
            ))}
            {hasMore && !expanded && (
              <p className="text-[10px] text-slate-400 pl-10">
                +{places.length - previewCount} more
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
