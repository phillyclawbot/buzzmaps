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

// SVG path icons per category — clean, minimal line icons (24x24 viewBox)
const CATEGORY_ICON_PATH: Record<PlaceCategory, string> = {
  restaurant: 'M7 2v9a3 3 0 003 3h1v8h2v-8h1a3 3 0 003-3V2m-8 0v5m4-5v5M3 2v4a2 2 0 002 2h0V22h2V8h0a2 2 0 002-2V2',
  bar:        'M8 2h8l-2 7h0a4 4 0 01-4 0h0L8 2zm4 7v13m-3 0h6',
  cafe:       'M3 10h10a1 1 0 011 1v2a4 4 0 01-4 4H6a4 4 0 01-4-4v-2a1 1 0 011-1zm11 1h1a3 3 0 010 6h-1M6 17v2m4-2v2M9 6a3 3 0 00-1-2m3 2a3 3 0 00-1-2',
  club:       'M9 18V5l12-2v13M9 13a3 3 0 11-6 0 3 3 0 016 0zm12-2a3 3 0 11-6 0 3 3 0 016 0z',
  shop:       'M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.3 2.3c-.5.5-.2 1.4.5 1.4H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z',
  park:       'M12 22V8m-4 4l4-8 4 8m-8 0h8m-10 4l2-4m8 4l2-4',
  gym:        'M6 5v14M18 5v14M3 8h3m12 0h3M3 16h3m12 0h3M6 8h12v8H6z',
  venue:      'M12 2L2 7l10 5 10-5-10-5zm0 15l-7-3.5V11l7 3.5 7-3.5v2.5L12 17z',
  market:     'M3 3h18v4H3zm1 4v12h16V7M10 11h4',
  museum:     'M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6',
  event:      'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2zm4 10h2v2H9z',
  landmark:   'M4 21h16M4 21V10l3-4h10l3 4v11M9 21v-4h6v4M12 3v3',
  attraction: 'M12 2a10 10 0 110 20 10 10 0 010-20zm0 4a6 6 0 110 12 6 6 0 010-12zm0 4a2 2 0 110 4 2 2 0 010-4z',
  other:      'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z',
};

function createPinIcon(category: PlaceCategory, mentionCount: number, isRecent: boolean) {
  const color = PIN_COLORS[category] || PIN_COLORS.other;
  const showPulse = isRecent && mentionCount >= 2;

  // 28x36 teardrop with 14px icon area, consistent sizing
  const W = 28;
  const H = 36;
  const iconPath = CATEGORY_ICON_PATH[category] || CATEGORY_ICON_PATH.other;

  const pulseRing = showPulse ? `
    <div style="position:absolute;top:0;left:-6px;width:${W + 12}px;height:${W + 12}px;border-radius:50%;border:2px solid ${color};opacity:0;animation:pinPulse 2s ease-out infinite;pointer-events:none;"></div>
    <div style="position:absolute;top:0;left:-6px;width:${W + 12}px;height:${W + 12}px;border-radius:50%;border:2px solid ${color};opacity:0;animation:pinPulse 2s ease-out 1s infinite;pointer-events:none;"></div>
  ` : '';

  const svgPin = `
    <svg width="${W}" height="${H}" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,0.2));">
      <path d="M14 34C14 34 25 22 25 14C25 7.37 19.63 2 14 2C8.37 2 3 7.37 3 14C3 22 14 34 14 34Z" fill="${color}"/>
      <circle cx="14" cy="14" r="7" fill="white" fill-opacity="0.95"/>
      <g transform="translate(7,7) scale(0.583)" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none">
        <path d="${iconPath}"/>
      </g>
    </svg>`;

  return L.divIcon({
    html: `<div style="position:relative;width:${W}px;height:${H}px;">${pulseRing}${svgPin}</div>`,
    className: '',
    iconSize: [W, H],
    iconAnchor: [W / 2, H],
    popupAnchor: [0, -H + 4],
  });
}

