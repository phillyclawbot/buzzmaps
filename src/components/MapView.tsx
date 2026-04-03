"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from "react-leaflet";
import type { Restaurant } from "@/lib/types";

function getMarkerColor(latestMention: number): string {
  const now = Date.now() / 1000;
  const age = now - latestMention;
  if (age < 86400) return "#ef4444"; // red - last 24h
  if (age < 604800) return "#f97316"; // orange - last week
  if (age < 2592000) return "#eab308"; // yellow - last month
  return "#6b7280"; // gray - older
}

function getMarkerSize(mentionCount: number): number {
  if (mentionCount >= 10) return 18;
  if (mentionCount >= 5) return 14;
  if (mentionCount >= 2) return 11;
  return 8;
}

function createIcon(color: string, size: number, isPulsing: boolean) {
  return L.divIcon({
    className: "",
    html: `<div style="
      width: ${size * 2}px;
      height: ${size * 2}px;
      background: ${color};
      border: 2px solid rgba(255,255,255,0.3);
      border-radius: 50%;
      box-shadow: 0 0 ${size}px ${color}80;
      ${isPulsing ? "animation: pulse-pin 2s infinite;" : ""}
    "></div>`,
    iconSize: [size * 2, size * 2],
    iconAnchor: [size, size],
  });
}

function formatTimeAgo(utc: number): string {
  const seconds = Math.floor(Date.now() / 1000 - utc);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return `${Math.floor(seconds / 604800)}w ago`;
}

function sentimentDot(sentiment: string): string {
  const colors: Record<string, string> = {
    positive: "#22c55e",
    negative: "#ef4444",
    neutral: "#eab308",
  };
  return `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${colors[sentiment] || colors.neutral};margin-right:4px;"></span>`;
}

function renderStars(rating: number | null): string {
  if (!rating) return "";
  const full = Math.floor(rating);
  const half = rating - full >= 0.5 ? 1 : 0;
  return (
    '<span style="color:#eab308;">' +
    "\u2605".repeat(full) +
    (half ? "\u00BD" : "") +
    "</span> " +
    rating.toFixed(1)
  );
}

function FlyToHandler({ target }: { target: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo(target, 16, { duration: 1 });
    }
  }, [map, target]);
  return null;
}

export default function MapView({
  restaurants,
  flyTo,
}: {
  restaurants: Restaurant[];
  flyTo: [number, number] | null;
}) {
  const mapRef = useRef<L.Map | null>(null);

  return (
    <MapContainer
      center={[43.6532, -79.3832]}
      zoom={12}
      className="h-full w-full"
      zoomControl={false}
      ref={mapRef}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <FlyToHandler target={flyTo} />
      {restaurants.map((r) => {
        const color = getMarkerColor(r.latest_mention);
        const size = getMarkerSize(Number(r.mention_count));
        const isPulsing = Date.now() / 1000 - r.latest_mention < 86400;

        return (
          <Marker
            key={r.id}
            position={[r.lat, r.lng]}
            icon={createIcon(color, size, isPulsing)}
          >
            <Popup maxWidth={320} minWidth={280}>
              <div style={{ fontFamily: "inherit" }}>
                <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "4px", color: "#f97316" }}>
                  {r.name}
                </div>
                {r.google_rating && (
                  <div
                    style={{ fontSize: "13px", marginBottom: "4px" }}
                    dangerouslySetInnerHTML={{
                      __html: `${renderStars(r.google_rating)} <span style="color:#6b7280;">(${r.google_reviews_count || 0} reviews)</span>`,
                    }}
                  />
                )}
                <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}>
                  {r.address}
                </div>
                <div style={{ fontSize: "11px", color: "#6b7280", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  {r.mention_count} Reddit mention{Number(r.mention_count) !== 1 ? "s" : ""}
                </div>
                <div style={{ maxHeight: "200px", overflowY: "auto" }}>
                  {r.posts?.slice(0, 5).map((p) => (
                    <a
                      key={p.id}
                      href={`https://reddit.com${p.permalink}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "block",
                        padding: "6px 0",
                        borderTop: "1px solid #2a2a3e",
                        textDecoration: "none",
                        color: "#e5e5e5",
                        fontSize: "12px",
                      }}
                    >
                      <span dangerouslySetInnerHTML={{ __html: sentimentDot(p.sentiment) }} />
                      <span style={{ fontWeight: 500 }}>{p.title.slice(0, 80)}{p.title.length > 80 ? "..." : ""}</span>
                      <div style={{ color: "#6b7280", fontSize: "11px", marginTop: "2px" }}>
                        r/{p.subreddit} · {p.score} pts · {formatTimeAgo(p.created_utc)}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
