"use client";

import { useEffect, useRef, useState, useMemo, memo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  useMap,
  useMapEvents,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import type { Place, PlaceCategory } from "@/lib/types";
import { CATEGORY_COLORS, SENTIMENT_COLORS } from "@/lib/constants";
import { decodeHtmlEntities, getPostHref, getPostSource } from "@/lib/post-source";
import { formatTimeAgo } from "@/lib/utils";
import { getNeighbourhood } from "@/lib/neighbourhoods";

// ─────────────────────────────────────────────────────────
// Tile provider: CARTO Positron — minimal light basemap.
// Free for non-commercial / fair use; attributed below.
// Dark mode swap handled via `prefers-color-scheme` on a
// second <TileLayer> (Leaflet picks the one that matches).
// ─────────────────────────────────────────────────────────

const TILE_LIGHT =
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILE_DARK =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>';

// ─────────────────────────────────────────────────────────
// Pin design: flat desaturated circle in the category color,
// no white border, no drop shadow. Lets the quiet basemap
// breathe. Size scales logarithmically with mention count.
// Fresh-within-24h places get two subtle pulse rings.
// ─────────────────────────────────────────────────────────

function createPinIcon(
  category: PlaceCategory,
  mentionCount: number,
  isRecent: boolean
) {
  const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.other;
  const showPulse = isRecent && mentionCount >= 2;

  // Size: 14 → 24 depending on buzz
  const size = Math.min(24, Math.max(14, 12 + Math.sqrt(mentionCount) * 2.5));
  const S = Math.ceil(size);
  const r = size / 2;
  const hit = S + 6; // larger hit area for easier tapping

  const pulseRing = showPulse
    ? `
    <span style="position:absolute;top:${-6}px;left:${-6}px;width:${S + 12}px;height:${S + 12}px;border-radius:50%;border:1.5px solid ${color};opacity:0;animation:pinPulse 2s ease-out infinite;pointer-events:none;"></span>
    <span style="position:absolute;top:${-6}px;left:${-6}px;width:${S + 12}px;height:${S + 12}px;border-radius:50%;border:1.5px solid ${color};opacity:0;animation:pinPulse 2s ease-out 1s infinite;pointer-events:none;"></span>
  `
    : "";

  const dot = `
    <svg width="${S}" height="${S}" viewBox="0 0 ${S} ${S}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${r}" cy="${r}" r="${r - 0.5}" fill="${color}" />
    </svg>
  `;

  return L.divIcon({
    html: `
      <span style="position:relative;display:block;width:${hit}px;height:${hit}px;">
        <span style="position:absolute;top:${(hit - S) / 2}px;left:${(hit - S) / 2}px;width:${S}px;height:${S}px;">
          ${pulseRing}${dot}
        </span>
      </span>
    `,
    className: "",
    iconSize: [hit, hit],
    iconAnchor: [hit / 2, hit / 2],
    popupAnchor: [0, -S / 2 - 2],
  });
}

// ─────────────────────────────────────────────────────────
// Cluster icon: hairline ink-colored ring, serif numeral.
// Matches the editorial type system. No colored fill.
// ─────────────────────────────────────────────────────────

function createClusterIcon(cluster: {
  getChildCount: () => number;
}) {
  const count = cluster.getChildCount();
  const size = Math.max(32, Math.min(52, 28 + Math.sqrt(count) * 3));
  const S = Math.round(size);
  const fontSize = count >= 1000 ? 12 : count >= 100 ? 13 : 15;

  return L.divIcon({
    html: `
      <span style="
        display:flex;align-items:center;justify-content:center;
        width:${S}px;height:${S}px;
        border-radius:50%;
        background:color-mix(in srgb, var(--bg-elevated, #fff) 90%, transparent);
        border:1px solid var(--fg, #141211);
        color:var(--fg, #141211);
        font-family: var(--font-fraunces), Georgia, serif;
        font-weight:500;
        font-size:${fontSize}px;
        font-variation-settings: 'opsz' 24;
        backdrop-filter:blur(4px);
        -webkit-backdrop-filter:blur(4px);
        line-height:1;
      ">${count}</span>
    `,
    className: "",
    iconSize: [S, S],
    iconAnchor: [S / 2, S / 2],
  });
}

function InitialLocationHandler() {
  const map = useMap();
  const hasRun = useRef(false);
  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    map.setZoom(13);

    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.flyTo([pos.coords.latitude, pos.coords.longitude], 13, {
          duration: 1,
        });
      },
      () => {
        /* denied — stay on default */
      },
      { timeout: 5000 }
    );
  }, [map]);
  return null;
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

