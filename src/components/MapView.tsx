"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Circle,
  GeoJSON,
  useMap,
  useMapEvents,
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import type { Place, PlaceCategory } from "@/lib/types";
import { CATEGORY_EMOJI } from "@/lib/types";
import { CATEGORY_COLORS, SENTIMENT_COLORS, isPublication } from "@/lib/constants";
import { formatTimeAgo } from "@/lib/utils";
import { NEIGHBOURHOODS, NEIGHBOURHOOD_GEOJSON_MAP, getNeighbourhood, computeFeatureCentroid } from "@/lib/neighbourhoods";

const HOOD_PALETTE = [
  "#ff6b35", "#7c3aed", "#0891b2", "#16a34a", "#db2777",
  "#b45309", "#6366f1", "#0d9488", "#ca8a04", "#dc2626",
  "#4f46e5", "#059669",
];

function getHoodColor(index: number): string {
  return HOOD_PALETTE[index % HOOD_PALETTE.length];
}


// Pin colors per category — distinct, vibrant palette
const PIN_COLORS: Record<PlaceCategory, string> = {
  restaurant: "#E05D36",
  bar: "#8B5CF6",
  cafe: "#D97706",
  club: "#EC4899",
  shop: "#06b6d4",
  park: "#22c55e",
  gym: "#ef4444",
  venue: "#3B82F6",
  market: "#10b981",
  museum: "#6366f1",
  event: "#d946ef",
  landmark: "#78716c",
  attraction: "#f97316",
  other: "#64748b",
};

// Simple stroke icons for popup display (24x24 viewBox)
const POPUP_ICON_PATH: Record<string, string> = {
  restaurant: 'M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3v7',
  bar:        'M8 2h8l-3 7a3 3 0 01-2 0L8 2zm4 7v13m-3 0h6',
  cafe:       'M17 8h1a4 4 0 010 8h-1M3 8h14v9a4 4 0 01-4 4H7a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3',
  club:       'M9 18V5l12-2v13M6 15a3 3 0 100 6 3 3 0 000-6zM18 13a3 3 0 100 6 3 3 0 000-6z',
  shop:       'M6 2L3 7v13a2 2 0 002 2h14a2 2 0 002-2V7l-3-5H6zM3 7h18M16 11a4 4 0 01-8 0',
  park:       'M12 22V8M5 12l7-10 7 10H5zM7 17l5-7 5 7H7z',
  gym:        'M6 5v14M18 5v14M6 12h12M2 8v8M22 8v8',
  venue:      'M2 20h20M4 20V10M20 20V10M12 4L2 10h20L12 4zM8 14v4M12 14v4M16 14v4',
  market:     'M9 21a1 1 0 100 2 1 1 0 000-2zM20 21a1 1 0 100 2 1 1 0 000-2zM1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6',
  museum:     'M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6',
  event:      'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z',
  landmark:   'M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6',
  attraction: 'M12 2a10 10 0 110 20 10 10 0 010-20zm0 4a6 6 0 110 12 6 6 0 010-12zm0 4a2 2 0 110 4 2 2 0 010-4z',
  other:      'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0zM12 7a3 3 0 100 6 3 3 0 000-6z',
};

function createPinIcon(category: PlaceCategory, mentionCount: number, isRecent: boolean) {
  const color = PIN_COLORS[category] || PIN_COLORS.other;
  const showPulse = isRecent && mentionCount >= 2;

  // Size scales with mentions: base 22, max 34
  const dotSize = Math.min(34, Math.max(22, 18 + Math.sqrt(mentionCount) * 4));
  const CSS_W = Math.ceil(dotSize);
  const CSS_H = Math.ceil(dotSize);
  const r = dotSize / 2;

  const pulseRing = showPulse ? `
    <div style="position:absolute;top:-4px;left:-4px;width:${CSS_W + 8}px;height:${CSS_H + 8}px;border-radius:50%;border:2px solid ${color};opacity:0;animation:pinPulse 2s ease-out infinite;pointer-events:none;"></div>
    <div style="position:absolute;top:-4px;left:-4px;width:${CSS_W + 8}px;height:${CSS_H + 8}px;border-radius:50%;border:2px solid ${color};opacity:0;animation:pinPulse 2s ease-out 1s infinite;pointer-events:none;"></div>
  ` : '';

  // Clean circle dot with white border
  const svgPin = `
    <svg width="${CSS_W}" height="${CSS_H}" viewBox="0 0 ${CSS_W} ${CSS_H}" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 1px 3px rgba(0,0,0,0.3));">
      <circle cx="${r}" cy="${r}" r="${r}" fill="${color}"/>
      <circle cx="${r}" cy="${r}" r="${r - 1.5}" fill="${color}" stroke="white" stroke-width="2.5"/>
    </svg>`;

  return L.divIcon({
    html: `<div style="position:relative;width:${CSS_W}px;height:${CSS_H}px;transition:transform 0.15s ease;">${pulseRing}${svgPin}</div>`,
    className: '',
    iconSize: [CSS_W, CSS_H],
    iconAnchor: [CSS_W / 2, CSS_H / 2],
    popupAnchor: [0, -CSS_H / 2],
  });
}

