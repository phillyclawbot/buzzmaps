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
import { Crosshair } from "lucide-react";
import type { Place, PlaceCategory } from "@/lib/types";
import {
  CATEGORY_COLORS,
  CATEGORY_COLORS_DARK,
  SENTIMENT_COLORS,
} from "@/lib/constants";
import { decodeHtmlEntities, getPostHref, getPostSource } from "@/lib/post-source";
import { formatTimeAgo } from "@/lib/utils";
import { getNeighbourhood } from "@/lib/neighbourhoods";

// ─────────────────────────────────────────────────────────
// Tile provider: CARTO Positron — minimal light basemap.
// Free for non-commercial / fair use; attributed below.
// Site is light-only, so only one tile layer.
// ─────────────────────────────────────────────────────────

const TILE_URL =
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://carto.com/attributions">CARTO</a>';

// ─────────────────────────────────────────────────────────
// Pin design: gradient teardrop + white inner disk + category
// glyph. Top-mentioned places with a photo get photo-bubble
// pins (Airbnb-style). Fresh-within-24h places get a pulse.
// ─────────────────────────────────────────────────────────

const CATEGORY_GLYPH_PATHS: Record<string, string> = {
  restaurant:
    '<path d="M8 6v6a2 2 0 0 0 2 2v4M8 6v4M10 6v4M12 6v4M16 6c-1 1-2 2.6-2 4.5S15 14 16 14v4" stroke="CLR" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  bar: '<path d="M5 6h14l-7 7-7-7zM12 13v5M9 18h6" stroke="CLR" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  cafe: '<path d="M8 3c0 1 1 1.5 1 2.5S8 7 8 8M12 3c0 1 1 1.5 1 2.5S12 7 12 8M16 3c0 1 1 1.5 1 2.5s-1 1.5-1 2.5M5 10h11v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4v-5zM16 12h2a2.5 2.5 0 0 1 0 5h-2" stroke="CLR" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  club: '<circle cx="12" cy="12" r="5.5" stroke="CLR" stroke-width="1.8" fill="none"/><path d="M6.5 12h11M12 6.5v11M8 8l8 8M16 8l-8 8" stroke="CLR" stroke-width="1.6" stroke-linecap="round" fill="none"/>',
  shop: '<path d="M5 8h14l-1 11a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1L5 8zM9 8V6a3 3 0 0 1 6 0v2" stroke="CLR" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  park: '<path d="M12 3l4 5h-2.5L16 11h-2.5L16 14H8l2.5-3H8l2.5-3H8l4-5zM12 14v6M9 20h6" stroke="CLR" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  gym: '<path d="M3 10v4M21 10v4" stroke="CLR" stroke-width="1.9" stroke-linecap="round" fill="none"/><rect x="5" y="8" width="3" height="8" rx="0.8" stroke="CLR" stroke-width="1.9" fill="none"/><rect x="16" y="8" width="3" height="8" rx="0.8" stroke="CLR" stroke-width="1.9" fill="none"/><path d="M8 12h8" stroke="CLR" stroke-width="1.9" stroke-linecap="round" fill="none"/>',
  venue: '<path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V9zM14 7v2M14 13v2" stroke="CLR" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  market:
    '<path d="M4 8h16v3H4zM8 8v3M12 8v3M16 8v3M6 11v8M18 11v8M6 15h12" stroke="CLR" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  museum:
    '<path d="M3 10 12 4l9 6M4 10v10M20 10v10M3 20h18M8 14v4M12 14v4M16 14v4" stroke="CLR" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  event:
    '<rect x="4" y="6" width="16" height="14" rx="2" stroke="CLR" stroke-width="1.8" fill="none"/><path d="M4 10h16M8 4v4M16 4v4" stroke="CLR" stroke-width="1.8" stroke-linecap="round" fill="none"/>',
  landmark:
    '<path d="M12 3v3M10 6h4v3h-4zM11 9h2v11h-2zM8 20h8M9 12h6" stroke="CLR" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  attraction:
    '<circle cx="12" cy="11" r="7" stroke="CLR" stroke-width="1.8" fill="none"/><circle cx="12" cy="11" r="1.2" fill="CLR"/><path d="M12 4v14M5 11h14M7 16l10-10M17 16L7 6" stroke="CLR" stroke-width="1.6" stroke-linecap="round" fill="none"/>',
  other:
    '<circle cx="12" cy="12" r="8" stroke="CLR" stroke-width="1.8" fill="none"/><path d="m14.8 9.2-1.8 4.8-4.8 1.8 1.8-4.8 4.8-1.8z" stroke="CLR" stroke-width="1.6" stroke-linejoin="round" fill="none"/>',
};

