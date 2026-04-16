"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { CollectionPlaceRow } from "@/lib/types";
import { CollectionIcon } from "@/lib/icons";
import { ArrowUpRight } from "lucide-react";

interface CollectionCardProps {
  id: string;
  title: string;
  description: string;
  places: CollectionPlaceRow[];
  index?: number;
}

// Curated gradient per collection id — falls back to brand.
const COLLECTION_GRADIENT: Record<string, string> = {
  buzzing: "linear-gradient(135deg, #ff5b3a 0%, #ff8a3d 100%)",
  coffee: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
  parks: "linear-gradient(135deg, #10b981 0%, #84cc16 100%)",
  bars: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)",
  shops: "linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)",
  kensington: "linear-gradient(135deg, #f59e0b 0%, #ff8a3d 100%)",
  danforth: "linear-gradient(135deg, #ef4444 0%, #f97316 100%)",
  chinatown: "linear-gradient(135deg, #dc2626 0%, #ec4899 100%)",
  "little-italy": "linear-gradient(135deg, #16a34a 0%, #10b981 100%)",
  ramen: "linear-gradient(135deg, #f97316 0%, #ef4444 100%)",
  museums: "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
};

export default function CollectionCard({
  id,
  title,
  description,
  places,
  index = 0,
}: CollectionCardProps) {
  const top3 = places.slice(0, 3);
  const gradient =
    COLLECTION_GRADIENT[id] ??
    "linear-gradient(135deg, var(--brand) 0%, var(--brand-2) 100%)";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{
        duration: 0.55,
        ease: [0.22, 1, 0.36, 1],
        delay: index * 0.06,
      }}
      whileHover={{ y: -6 }}
      className="group"
    >
      <Link
        href={`/collections/${id}`}
        className="block overflow-hidden relative"
        style={{
          borderRadius: "var(--radius-xl)",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-sm)",
          transition: "box-shadow 240ms ease, border-color 240ms ease",
        }}
      >
        {/* Gradient cover with icon motif */}
        <div
          className="relative overflow-hidden"
          style={{
            aspectRatio: "16 / 9",
            background: gradient,
          }}
        >
          {/* Decorative blobs */}
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-40"
            style={{
              background:
                "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.35), transparent 45%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.25), transparent 50%)",
            }}
          />
          {/* Large collection icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.span
              animate={{ rotate: [0, 3, -3, 0], y: [0, -4, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              style={{
                display: "inline-flex",
                width: 104,
                height: 104,
                borderRadius: 32,
                background: "rgba(255,255,255,0.95)",
                boxShadow: "0 20px 40px rgba(0,0,0,0.18)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CollectionIcon id={id} size={56} />
            </motion.span>
          </div>
          {/* Place count chip */}
          <span
            className="absolute top-3 right-3 font-display-ui font-semibold"
            style={{
              background: "rgba(255,255,255,0.92)",
              color: "var(--fg)",
              padding: "4px 10px",
              borderRadius: 9999,
              fontSize: 11.5,
              letterSpacing: "0.02em",
            }}
          >
            {places.length} {places.length === 1 ? "place" : "places"}
          </span>
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-3 mb-1">
            <h2
              className="font-display text-[26px]"
              style={{
                color: "var(--fg)",
                fontWeight: 600,
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
              }}
            >
              {title}
            </h2>
            <span
              className="shrink-0 mt-1 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              style={{ color: "var(--fg-subtle)" }}
            >
              <ArrowUpRight size={20} strokeWidth={2.2} />
            </span>
          </div>

          <p
            className="mt-2 text-[14.5px]"
            style={{ color: "var(--fg-muted)", lineHeight: 1.45 }}
          >
            {description}
          </p>

          {top3.length > 0 && (
            <ul
              className="mt-4 pt-3 flex flex-col gap-1.5"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              {top3.map((p, i) => (
                <li
                  key={p.id}
                  className="flex items-baseline gap-2.5 text-[13px]"
                  style={{ color: "var(--fg-muted)" }}
                >
                  <span
                    className="font-display-ui font-semibold tabular-nums shrink-0"
                    style={{ color: "var(--fg-faint)", fontSize: 11 }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="truncate">{p.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
