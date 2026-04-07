"use client";

import { useState } from "react";
import Link from "next/link";
import type { CollectionPlaceRow } from "@/lib/types";
import { CollectionIcon, CategoryIcon, IconStar, IconChat, IconShare } from "@/lib/icons";

interface CollectionCardProps {
  id: string;
  title: string;
  description: string;
  places: CollectionPlaceRow[];
  index?: number;
}

export default function CollectionCard({
  id,
  title,
  description,
  places,
  index = 0,
}: CollectionCardProps) {
  const [expanded, setExpanded] = useState(false);
  const previewCount = 5;
  const hasMore = places.length > previewCount;
  const visiblePlaces = expanded ? places : places.slice(0, previewCount);

  return (
    <div
      className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-[#ff6b35]/40 transition-all overflow-hidden animate-fade-in-up"
      style={{ "--stagger": index } as React.CSSProperties}
    >
      {/* Clickable header links to detail page */}
      <Link
        href={`/collections/${id}`}
        className="block bg-gradient-to-br from-slate-50 to-slate-100/50 px-5 pt-5 pb-3"
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 shadow-sm group-hover:border-[#ff6b35]/30 transition-colors">
            <CollectionIcon id={id} size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-slate-900 group-hover:text-[#ff6b35] transition-colors leading-tight">
              {title}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
              {description}
            </p>
          </div>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-slate-300 group-hover:text-[#ff6b35] transition-colors shrink-0 mt-1"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>
      </Link>

      {/* Place list with expand/collapse */}
      <div className="px-5 pb-5 pt-3">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold bg-[#ff6b35]/10 text-[#ff6b35] px-2.5 py-1 rounded-full">
            {places.length} place{places.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={() => {
              const url = `${window.location.origin}/collections/${id}`;
              navigator.clipboard.writeText(url);
            }}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-[#ff6b35] transition-colors cursor-pointer"
            title="Copy link"
          >
            <IconShare size={12} /> Share
          </button>
          {hasMore && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-slate-400 hover:text-[#ff6b35] transition-colors ml-auto cursor-pointer"
            >
              {expanded ? "Show less" : "Show all"}
            </button>
          )}
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
                <span className="text-slate-400 shrink-0">
                  <CategoryIcon category={place.category} size={14} />
                </span>
                <span className="text-xs font-medium text-slate-700 flex-1 truncate">
                  {place.name}
                </span>
                {place.google_rating && (
                  <span className="flex items-center gap-0.5 text-[10px] text-amber-500 shrink-0">
                    <IconStar size={10} className="text-amber-400" /> {place.google_rating.toFixed(1)}
                  </span>
                )}
                <span className="flex items-center gap-0.5 text-[10px] text-[#ff6b35] font-semibold shrink-0 bg-[#ff6b35]/10 px-1.5 py-0.5 rounded-full">
                  {place.mention_count}
                  <IconChat size={10} className="text-[#ff6b35]" />
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