function glyphSvg(category: string, color: string, size: number) {
  const key = (category in CATEGORY_GLYPH_PATHS ? category : "other") as string;
  const body = CATEGORY_GLYPH_PATHS[key].split("CLR").join(color);
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}

function createPinIcon(
  category: PlaceCategory,
  mentionCount: number,
  isRecent: boolean,
  photoUrl?: string | null
) {
  const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.other;
  const colorDark = CATEGORY_COLORS_DARK[category] || CATEGORY_COLORS_DARK.other;
  const showPulse = isRecent;

  // Photo bubble threshold: top-mentioned places with a photo
  const usePhoto = !!photoUrl && mentionCount >= 6;

  if (usePhoto) {
    const S = 44;
    const hit = S + 6;
    const pulse = showPulse
      ? `<span style="position:absolute;inset:-6px;border-radius:50%;border:2px solid ${color};opacity:0;animation:pinPulse 2s ease-out infinite;pointer-events:none;"></span>`
      : "";
    return L.divIcon({
      html: `
        <span class="pin-drop" style="position:relative;display:block;width:${hit}px;height:${hit}px;">
          ${pulse}
          <span style="position:absolute;inset:3px;border-radius:9999px;padding:2px;background:${color};box-shadow:0 6px 14px rgba(15,20,25,.22),0 2px 4px rgba(15,20,25,.14);">
            <span style="display:block;width:100%;height:100%;border-radius:9999px;background:#fff;padding:2px;">
              <img src="${photoUrl}" alt="" width="${S - 8}" height="${S - 8}" style="width:100%;height:100%;object-fit:cover;border-radius:9999px;display:block;" />
            </span>
          </span>
          <span style="position:absolute;bottom:-1px;left:50%;transform:translateX(-50%) rotate(45deg);width:10px;height:10px;background:${color};border-radius:1px;box-shadow:0 2px 3px rgba(15,20,25,.15);z-index:-1;"></span>
        </span>
      `,
      className: "",
      iconSize: [hit, hit],
      iconAnchor: [hit / 2, hit / 2 + 4],
      popupAnchor: [0, -S / 2 - 2],
    });
  }

  // Teardrop pin — size scales gently with mentions
  const scale = Math.min(1.3, Math.max(0.85, 0.85 + Math.sqrt(mentionCount) * 0.1));
  const W = Math.round(36 * scale);
  const H = Math.round(44 * scale);
  const glyph = glyphSvg(category, color, Math.round(14 * scale));
  const gradId = `g-${category}-${Math.round(W)}`;

  const pulse = showPulse
    ? `<span style="position:absolute;left:${W / 2 - 14}px;top:${W / 2 - 14}px;width:28px;height:28px;border-radius:50%;border:2px solid ${color};opacity:0;animation:pinPulse 2s ease-out infinite;pointer-events:none;"></span>`
    : "";

  return L.divIcon({
    html: `
      <span class="pin-drop" style="position:relative;display:block;width:${W}px;height:${H}px;filter:drop-shadow(0 6px 10px rgba(15,20,25,0.25));">
        ${pulse}
        <svg width="${W}" height="${H}" viewBox="0 0 40 48" xmlns="http://www.w3.org/2000/svg" style="display:block;">
          <defs>
            <linearGradient id="${gradId}" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="${color}" />
              <stop offset="100%" stop-color="${colorDark}" />
            </linearGradient>
          </defs>
          <path d="M20 1.5C10.6 1.5 3 9 3 18.3c0 11.8 12.5 24.2 15.8 27.2a1.8 1.8 0 0 0 2.4 0C24.5 42.5 37 30.1 37 18.3 37 9 29.4 1.5 20 1.5z" fill="url(#${gradId})" stroke="#ffffff" stroke-width="1.6"/>
          <circle cx="20" cy="18" r="9" fill="#ffffff"/>
        </svg>
        <span style="position:absolute;top:${Math.round((H * 18) / 48) - Math.round((14 * scale) / 2)}px;left:${W / 2 - Math.round((14 * scale) / 2)}px;display:flex;align-items:center;justify-content:center;">${glyph}</span>
      </span>
    `,
    className: "",
    iconSize: [W, H],
    iconAnchor: [W / 2, H - 2],
    popupAnchor: [0, -H + 6],
  });
}

