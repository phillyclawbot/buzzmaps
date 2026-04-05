"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
} from "react-leaflet";
import type { Restaurant, PlaceCategory } from "@/lib/types";
import { CATEGORY_EMOJI } from "@/lib/types";
import { CATEGORY_COLORS, SENTIMENT_COLORS } from "@/lib/constants";
import { formatTimeAgo, haversineDistance } from "@/lib/utils";



function createPinIcon(category: PlaceCategory, mentionCount: number, isRecent: boolean) {
  const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.other;
  const emoji = CATEGORY_EMOJI[category] || '\u{1F4CD}';
  const size = 28;
  const triH = 8;
  const totalH = size + triH;
  const showPulse = isRecent && mentionCount >= 2;

  const pulseRing = showPulse ? `
    <div style="position:absolute;top:-5px;left:-5px;width:${size + 10}px;height:${size + 10}px;border-radius:50%;border:2.5px solid #ff6b35;opacity:0;animation:pinPulse 1.8s ease-out infinite;"></div>
    <div style="position:absolute;top:-5px;left:-5px;width:${size + 10}px;height:${size + 10}px;border-radius:50%;border:2.5px solid #ff6b35;opacity:0;animation:pinPulse 1.8s ease-out 0.9s infinite;"></div>
  ` : '';

  return L.divIcon({
    html: `<div style="position:relative;width:${size}px;height:${totalH}px;">
      ${pulseRing}
      <div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};box-shadow:0 2px 8px rgba(0,0,0,0.28),0 0 0 2px rgba(255,255,255,0.7);display:flex;align-items:center;justify-content:center;font-size:14px;line-height:1;">${emoji}</div>
      <div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:${triH}px solid ${color};margin:0 auto;"></div>
    </div>`,
    className: '',
    iconSize: [size, totalH],
    iconAnchor: [size / 2, totalH],
    popupAnchor: [0, -totalH],
  });
}

function sentimentDot(sentiment: string): string {
  return `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${SENTIMENT_COLORS[sentiment] || SENTIMENT_COLORS.neutral};margin-right:4px;"></span>`;
}