function ZoomTracker({ onZoom }: { onZoom: (z: number) => void }) {
  const map = useMapEvents({
    zoomend: () => onZoom(map.getZoom()),
  });
  return null;
}

// Dark-mode detection without SSR hydration mismatch. Listens for
// prefers-color-scheme changes and re-renders the TileLayer key so
// Leaflet swaps tiles cleanly.
function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return isDark;
}

export default memo(function MapView({
  places,
  flyTo,
  onNearMeToggle,
  nearMeActive = false,
  nearMeRadius = 2,
  onRadiusChange,
  nearMeCount,
  venueEvents = new Map(),
}: {
  places: Place[];
  flyTo: [number, number] | null;
  onNearMeToggle?: (coords: { lat: number; lng: number } | null) => void;
  nearMeActive?: boolean;
  nearMeRadius?: number;
  onRadiusChange?: (km: number) => void;
  nearMeCount?: number;
  venueEvents?: Map<number, Place[]>;
}) {
  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [, setZoom] = useState(13);
  const isDark = useIsDark();

  // Deduplicate places with the same name — keep highest mention count
  const dedupedPlaces = useMemo(() => {
    const byName = new Map<string, typeof places[0]>();
    for (const p of places) {
      const key = p.name.trim().toLowerCase();
      const existing = byName.get(key);
      if (!existing || Number(p.mention_count) > Number(existing.mention_count)) {
        byName.set(key, p);
      }
    }
    return Array.from(byName.values());
  }, [places]);

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
          html: `<span style="width:18px;height:18px;position:relative;display:block;">
            <span style="position:absolute;inset:0;border-radius:50%;background:var(--brand, #d94e1f);opacity:0.25;animation:nearMePulse 1.5s ease-out infinite;"></span>
            <span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:10px;height:10px;border-radius:50%;background:var(--brand, #d94e1f);border:2px solid #faf7f2;"></span>
          </span>`,
          className: "",
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        });
        userMarkerRef.current = L.marker([latitude, longitude], { icon: pulseIcon }).addTo(mapRef.current);
      }
      if (onNearMeToggle) onNearMeToggle({ lat: latitude, lng: longitude });
    });
  };

  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      {/* Near-me FAB + radius panel (bottom-right) */}
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          right: "20px",
          zIndex: 500,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: "8px",
        }}
      >
        {nearMeActive && (
          <div
            className="app-card"
            style={{
              padding: "12px 14px",
              minWidth: "200px",
              fontFamily: "var(--font-sans)",
            }}
          >
            <p
              className="dateline"
              style={{ marginBottom: 8, color: "var(--fg-muted)" }}
            >
              {nearMeCount ?? 0}{" "}
              {nearMeCount === 1 ? "place" : "places"} within{" "}
              {nearMeRadius < 1
                ? Math.round(nearMeRadius * 1000) + "m"
                : nearMeRadius + "km"}
            </p>
            <input
              type="range"
              min={0.5}
              max={20}
              step={0.5}
              value={nearMeRadius}
              onChange={(e) =>
                onRadiusChange && onRadiusChange(parseFloat(e.target.value))
              }
              style={{
                width: "100%",
                accentColor: "var(--brand)",
                cursor: "pointer",
              }}
              aria-label="Search radius"
            />
            <div
              className="dateline"
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 4,
                color: "var(--fg-subtle)",
              }}
            >
              <span>500m</span>
              <span>20km</span>
            </div>
          </div>
        )}
        <button
          onClick={handleNearMe}
          className="press-down focus-ring"
          style={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            background: nearMeActive ? "var(--brand)" : "var(--bg-elevated)",
            border: "1px solid var(--border-strong)",
            cursor: "pointer",
            boxShadow: "var(--shadow-md)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: nearMeActive ? "var(--fg-inverse)" : "var(--fg)",
          }}
          aria-label={nearMeActive ? "Clear near me" : "Find places near me"}
          aria-pressed={nearMeActive}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="3" />
            <line x1="12" y1="2" x2="12" y2="5" />
            <line x1="12" y1="19" x2="12" y2="22" />
            <line x1="2" y1="12" x2="5" y2="12" />
            <line x1="19" y1="12" x2="22" y2="12" />
          </svg>
        </button>
      </div>

      <MapContainer
        center={[43.6532, -79.3832]}
        zoom={13}
        className="h-full w-full"
        zoomControl={false}
        ref={mapRef}
      >
        {/* Tile layer keys force Leaflet to swap cleanly when dark mode toggles. */}
        <TileLayer
          key={isDark ? "dark" : "light"}
          attribution={TILE_ATTR}
          url={isDark ? TILE_DARK : TILE_LIGHT}
          subdomains={["a", "b", "c", "d"]}
        />

        <InitialLocationHandler />
        <FlyToHandler target={flyTo} />
        <ZoomTracker onZoom={setZoom} />

        {nearMeActive && userCoords && (
          <Circle
            center={[userCoords.lat, userCoords.lng]}
            radius={nearMeRadius * 1000}
            pathOptions={{
              color: "var(--brand)",
              fillColor: "var(--brand)",
              fillOpacity: 0.06,
              weight: 1.5,
              dashArray: "4 4",
            }}
          />
        )}

        <MarkerClusterGroup
          chunkedLoading
          iconCreateFunction={createClusterIcon}
          showCoverageOnHover={false}
          spiderfyOnMaxZoom
          maxClusterRadius={60}
          disableClusteringAtZoom={17}
        >
          {dedupedPlaces.map((r) => {
            const category = r.category || "other";
            const mentionCount = Number(r.mention_count);
            const isRecent = Date.now() / 1000 - r.latest_mention < 86400;

            return (
              <Marker
                key={r.id}
                position={[r.lat, r.lng]}
                icon={createPinIcon(category, mentionCount, isRecent)}
              >
              <Popup maxWidth={340} minWidth={260}>
                <div style={{ fontFamily: "var(--font-sans)", lineHeight: 1.4, color: "var(--fg)" }}>
                  {/* Hero photo */}
                  {r.photo_url && (
                    <a
                      href={`/place/${encodeURIComponent(r.name)}`}
                      style={{ display: "block", margin: "-4px -4px 0" }}
                    >
                      <img
                        src={r.photo_url}
                        alt={r.name}
                        style={{
                          width: "100%",
                          height: "120px",
                          objectFit: "cover",
                          display: "block",
                          borderBottom: "1px solid var(--border)",
                        }}
                      />
                    </a>
                  )}

                  {/* Title + eyebrow */}
                  <div style={{ padding: "12px 14px 10px" }}>
                    <div
                      style={{
                        fontFamily: "var(--font-sans)",
                        fontSize: "10px",
                        fontWeight: 600,
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                        color: "var(--brand)",
                        marginBottom: "4px",
                      }}
                    >
                      {String(category).toUpperCase()}
                      {isRecent && mentionCount >= 2 && (
                        <span
                          style={{
                            fontFamily: "var(--font-serif)",
                            fontStyle: "italic",
                            fontWeight: 400,
                            letterSpacing: "normal",
                            textTransform: "none",
                            color: "var(--fg-muted)",
                            marginLeft: "6px",
                          }}
                        >
                          , trending
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--font-serif)",
                        fontSize: "20px",
                        fontWeight: 500,
                        color: "var(--fg)",
                        lineHeight: 1.15,
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {r.name}
                    </div>
                    {r.cuisine_type && (
                      <div
                        style={{
                          fontFamily: "var(--font-serif)",
                          fontStyle: "italic",
                          fontSize: "13px",
                          color: "var(--fg-muted)",
                          marginTop: "3px",
                        }}
                      >
                        {r.cuisine_type}
                      </div>
                    )}

                    {/* Stats — mono dateline row */}
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "11px",
                        letterSpacing: "0.04em",
                        color: "var(--fg-subtle)",
                        marginTop: "8px",
                      }}
                    >
                      {r.google_rating ? `${r.google_rating.toFixed(1)}★` : ""}
                      {r.google_rating ? " · " : ""}
                      {r.mention_count} {Number(r.mention_count) !== 1 ? "mentions" : "mention"}
                    </div>
                  </div>

                  {/* Event metadata OR mentions list */}
                  {r.category === "event" ? (
                    <div
                      style={{
                        padding: "10px 14px",
                        borderTop: "1px solid var(--border)",
                      }}
                    >
                      {r.metadata?.event_date && (
                        <div
                          style={{
                            fontFamily: "var(--font-serif)",
                            fontSize: "14px",
                            fontWeight: 500,
                            color: "var(--fg)",
                            marginBottom: "2px",
                          }}
                        >
                          {new Date(r.metadata.event_date).toLocaleDateString(
                            "en-CA",
                            {
                              weekday: "long",
                              month: "long",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            }
                          )}
                        </div>
                      )}
                      {r.metadata?.venue_name && (
                        <div
                          style={{
                            fontFamily: "var(--font-serif)",
                            fontStyle: "italic",
                            fontSize: "13px",
                            color: "var(--fg-muted)",
                          }}
                        >
                          {r.metadata.venue_name}
                        </div>
                      )}
                      <div
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "11px",
                          color: "var(--fg-subtle)",
                          marginTop: "6px",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {r.metadata?.genre && <>{r.metadata.genre}</>}
                        {r.metadata?.genre && r.metadata?.price_range && " · "}
                        {r.metadata?.price_range && <>{r.metadata.price_range}</>}
                        {r.posts?.[0] && (
                          <>
                            {(r.metadata?.genre || r.metadata?.price_range) && " · "}
                            via {getPostSource(r.posts[0].subreddit).label}
                          </>
                        )}
                      </div>
                    </div>
                  ) : r.posts?.length ? (
                    <div
                      style={{
                        padding: "4px 14px 8px",
                        borderTop: "1px solid var(--border)",
                        maxHeight: "160px",
                        overflowY: "auto",
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "var(--font-sans)",
                          fontSize: "10px",
                          fontWeight: 600,
                          letterSpacing: "0.14em",
                          textTransform: "uppercase",
                          color: "var(--fg-subtle)",
                          padding: "8px 0 6px",
                        }}
                      >
                        Mentions
                      </div>
                      {r.posts.map((p: { id: number; title: string; subreddit: string; score: number; sentiment: string; created_utc: number; permalink: string; mentions_in_thread?: number }) => (
                        <a
                          key={p.id}
                          href={getPostHref(p.subreddit, p.permalink)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            gap: "8px",
                            padding: "6px 0",
                            textDecoration: "none",
                            borderTop: "1px solid var(--border)",
                          }}
                        >
                          <span
                            style={{
                              display: "inline-block",
                              width: "7px",
                              height: "7px",
                              borderRadius: "50%",
                              marginTop: "6px",
                              flexShrink: 0,
                              background:
                                SENTIMENT_COLORS[p.sentiment] ||
                                SENTIMENT_COLORS.neutral,
                            }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div
                              style={{
                                fontFamily: "var(--font-serif)",
                                fontSize: "13px",
                                color: "var(--fg)",
                                lineHeight: 1.35,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                              }}
                            >
                              {decodeHtmlEntities(p.title)}
                            </div>
                            <div
                              style={{
                                fontFamily: "var(--font-mono)",
                                fontSize: "10px",
                                color: "var(--fg-subtle)",
                                marginTop: "3px",
                                letterSpacing: "0.04em",
                              }}
                            >
                              {getPostSource(p.subreddit).label} · {p.score} pts ·{" "}
                              {formatTimeAgo(p.created_utc)}
                              {(p.mentions_in_thread ?? 1) > 1
                                ? ` · ${p.mentions_in_thread}×`
                                : ""}
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: "12px 14px",
                        borderTop: "1px solid var(--border)",
                        fontFamily: "var(--font-serif)",
                        fontStyle: "italic",
                        fontSize: "13px",
                        color: "var(--fg-muted)",
                        textAlign: "center",
                      }}
                    >
                      No mentions yet
                    </div>
                  )}

                  {/* Upcoming events at this venue */}
                  {r.category !== "event" &&
                    (venueEvents.get(r.id)?.length ?? 0) > 0 && (
                      <div
                        style={{
                          padding: "4px 14px 8px",
                          borderTop: "1px solid var(--border)",
                        }}
                      >
                        <div
                          style={{
                            fontFamily: "var(--font-sans)",
                            fontSize: "10px",
                            fontWeight: 600,
                            letterSpacing: "0.14em",
                            textTransform: "uppercase",
                            color: "var(--brand)",
                            padding: "8px 0 6px",
                          }}
                        >
                          Upcoming ({venueEvents.get(r.id)!.length})
                        </div>
                        {venueEvents.get(r.id)!.slice(0, 4).map((ev) => (
                          <div
                            key={ev.id}
                            style={{
                              display: "flex",
                              alignItems: "baseline",
                              gap: "10px",
                              padding: "6px 0",
                              borderTop: "1px solid var(--border)",
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  fontFamily: "var(--font-serif)",
                                  fontSize: "13px",
                                  color: "var(--fg)",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {ev.name}
                              </div>
                              <div
                                style={{
                                  fontFamily: "var(--font-mono)",
                                  fontSize: "10px",
                                  color: "var(--fg-subtle)",
                                  marginTop: "2px",
                                  letterSpacing: "0.04em",
                                }}
                              >
                                {ev.metadata?.event_date
                                  ? new Date(
                                      ev.metadata.event_date
                                    ).toLocaleDateString("en-CA", {
                                      weekday: "short",
                                      month: "short",
                                      day: "numeric",
                                    })
                                  : ""}
                                {ev.metadata?.genre ? ` · ${ev.metadata.genre}` : ""}
                              </div>
                            </div>
                            {ev.metadata?.ticket_url && (
                              <a
                                href={ev.metadata.ticket_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  flexShrink: 0,
                                  fontFamily: "var(--font-sans)",
                                  fontSize: "10px",
                                  fontWeight: 600,
                                  letterSpacing: "0.12em",
                                  textTransform: "uppercase",
                                  color: "var(--brand)",
                                  textDecoration: "underline",
                                  textUnderlineOffset: "3px",
                                }}
                              >
                                Tickets →
                              </a>
                            )}
                          </div>
                        ))}
                        {(venueEvents.get(r.id)?.length ?? 0) > 4 && (
                          <div
                            style={{
                              fontFamily: "var(--font-mono)",
                              fontSize: "10px",
                              color: "var(--fg-subtle)",
                              paddingTop: "4px",
                              letterSpacing: "0.04em",
                            }}
                          >
                            + {(venueEvents.get(r.id)?.length ?? 0) - 4} more
                          </div>
                        )}
                      </div>
                    )}

                  {/* Hairline footer: actions */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderTop: "1px solid var(--fg)",
                      fontFamily: "var(--font-sans)",
                      fontSize: "11px",
                      fontWeight: 600,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                    }}
                  >
                    {r.category === "event" && r.metadata?.ticket_url ? (
                      <a
                        href={r.metadata.ticket_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: "var(--fg-muted)",
                          textDecoration: "underline",
                          textUnderlineOffset: "4px",
                        }}
                      >
                        Tickets →
                      </a>
                    ) : (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: "var(--fg-muted)",
                          textDecoration: "underline",
                          textUnderlineOffset: "4px",
                        }}
                      >
                        Directions →
                      </a>
                    )}
                    <a
                      href={`/place/${encodeURIComponent(r.name)}`}
                      style={{
                        color: "var(--brand)",
                        textDecoration: "underline",
                        textUnderlineOffset: "4px",
                      }}
                    >
                      Read →
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
});