function createClusterIcon(cluster: { getChildCount: () => number; getAllChildMarkers: () => L.Marker[] }) {
  const count = cluster.getChildCount();
  const size = Math.max(32, Math.min(50, 32 + Math.floor(count / 10) * 2));

  // Determine dominant category color from child markers
  const markers = cluster.getAllChildMarkers();
  const catCounts: Record<string, number> = {};
  let hood = "";
  if (markers.length > 0) {
    let totalLat = 0, totalLng = 0;
    for (const m of markers) {
      const ll = m.getLatLng();
      totalLat += ll.lat;
      totalLng += ll.lng;
      // Extract category from marker options (stored via icon)
      const cat = (m.options as { category?: string }).category;
      if (cat) catCounts[cat] = (catCounts[cat] || 0) + 1;
    }
    hood = getNeighbourhood(totalLat / markers.length, totalLng / markers.length) || "";
  }
  // Find dominant category, fallback to brand orange
  let dominantColor = "#E05D36";
  let maxCount = 0;
  for (const [cat, c] of Object.entries(catCounts)) {
    if (c > maxCount) { maxCount = c; dominantColor = PIN_COLORS[cat as PlaceCategory] || "#E05D36"; }
  }

  const labelHtml = hood
    ? `<div style="
        position:absolute;top:${size + 3}px;left:50%;transform:translateX(-50%);
        white-space:nowrap;font-size:9px;font-weight:600;color:#475569;
        background:rgba(255,255,255,0.95);backdrop-filter:blur(8px);
        padding:2px 8px;border-radius:8px;
        box-shadow:0 1px 4px rgba(0,0,0,0.06);
        pointer-events:none;line-height:1.2;letter-spacing:0.2px;
      ">${hood}</div>`
    : "";

  const totalH = hood ? size + 20 : size;

  return L.divIcon({
    html: `<div style="position:relative;width:${size}px;height:${totalH}px;">
      <div style="
        width:${size}px;height:${size}px;min-width:32px;
        border-radius:50%;background:white;
        border:2px solid ${dominantColor};
        box-shadow:0 2px 8px rgba(0,0,0,0.15);
        display:flex;align-items:center;justify-content:center;
        font-size:${count >= 100 ? 11 : 13}px;font-weight:600;
        color:#1e293b;font-family:system-ui,-apple-system,sans-serif;
      ">${count}</div>
      ${labelHtml}
    </div>`,
    className: "",
    iconSize: [size, totalH],
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
    // Filter by zoom level
    return labels.filter((l) => {
      if (zoom < 12) return l.isActive && l.maxCount >= 5;
      if (zoom < 14) return l.isActive;
      return true;
    });
  }, [allHoods, hoodCentroids, zoom]);

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
        {places.map((r) => {
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
              <Popup maxWidth={320} minWidth={240}>
                <div style={{ fontFamily: "inherit" }}>
                  {/* Compact header */}
                  <div style={{
                    background: `linear-gradient(135deg, ${color}18 0%, ${color}08 100%)`,
                    borderRadius: "8px 8px 0 0",
                    padding: "10px 10px 8px",
                    margin: "-4px -4px 8px",
                    borderBottom: `2px solid ${color}20`,
                  }}>
                    {r.photo_url && (
                      <a href={`/place/${encodeURIComponent(r.name)}`}>
                        <img
                          src={r.photo_url}
                          alt={r.name}
                          style={{ width: "100%", maxHeight: "90px", objectFit: "cover", borderRadius: "6px", marginBottom: "8px", display: "block", cursor: "pointer" }}
                        />
                      </a>
                    )}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <div style={{ fontSize: "15px", fontWeight: 800, color, lineHeight: 1.2, flex: 1 }}>
                        {CATEGORY_EMOJI[category]} {r.name}
                      </div>
                      {isRecent && mentionCount >= 2 && (
                        <span style={{ fontSize: "9px", fontWeight: 700, background: "#ff6b35", color: "white", padding: "2px 6px", borderRadius: "999px" }}>🔥 Trending</span>
                      )}
                    </div>
                  </div>

                  {/* Quick stats row */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "8px", alignItems: "center" }}>
                    {r.google_rating && (
                      <span style={{ fontSize: "12px", fontWeight: 700, color: "#374151" }}>⭐ {r.google_rating.toFixed(1)}</span>
                    )}
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: "3px",
                      background: "#ff6b3520", color: "#ff6b35", fontWeight: 700, fontSize: "11px",
                      padding: "3px 10px", borderRadius: "999px", border: "1px solid #ff6b3540",
                    }}>
                      💬 {r.mention_count} mention{Number(r.mention_count) !== 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Scrollable mentions list */}
                  {r.posts?.length ? (
                    <div style={{ maxHeight: "140px", overflowY: "auto", marginBottom: "8px", borderTop: "1px solid #f1f5f9", paddingTop: "6px" }}>
                      <div style={{ fontSize: "10px", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
                        Mentions
                      </div>
                      {r.posts.map((p: { id: number; title: string; subreddit: string; score: number; sentiment: string; created_utc: number; permalink: string; mentions_in_thread?: number }) => (
                        <a
                          key={p.id}
                          href={isPublication(p.subreddit) ? p.permalink : `https://reddit.com${p.permalink}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ display: "flex", alignItems: "flex-start", gap: "6px", padding: "4px 2px", textDecoration: "none", borderRadius: "4px" }}
                        >
                          <span style={{
                            display: "inline-block", width: "6px", height: "6px", borderRadius: "50%",
                            marginTop: "5px", flexShrink: 0,
                            background: SENTIMENT_COLORS[p.sentiment] || SENTIMENT_COLORS.neutral,
                          }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: "11px", color: "#334155", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {p.title}
                            </div>
                            <div style={{ fontSize: "10px", color: "#94a3b8", marginTop: "1px" }}>
                              {isPublication(p.subreddit) ? `📰 ${p.subreddit}` : `r/${p.subreddit}`} · {p.score} pts · {formatTimeAgo(p.created_utc)}
                              {(p.mentions_in_thread ?? 1) > 1 ? ` · ${p.mentions_in_thread}x` : ""}
                            </div>
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: "11px", color: "#94a3b8", textAlign: "center", padding: "8px 0", borderTop: "1px solid #f1f5f9", marginBottom: "8px" }}>
                      No mentions yet
                    </div>
                  )}

                  {/* Action buttons row */}
                  <div style={{ display: "flex", gap: "6px", borderTop: "1px solid #f1f5f9", paddingTop: "8px" }}>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${r.lat},${r.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        flex: 1, textAlign: "center", padding: "6px 8px",
                        background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "8px",
                        color: "#0369a1", fontWeight: 600, fontSize: "11px", textDecoration: "none",
                      }}
                    >
                      🧭 Directions
                    </a>
                    <a
                      href={`/place/${encodeURIComponent(r.name)}`}
                      style={{
                        flex: 1, textAlign: "center", padding: "6px 8px",
                        background: "#fff7f4", border: "1px solid #ff6b3540", borderRadius: "8px",
                        color: "#ff6b35", fontWeight: 700, fontSize: "11px", textDecoration: "none",
                      }}
                    >
                      Details →
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