function renderStars(rating: number | null): string {
  if (!rating) return "";
  const full = Math.floor(rating);
  const half = rating - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return (
    '<span style="color:#f59e0b;font-size:13px;letter-spacing:1px;">' +
    "\u2605".repeat(full) +
    (half ? '<span style="color:#fcd34d;">\u2605</span>' : "") +
    '<span style="color:#e2e8f0;">\u2605</span>'.repeat(empty) +
    "</span> <span style='font-size:12px;font-weight:700;color:#374151;'>" + rating.toFixed(1) + "</span>"
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

const calcDist = haversineDistance;

function getHeatColor(mentions: number): string {
  if (mentions >= 10) return "#ef4444"; // red
  if (mentions >= 6) return "#f97316"; // orange
  if (mentions >= 3) return "#eab308"; // yellow
  return "#22c55e"; // green
}

function getHeatRadius(mentions: number): number {
  return Math.min(200 + mentions * 100, 800);
}

export default function MapView({
  restaurants,
  flyTo,
  heatmapMode = false,
  onNearMeToggle,
  nearMeActive = false,
  nearMeRadius = 2,
  onRadiusChange,
  nearMeCount,
}: {
  restaurants: Restaurant[];
  flyTo: [number, number] | null;
  heatmapMode?: boolean;
  onNearMeToggle?: (coords: { lat: number; lng: number } | null) => void;
  nearMeActive?: boolean;
  nearMeRadius?: number;
  onRadiusChange?: (km: number) => void;
  nearMeCount?: number;
}) {
  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);

  const handleNearMe = () => {
    if (nearMeActive) {
      if (onNearMeToggle) onNearMeToggle(null);
      setUserCoords(null);
      if (userMarkerRef.current && mapRef.current) {
        mapRef.current.removeLayer(userMarkerRef.current);
        userMarkerRef.current = null;
      }
      return;
    }
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      setUserCoords({ lat: latitude, lng: longitude });
      if (mapRef.current) {
        mapRef.current.flyTo([latitude, longitude], 14, { duration: 1.2 });
        if (userMarkerRef.current) {
          mapRef.current.removeLayer(userMarkerRef.current);
        }
        const pulseIcon = L.divIcon({
          html: `<div style="width:20px;height:20px;position:relative;">
            <div style="position:absolute;inset:0;border-radius:50%;background:#3b82f6;opacity:0.3;animation:nearMePulse 1.5s ease-out infinite;"></div>
            <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:12px;height:12px;border-radius:50%;background:#3b82f6;border:2px solid white;box-shadow:0 0 6px rgba(59,130,246,0.6);"></div>
          </div>`,
          className: '',
          iconSize: [20, 20],
          iconAnchor: [10, 10],
        });
        userMarkerRef.current = L.marker([latitude, longitude], { icon: pulseIcon }).addTo(mapRef.current);
      }
      if (onNearMeToggle) onNearMeToggle({ lat: latitude, lng: longitude });
    });
  };

  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
    {/* Near Me floating button */}
    <div style={{ position: "absolute", bottom: "112px", right: "12px", zIndex: 500, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
      {/* Radius panel — only when active */}
      {nearMeActive && (
        <div style={{
          background: "white",
          border: "1px solid #e2e8f0",
          borderRadius: "12px",
          padding: "10px 12px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
          minWidth: "180px",
        }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "#3b82f6", marginBottom: "6px" }}>
            📍 {nearMeCount ?? 0} place{nearMeCount !== 1 ? "s" : ""} within {nearMeRadius < 1 ? Math.round(nearMeRadius * 1000) + "m" : nearMeRadius + "km"}
          </div>
          <input
            type="range"
            min={0.5}
            max={20}
            step={0.5}
            value={nearMeRadius}
            onChange={(e) => onRadiusChange && onRadiusChange(parseFloat(e.target.value))}
            style={{ width: "100%", accentColor: "#3b82f6", cursor: "pointer" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>
            <span>500m</span><span>20km</span>
          </div>
        </div>
      )}
      <button
        onClick={handleNearMe}
        style={{
          background: nearMeActive ? "linear-gradient(to right, #3b82f6, #2563eb)" : "white",
          border: nearMeActive ? "none" : "1px solid #e2e8f0",
          borderRadius: "8px",
          padding: "6px 10px",
          fontSize: "12px",
          fontWeight: 600,
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
          color: nearMeActive ? "white" : "#334155",
        }}
      >
        📍 Near Me
      </button>
    </div>
    <MapContainer
      center={[43.6532, -79.3832]}
      zoom={12}
      className="h-full w-full"
      zoomControl={false}
      ref={mapRef}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <FlyToHandler target={flyTo} />
      {/* Near Me radius circle */}
      {nearMeActive && userCoords && (
        <Circle
          center={[userCoords.lat, userCoords.lng]}
          radius={nearMeRadius * 1000}
          pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.08, weight: 2, dashArray: "6 4" }}
        />
      )}
      {heatmapMode ? (
        restaurants.map((r) => {
          const mentionCount = Number(r.mention_count);
          return (
            <Circle
              key={r.id}
              center={[r.lat, r.lng]}
              radius={getHeatRadius(mentionCount)}
              pathOptions={{
                color: getHeatColor(mentionCount),
                fillColor: getHeatColor(mentionCount),
                fillOpacity: 0.35,
                weight: 0,
              }}
            />
          );
        })
      ) : (
        restaurants.map((r) => {
          const category = r.category || "restaurant";
          const mentionCount = Number(r.mention_count);
          const isRecent = Date.now() / 1000 - r.latest_mention < 86400;
          const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.other;

          // Build unique sources list (up to 3)
          const sources = Array.from(
            new Set((r.posts ?? []).map((p) => p.subreddit))
          ).slice(0, 3);
          const sourcesLabel = sources
            .map((s) => (s.startsWith("r/") || /^[a-zA-Z]+TO$|BlogTO|Narcity|Toronto Life|NOW Magazine|Toronto Star/.test(s) ? s : `r/${s}`))
            .join(", ");

          const nearbyPlaces = restaurants
            .filter((n) => n.id !== r.id)
            .map((n) => ({ ...n, dist: calcDist(r.lat, r.lng, n.lat, n.lng) }))
            .filter((n) => n.dist <= 500)
            .sort((a, b) => a.dist - b.dist)
            .slice(0, 3);

          return (
            <Marker
              key={r.id}
              position={[r.lat, r.lng]}
              icon={createPinIcon(category, mentionCount, isRecent)}
            >
              <Popup maxWidth={320} minWidth={280}>
                <div style={{ fontFamily: "inherit" }}>
                  {/* Header gradient */}
                  <div style={{
                    background: `linear-gradient(135deg, ${color}18 0%, ${color}08 100%)`,
                    borderRadius: "8px 8px 0 0",
                    padding: "10px 10px 8px",
                    margin: "-4px -4px 8px",
                    borderBottom: `2px solid ${color}20`,
                  }}>
                    {r.photo_url && (
                      <img
                        src={r.photo_url}
                        alt={r.name}
                        style={{ width: "100%", maxHeight: "100px", objectFit: "cover", borderRadius: "6px", marginBottom: "8px", display: "block" }}
                      />
                    )}
                    <div style={{ fontSize: "16px", fontWeight: 800, marginBottom: "2px", color, lineHeight: 1.2 }}>
                      {CATEGORY_EMOJI[category]} {r.name}
                    </div>
                    {r.address && (
                      <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "2px" }}>
                        {r.address}
                      </div>
                    )}
                  </div>
                  {r.google_rating && (
                    <div
                      style={{ fontSize: "13px", marginBottom: "6px" }}
                      dangerouslySetInnerHTML={{
                        __html: `${renderStars(r.google_rating)} <span style="color:#9ca3af;font-size:10px;">${r.google_reviews_count ? `(${r.google_reviews_count.toLocaleString()} reviews)` : ""}</span>`,
                      }}
                    />
                  )}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginBottom: "8px" }}>
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "3px",
                      background: "#ff6b3520",
                      color: "#ff6b35",
                      fontWeight: 700,
                      fontSize: "11px",
                      padding: "3px 10px",
                      borderRadius: "999px",
                      border: "1px solid #ff6b3540",
                    }}>
                      💬 {r.mention_count} Reddit thread{Number(r.mention_count) !== 1 ? "s" : ""}
                    </span>
                    {sources.slice(0, 3).map((s) => (
                      <span key={s} style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "3px",
                        background: /BlogTO|Narcity|Toronto Life|NOW Magazine|Toronto Star|Eater/.test(s) ? "#eff6ff" : "#f0fdf4",
                        color: /BlogTO|Narcity|Toronto Life|NOW Magazine|Toronto Star|Eater/.test(s) ? "#3b82f6" : "#16a34a",
                        fontWeight: 600,
                        fontSize: "10px",
                        padding: "2px 7px",
                        borderRadius: "999px",
                        border: /BlogTO|Narcity|Toronto Life|NOW Magazine|Toronto Star|Eater/.test(s) ? "1px solid #bfdbfe" : "1px solid #bbf7d0",
                      }}>
                        {/BlogTO|Narcity|Toronto Life|NOW Magazine|Toronto Star|Eater/.test(s) ? "📰" : "🤖"} {s.startsWith("r/") ? s : /^[a-zA-Z0-9_]+$/.test(s) ? `r/${s}` : s}
                      </span>
                    ))}
                  </div>
                  <div style={{ maxHeight: "180px", overflowY: "auto" }}>
                    {r.posts?.slice(0, 3).map((p) => (
                      <a
                        key={p.id}
                        href={`https://reddit.com${p.permalink}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "block",
                          padding: "6px 0",
                          borderTop: "1px solid #e2e8f0",
                          textDecoration: "none",
                          color: "#334155",
                          fontSize: "12px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "6px" }}>
                          <span dangerouslySetInnerHTML={{ __html: sentimentDot(p.sentiment) }} />
                          <span style={{ fontWeight: 500, color: "#ff6b35", flex: 1 }}>{p.title.slice(0, 60)}{p.title.length > 60 ? "..." : ""}</span>
                        </div>
                        <div style={{ color: "#9ca3af", fontSize: "10px", marginTop: "2px", paddingLeft: "14px" }}>
                          r/{p.subreddit} · {p.score} pts · {formatTimeAgo(p.created_utc)}
                        </div>
                      </a>
                    ))}
                  </div>
                  {sources.length > 0 && (
                    <div style={{ fontSize: "10px", color: "#9ca3af", marginTop: "6px", borderTop: "1px solid #f1f5f9", paddingTop: "6px" }}>
                      Mentioned in: {sourcesLabel}
                    </div>
                  )}
                  {nearbyPlaces.length > 0 && (
                    <div style={{ marginTop: "8px", borderTop: "1px solid #f1f5f9", paddingTop: "6px" }}>
                      <div style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>Nearby</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                        {nearbyPlaces.map((np) => (
                          <a
                            key={np.id}
                            href={`/place/${encodeURIComponent(np.name)}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                              padding: "3px 8px",
                              background: "#f8fafc",
                              border: "1px solid #e2e8f0",
                              borderRadius: "999px",
                              fontSize: "11px",
                              color: "#334155",
                              textDecoration: "none",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {CATEGORY_EMOJI[np.category] || "📍"} {np.name.length > 18 ? np.name.slice(0, 18) + "…" : np.name}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  <div style={{ marginTop: "8px", borderTop: "1px solid #f1f5f9", paddingTop: "8px" }}>
                    <a
                      href={`/place/${encodeURIComponent(r.name)}`}
                      style={{
                        display: "block",
                        textAlign: "center",
                        padding: "6px 12px",
                        background: "#fff7f4",
                        border: "1px solid #ff6b3540",
                        borderRadius: "8px",
                        color: "#ff6b35",
                        fontWeight: 700,
                        fontSize: "12px",
                        textDecoration: "none",
                      }}
                    >
                      View Profile →
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })
      )}
    </MapContainer>
    </div>
  );
}