// ─────────────────────────────────────────────────────────
// Cluster icon: brand-gradient bubble with count, with the
// neighbourhood name as a chip tucked underneath.
// ─────────────────────────────────────────────────────────

function makeClusterIconFactory(neighbourhood: string) {
  return function createClusterIcon(cluster: { getChildCount: () => number }) {
    const count = cluster.getChildCount();
    const size = Math.max(40, Math.min(64, 34 + Math.sqrt(count) * 3.2));
    const S = Math.round(size);
    const fontSize = count >= 1000 ? 14 : count >= 100 ? 15 : 17;
    const labelH = neighbourhood ? 22 : 0;

    const label = neighbourhood
      ? `<span style="
          position:absolute;top:${S + 4}px;left:50%;transform:translateX(-50%);
          white-space:nowrap;max-width:160px;overflow:hidden;text-overflow:ellipsis;
          background:#ffffff;color:#0f1419;
          font-family:var(--font-space-grotesk), var(--font-geist-sans), system-ui, sans-serif;
          font-weight:600;font-size:10.5px;letter-spacing:0.02em;
          padding:3px 9px;border-radius:9999px;
          border:1px solid #e8e6df;
          box-shadow:0 2px 6px rgba(15,20,25,.08);
          pointer-events:none;line-height:1.2;
        ">${neighbourhood}</span>`
      : "";

    return L.divIcon({
      html: `
        <span style="position:relative;display:block;width:${S}px;height:${S + labelH}px;">
          <span style="
            display:flex;align-items:center;justify-content:center;
            width:${S}px;height:${S}px;
            border-radius:50%;
            background:linear-gradient(135deg,#ff5b3a,#ff8a3d);
            box-shadow:0 8px 20px rgba(255,91,58,.38),0 2px 6px rgba(15,20,25,.15);
            color:#ffffff;
            font-family: var(--font-space-grotesk), var(--font-geist-sans), system-ui, sans-serif;
            font-weight:700;
            font-size:${fontSize}px;
            letter-spacing:-0.01em;
            line-height:1;
            border:3px solid #ffffff;
          ">${count}</span>
          ${label}
        </span>
      `,
      className: "",
      iconSize: [S, S + labelH],
      iconAnchor: [S / 2, S / 2],
    });
  };
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

  // Group places by neighbourhood so clustering can't cross boundaries.
  // Places outside any known neighbourhood fall into the "" bucket and
  // get no label under the cluster.
  const placesByHood = useMemo(() => {
    const groups = new Map<string, typeof dedupedPlaces>();
    for (const p of dedupedPlaces) {
      const hood = getNeighbourhood(p.lat, p.lng) ?? "";
      const bucket = groups.get(hood);
      if (bucket) bucket.push(p);
      else groups.set(hood, [p]);
    }
    return Array.from(groups.entries());
  }, [dedupedPlaces]);

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
          html: `<span style="width:22px;height:22px;position:relative;display:block;">
            <span style="position:absolute;inset:0;border-radius:50%;background:#0066ff;opacity:0.25;animation:nearMePulse 1.6s ease-out infinite;"></span>
            <span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:14px;height:14px;border-radius:50%;background:#0066ff;border:3px solid #fff;box-shadow:0 4px 10px rgba(0,102,255,0.4);"></span>
          </span>`,
          className: "",
          iconSize: [22, 22],
          iconAnchor: [11, 11],
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
            width: 52,
            height: 52,
            borderRadius: 9999,
            background: nearMeActive
              ? "var(--brand-gradient)"
              : "var(--bg-elevated)",
            border: nearMeActive ? "none" : "1px solid var(--border)",
            cursor: "pointer",
            boxShadow: nearMeActive
              ? "var(--glow-brand), var(--shadow-md)"
              : "var(--shadow-md)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: nearMeActive ? "#fff" : "var(--fg)",
            transition:
              "transform 160ms cubic-bezier(.34,1.56,.64,1), box-shadow 200ms ease",
          }}
          aria-label={nearMeActive ? "Clear near me" : "Find places near me"}
          aria-pressed={nearMeActive}
        >
          <Crosshair size={20} strokeWidth={2.2} />
        </button>
      </div>

      <MapContainer
        center={[43.6532, -79.3832]}
        zoom={13}
        className="h-full w-full"
        zoomControl={false}
        ref={mapRef}
      >
        <TileLayer
          attribution={TILE_ATTR}
          url={TILE_URL}
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
              color: "#0066ff",
              fillColor: "#0066ff",
              fillOpacity: 0.08,
              weight: 1.5,
              dashArray: "4 4",
            }}
          />
        )}

        {placesByHood.map(([hood, hoodPlaces]) => (
        <MarkerClusterGroup
          key={`hood-${hood || "unknown"}`}
          chunkedLoading
          iconCreateFunction={makeClusterIconFactory(hood)}
          showCoverageOnHover={false}
          spiderfyOnMaxZoom
          maxClusterRadius={60}
          disableClusteringAtZoom={17}
        >
          {hoodPlaces.map((r) => {
            const category = r.category || "other";
            const mentionCount = Number(r.mention_count);
            const isRecent = Date.now() / 1000 - r.latest_mention < 86400;

            return (
              <Marker
                key={r.id}
                position={[r.lat, r.lng]}
                icon={createPinIcon(category, mentionCount, isRecent, r.photo_url)}
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

                  {/* Footer: action pills */}
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      padding: "10px 14px",
                      borderTop: "1px solid var(--border)",
                      background: "var(--bg-sunken)",
                    }}
                  >
                    {r.category === "event" && r.metadata?.ticket_url ? (
                      <a
                        href={r.metadata.ticket_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          flex: 1,
                          textAlign: "center",
                          padding: "8px 14px",
                          borderRadius: 9999,
                          background: "var(--bg-elevated)",
                          border: "1px solid var(--border)",
                          color: "var(--fg)",
                          fontFamily:
                            "var(--font-space-grotesk), var(--font-geist-sans), sans-serif",
                          fontWeight: 600,
                          fontSize: 12,
                          textDecoration: "none",
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
                          flex: 1,
                          textAlign: "center",
                          padding: "8px 14px",
                          borderRadius: 9999,
                          background: "var(--bg-elevated)",
                          border: "1px solid var(--border)",
                          color: "var(--fg)",
                          fontFamily:
                            "var(--font-space-grotesk), var(--font-geist-sans), sans-serif",
                          fontWeight: 600,
                          fontSize: 12,
                          textDecoration: "none",
                        }}
                      >
                        Directions
                      </a>
                    )}
                    <a
                      href={`/place/${encodeURIComponent(r.name)}`}
                      style={{
                        flex: 1,
                        textAlign: "center",
                        padding: "8px 14px",
                        borderRadius: 9999,
                        background:
                          "linear-gradient(135deg, #ff5b3a, #ff8a3d)",
                        color: "#fff",
                        fontFamily:
                          "var(--font-space-grotesk), var(--font-geist-sans), sans-serif",
                        fontWeight: 600,
                        fontSize: 12,
                        textDecoration: "none",
                        boxShadow: "0 4px 12px rgba(255,91,58,0.35)",
                      }}
                    >
                      See details
                    </a>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
        </MarkerClusterGroup>
        ))}
      </MapContainer>
    </div>
  );
});