function createClusterIcon(cluster: { getChildCount: () => number; getAllChildMarkers: () => L.Marker[] }) {
  const count = cluster.getChildCount();
  const size = Math.max(32, Math.min(50, 32 + Math.floor(count / 10) * 2));

  // Determine dominant category color from child markers
  const markers = cluster.getAllChildMarkers();
  const catCounts: Record<string, number> = {};
  for (const m of markers) {
    const cat = (m.options as { category?: string }).category;
    if (cat) catCounts[cat] = (catCounts[cat] || 0) + 1;
  }
  // Find dominant category, fallback to brand orange
  let dominantColor = "#E05D36";
  let maxCount = 0;
  for (const [cat, c] of Object.entries(catCounts)) {
    if (c > maxCount) { maxCount = c; dominantColor = PIN_COLORS[cat as PlaceCategory] || "#E05D36"; }
  }

  return L.divIcon({
    html: `<div style="
        width:${size}px;height:${size}px;min-width:32px;
        border-radius:50%;background:white;
        border:2.5px solid ${dominantColor};
        box-shadow:0 2px 8px rgba(0,0,0,0.15);
        display:flex;align-items:center;justify-content:center;
        font-size:${count >= 100 ? 11 : 13}px;font-weight:700;
        color:${dominantColor};font-family:system-ui,-apple-system,sans-serif;
      ">${count}</div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}


function InitialLocationHandler() {
  const map = useMap();
  const hasRun = useRef(false);
  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    // Force zoom to street level immediately
    map.setZoom(13);

    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        map.flyTo([pos.coords.latitude, pos.coords.longitude], 13, { duration: 1 });
      },
      () => { /* denied — stay on default */ },
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



export default function MapView({
  places,
  flyTo,
  onNearMeToggle,
  nearMeActive = false,
  nearMeRadius = 2,
  onRadiusChange,
  nearMeCount,
}: {
  places: Place[];
  flyTo: [number, number] | null;
  onNearMeToggle?: (coords: { lat: number; lng: number } | null) => void;
  nearMeActive?: boolean;
  nearMeRadius?: number;
  onRadiusChange?: (km: number) => void;
  nearMeCount?: number;
}) {
  const mapRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [zoom, setZoom] = useState(13);

  // Determine which neighbourhoods have places and assign colours
  const activeHoods = useMemo(() => {
    const hoodCounts: Record<string, number> = {};
    for (const r of places) {
      const hood = getNeighbourhood(r.lat, r.lng);
      if (hood) hoodCounts[hood] = (hoodCounts[hood] || 0) + 1;
    }
    return NEIGHBOURHOODS
      .map((n, i) => ({ ...n, count: hoodCounts[n.name] || 0, color: getHoodColor(i) }))
      .filter((n) => n.count > 0);
  }, [places]);

  // All neighbourhoods with colours (for labels on all areas)
  const allHoods = useMemo(() => {
    const hoodCounts: Record<string, number> = {};
    for (const r of places) {
      const hood = getNeighbourhood(r.lat, r.lng);
      if (hood) hoodCounts[hood] = (hoodCounts[hood] || 0) + 1;
    }
    return NEIGHBOURHOODS.map((n, i) => ({
      ...n, count: hoodCounts[n.name] || 0, color: getHoodColor(i),
    }));
  }, [places]);

  // Load GeoJSON polygon data for neighbourhood boundaries
  const [geoData, setGeoData] = useState<GeoJSON.FeatureCollection | null>(null);
  useEffect(() => {
    fetch("/data/toronto-neighbourhoods.geojson")
      .then((res) => res.json())
      .then((data) => setGeoData(data))
      .catch(() => {});
  }, []);

  // Build a colour map: official AREA_NAME -> colour (active) or null (inactive)
  const areaColorMap = useMemo(() => {
    const map: Record<string, string | null> = {};
    // Mark all GeoJSON features as inactive first
    if (geoData) {
      for (const f of geoData.features) {
        map[(f.properties as { AREA_NAME: string }).AREA_NAME] = null;
      }
    }
    // Overlay active hoods with their palette colours
    for (const hood of activeHoods) {
      const officialNames = NEIGHBOURHOOD_GEOJSON_MAP[hood.name] || [];
      for (const name of officialNames) {
        map[name] = hood.color;
      }
    }
    return map;
  }, [activeHoods, geoData]);

  // Key to force GeoJSON re-render when active hoods or data change
  const geoKey = useMemo(
    () => (geoData ? "all:" : "none:") + activeHoods.map((h) => h.name).join(","),
    [activeHoods, geoData]
  );

  // Compute polygon centroids for each neighbourhood from GeoJSON data
  const hoodCentroids = useMemo(() => {
    if (!geoData) return {} as Record<string, [number, number]>;
    const featureByArea: Record<string, GeoJSON.Feature[]> = {};
    for (const f of geoData.features) {
      const name = (f.properties as { AREA_NAME: string }).AREA_NAME;
      (featureByArea[name] ||= []).push(f);
    }
    const centroids: Record<string, [number, number]> = {};
    for (const hood of NEIGHBOURHOODS) {
      const areaNames = NEIGHBOURHOOD_GEOJSON_MAP[hood.name] || [];
      const features = areaNames.flatMap((n) => featureByArea[n] || []);
      if (features.length === 0) continue;
      let totalLat = 0, totalLng = 0, count = 0;
      for (const f of features) {
        const [lat, lng] = computeFeatureCentroid(f);
        totalLat += lat;
        totalLng += lng;
        count++;
      }
      centroids[hood.name] = [totalLat / count, totalLng / count];
    }
    return centroids;
  }, [geoData]);

  // Merge overlapping labels (nearby centroids) and filter by zoom
  const labelData = useMemo(() => {
    // Distance threshold in degrees (~500m) for merging nearby labels
    const MERGE_THRESHOLD = 0.005;
    const items: { name: string; position: [number, number]; count: number }[] = [];
    for (const n of allHoods) {
      const centroid = hoodCentroids[n.name];
      if (!centroid) continue;
      items.push({ name: n.name, position: centroid, count: n.count });
    }
    // Greedy merge: for each item, attach to nearest existing group within threshold
    const groups: { names: string[]; position: [number, number]; counts: number[] }[] = [];
    for (const item of items) {
      let merged = false;
      for (const g of groups) {
        const dLat = Math.abs(g.position[0] - item.position[0]);
        const dLng = Math.abs(g.position[1] - item.position[1]);
        if (dLat < MERGE_THRESHOLD && dLng < MERGE_THRESHOLD) {
          g.names.push(item.name);
          g.counts.push(item.count);
          merged = true;
          break;
        }
      }
      if (!merged) {
        groups.push({ names: [item.name], position: item.position, counts: [item.count] });
      }
    }
    const labels: { text: string; position: [number, number]; isActive: boolean; maxCount: number }[] = [];
    for (const g of groups) {
      const maxCount = Math.max(...g.counts);
      const isActive = maxCount > 0;
      // Show the highest-count name as primary label
      const sorted = g.names
        .map((n, i) => ({ n, c: g.counts[i] }))
        .sort((a, b) => b.c - a.c);
      const text = sorted.length === 1
        ? sorted[0].n
        : sorted.length === 2
          ? `${sorted[0].n} / ${sorted[1].n}`
          : `${sorted[0].n} +${sorted.length - 1}`;
      labels.push({ text, position: g.position, isActive, maxCount });
    }
    // Filter by zoom level — only show labels when zoomed in enough
    return labels.filter((l) => {
      if (zoom < 14) return false; // hide all labels when zoomed out
      if (zoom < 15) return l.isActive && l.maxCount >= 3;
      return true;
    });
  }, [allHoods, hoodCentroids, zoom]);

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
    {/* Near Me FAB + radius panel */}
    <div style={{ position: "absolute", bottom: "120px", right: "16px", zIndex: 500, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
      {nearMeActive && (
        <div style={{
          background: "white",
          border: "1px solid #e2e8f0",
          borderRadius: "14px",
          padding: "10px 12px",
          boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
          minWidth: "180px",
        }}>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "#334155", marginBottom: "6px" }}>
            {nearMeCount ?? 0} place{nearMeCount !== 1 ? "s" : ""} within {nearMeRadius < 1 ? Math.round(nearMeRadius * 1000) + "m" : nearMeRadius + "km"}
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
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          background: nearMeActive ? "#3b82f6" : "white",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        aria-label="Near Me"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={nearMeActive ? "white" : "#334155"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/>
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
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <InitialLocationHandler />
      <FlyToHandler target={flyTo} />
      <ZoomTracker onZoom={setZoom} />
      {/* Near Me radius circle */}
      {nearMeActive && userCoords && (
        <Circle
          center={[userCoords.lat, userCoords.lng]}
          radius={nearMeRadius * 1000}
          pathOptions={{ color: "#3b82f6", fillColor: "#3b82f6", fillOpacity: 0.08, weight: 2, dashArray: "6 4" }}
        />
      )}
      {/* Neighbourhood polygon overlays — all 158 polygons, active ones coloured */}
      {geoData && (
        <GeoJSON
          key={geoKey}
          data={geoData}
          style={(feature) => {
            const name = feature?.properties?.AREA_NAME as string;
            const color = areaColorMap[name];
            if (color) {
              return { color, fillColor: color, fillOpacity: 0.03, weight: 1, opacity: 0.3 };
            }
            return { color: "#94a3b8", fillColor: "#e2e8f0", fillOpacity: 0.02, weight: 0.8, opacity: 0.2 };
          }}
          interactive={false}
        />
      )}
      {/* Neighbourhood name labels — deduplicated and zoom-filtered */}
      {labelData.map((label) => (
        <Marker
          key={`label-${label.text}`}
          position={label.position}
          interactive={false}
          icon={L.divIcon({
            html: `<div style="
              white-space:nowrap;font-size:${label.isActive ? 11 : 10}px;font-weight:${label.isActive ? 700 : 600};
              color:${label.isActive ? "#1e293b" : "#94a3b8"};
              text-shadow:0 0 4px white, 0 0 4px white, 0 0 8px white, 0 0 8px white;
              pointer-events:none;text-align:center;
              opacity:${label.isActive ? 0.85 : 0.45};letter-spacing:0.3px;
            ">${label.text}</div>`,
            className: "",
            iconSize: [160, 20],
            iconAnchor: [80, 10],
          })}
        />
      ))}
      <MarkerClusterGroup
          chunkedLoading
          maxClusterRadius={60}
          spiderfyOnMaxZoom
          showCoverageOnHover={false}
          iconCreateFunction={createClusterIcon}
          disableClusteringAtZoom={16}
          animate
        >
        {dedupedPlaces.map((r) => {
          const category = r.category || "other";
          const mentionCount = Number(r.mention_count);
          const isRecent = Date.now() / 1000 - r.latest_mention < 86400;
          const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.other;

          return (
            <Marker
              key={r.id}
              position={[r.lat, r.lng]}
              icon={createPinIcon(category, mentionCount, isRecent)}
            >
              <Popup maxWidth={320} minWidth={250}>
                <div style={{ fontFamily: "inherit", lineHeight: 1.4 }}>
                  {/* Header with photo */}
                  <div style={{
                    borderRadius: "10px 10px 0 0",
                    margin: "-4px -4px 0",
                    overflow: "hidden",
                  }}>
                    {r.photo_url && (
                      <a href={`/place/${encodeURIComponent(r.name)}`} style={{ display: "block", position: "relative" }}>
                        <img
                          src={r.photo_url}
                          alt={r.name}
                          style={{ width: "100%", height: "110px", objectFit: "cover", display: "block" }}
                        />
                        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "32px", background: "linear-gradient(to top, rgba(255,255,255,0.9), transparent)" }} />
                      </a>
                    )}
                  </div>

                  {/* Title + stats */}
                  <div style={{ padding: "10px 10px 0" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "8px", marginBottom: "6px" }}>
                      <div style={{
                        width: "28px", height: "28px", borderRadius: "8px", flexShrink: 0,
                        background: `${color}12`, border: `1.5px solid ${color}30`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d={POPUP_ICON_PATH[category] || POPUP_ICON_PATH.other} />
                        </svg>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "14px", fontWeight: 700, color: "#1e293b", lineHeight: 1.2 }}>
                          {r.name}
                        </div>
                        {r.cuisine_type && (
                          <div style={{ fontSize: "11px", color: "#94a3b8", marginTop: "2px" }}>{r.cuisine_type}</div>
                        )}
                      </div>
                      {isRecent && mentionCount >= 2 && (
                        <span style={{
                          fontSize: "9px", fontWeight: 700, background: color, color: "white",
                          padding: "2px 7px", borderRadius: "999px", whiteSpace: "nowrap", flexShrink: 0,
                        }}>Trending</span>
                      )}
                    </div>

                    {/* Stats chips */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "10px" }}>
                      {r.google_rating && (
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: "3px",
                          fontSize: "11px", fontWeight: 600, color: "#374151",
                          background: "#fef9c3", padding: "2px 8px", borderRadius: "6px",
                        }}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="#f59e0b"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                          {r.google_rating.toFixed(1)}
                        </span>
                      )}
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: "3px",
                        background: `${color}10`, color, fontWeight: 600, fontSize: "11px",
                        padding: "2px 8px", borderRadius: "6px",
                      }}>
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                        {r.mention_count} mention{Number(r.mention_count) !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>

                  {/* Mentions list */}
                  {r.posts?.length ? (
                    <div style={{ maxHeight: "130px", overflowY: "auto", padding: "0 10px", marginBottom: "8px" }}>
                      <div style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "5px", borderTop: "1px solid #f1f5f9", paddingTop: "8px" }}>
                        Mentions
                      </div>
                      {r.posts.map((p: { id: number; title: string; subreddit: string; score: number; sentiment: string; created_utc: number; permalink: string; mentions_in_thread?: number }) => (
                        <a
                          key={p.id}
                          href={isPublication(p.subreddit) ? p.permalink : `https://reddit.com${p.permalink}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: "flex", alignItems: "flex-start", gap: "6px", padding: "5px 4px", textDecoration: "none", borderRadius: "6px", marginBottom: "2px" }}
                        >
                          <span style={{
                            display: "inline-block", width: "7px", height: "7px", borderRadius: "50%",
                            marginTop: "4px", flexShrink: 0,
                            background: SENTIMENT_COLORS[p.sentiment] || SENTIMENT_COLORS.neutral,
                          }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: "11px", color: "#334155", lineHeight: 1.35, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 500 }}>
                              {p.title}
                            </div>
                            <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "2px" }}>
                              {isPublication(p.subreddit) ? p.subreddit : `r/${p.subreddit}`} · {p.score} pts · {formatTimeAgo(p.created_utc)}
                              {(p.mentions_in_thread ?? 1) > 1 ? ` · ${p.mentions_in_thread}x` : ""}
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: "11px", color: "#94a3b8", textAlign: "center", padding: "10px", borderTop: "1px solid #f1f5f9", margin: "0 10px 8px" }}>
                      No mentions yet
                    </div>
                  )}

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: "6px", padding: "0 10px 10px", borderTop: "1px solid #f1f5f9", paddingTop: "10px" }}>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "4px",
                        padding: "7px 8px",
                        background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px",
                        color: "#475569", fontWeight: 600, fontSize: "11px", textDecoration: "none",
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
                      Directions
                    </a>
                    <a
                      href={`/place/${encodeURIComponent(r.name)}`}
                      style={{
                        flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "4px",
                        padding: "7px 8px",
                        background: `${color}10`, border: `1px solid ${color}30`, borderRadius: "8px",
                        color, fontWeight: 700, fontSize: "11px", textDecoration: "none",
                      }}
                    >
                      Details
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
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
}
