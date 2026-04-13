"use client";

import Link from "next/link";
import type { CollectionPlaceRow } from "@/lib/types";

interface CollectionCardProps {
  id: string;
  title: string;
  description: string;
  places: CollectionPlaceRow[];
  index?: number;
}

/**
 * Editorial collection tease — like a magazine TOC entry.
 * Shows the collection title, description, and the top 3 places by name.
 */
export default function CollectionCard({
  id,
  title,
  description,
  places,
  index = 0,
}: CollectionCardProps) {
  const top3 = places.slice(0, 3);

  return (
    <Link
      href={`/collections/${id}`}
      className="group block animate-fade-in-up"
      style={{ ["--stagger" as string]: index } as React.CSSProperties}
    >
      <div
        className="pb-2 mb-4"
        style={{ borderBottom: "1px solid var(--fg)" }}
      >
        <p className="dateline">
          {places.length} {places.length === 1 ? "place" : "places"}
        </p>
      </div>

      <h2
        className="font-display text-2xl md:text-3xl mb-3 ink-underline inline"
        style={{ color: "var(--fg)", fontWeight: 500, lineHeight: 1.1 }}
      >
        {title}
      </h2>

      <p
        className="caption mt-3 mb-5"
        style={{ color: "var(--fg-muted)" }}
      >
        {description}
      </p>

      {top3.length > 0 && (
        <ol className="space-y-1.5">
          {top3.map((p, i) => (
            <li
              key={p.id}
              className="flex items-baseline gap-2.5 text-sm font-serif"
              style={{ color: "var(--fg-muted)" }}
            >
              <span
                className="dateline shrink-0"
                style={{ color: "var(--fg-faint)" }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="truncate">{p.name}</span>
            </li>
          ))}
          {places.length > 3 && (
            <li
              className="dateline pt-1"
              style={{ color: "var(--fg-subtle)" }}
            >
              + {places.length - 3} more
            </li>
          )}
        </ol>
      )}

      <p
        className="eyebrow mt-6 group-hover:text-[color:var(--brand)] transition-colors"
        style={{ color: "var(--fg-subtle)" }}
      >
        Read the list →
      </p>
    </Link>
  );
}
