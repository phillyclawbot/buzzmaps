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
} from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import type { Place, PlaceCategory } from "@/lib/types";
import { CATEGORY_EMOJI } from "@/lib/types";
import { CATEGORY_COLORS, SENTIMENT_COLORS } from "@/lib/constants";
import { NEIGHBOURHOODS, NEIGHBOURHOOD_GEOJSON_MAP, getNeighbourhood, computeFeatureCentroid } from "@/lib/neighbourhoods";

const HOOD_PALETTE = [
  "#ff6b35", "#7c3aed", "#0891b2", "#16a34a", "#db2777",
  "#b45309", "#6366f1", "#0d9488", "#ca8a04", "#dc2626",
  "#4f46e5", "#059669",
];

function getHoodColor(index: number): string {
  return HOOD_PALETTE[index % HOOD_PALETTE.length];
}


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

function createClusterIcon(cluster: { getChildCount: () => number; getAllChildMarkers: () => L.Marker[] }) {
  const count = cluster.getChildCount();
  let size = 36;
  let bg = "#ff6b35";
  let ring = "rgba(255,107,53,0.25)";

  if (count >= 50) {
    size = 48;
    bg = "#dc2626";
    ring = "rgba(220,38,38,0.2)";
  } else if (count >= 20) {
    size = 44;
    bg = "#ea580c";
    ring = "rgba(234,88,12,0.22)";
  } else if (count >= 10) {
    size = 40;
    bg = "#f97316";
    ring = "rgba(249,115,22,0.22)";
  }

  // Determine neighbourhood from average marker position
  const markers = cluster.getAllChildMarkers();
  let hood = "";
  if (markers.length > 0) {
    let totalLat = 0, totalLng = 0;
    for (const m of markers) {
      const ll = m.getLatLng();
      totalLat += ll.lat;
      totalLng += ll.lng;
    }
    hood = getNeighbourhood(totalLat / markers.length, totalLng / markers.length) || "";
  }

  const labelHtml = hood
    ? `<div style="
        position:absolute;top:${size + 2}px;left:50%;transform:translateX(-50%);
        white-space:nowrap;font-size:10px;font-weight:700;color:#334155;
        background:rgba(255,255,255,0.92);backdrop-filter:blur(4px);
        padding:1px 6px;border-radius:6px;
        box-shadow:0 1px 4px rgba(0,0,0,0.12);
        pointer-events:none;line-height:1.3;
      ">${hood}</div>`
    : "";

  const totalH = hood ? size + 18 : size;

  return L.divIcon({
    html: `<div style="position:relative;width:${size}px;height:${totalH}px;">
      <div style="
        width:${size}px;height:${size}px;
        border-radius:50%;
        background:${bg};
        color:white;
        font-weight:800;
        font-size:${count >= 100 ? 12 : 13}px;
        display:flex;align-items:center;justify-content:center;
        box-shadow:0 2px 10px rgba(0,0,0,0.3), 0 0 0 4px ${ring};
        border:2px solid rgba(255,255,255,0.8);
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
              return { color, fillColor: color, fillOpacity: 0.07, weight: 1.5, opacity: 0.4 };
            }
            return { color: "#94a3b8", fillColor: "#e2e8f0", fillOpacity: 0.05, weight: 1.2, opacity: 0.45 };
          }}
          interactive={false}
        />
      )}
      {/* Neighbourhood name labels at polygon centroids — all areas */}
      {allHoods.map((n) => {
        const centroid = hoodCentroids[n.name];
        if (!centroid) return null;
        const [centerLat, centerLng] = centroid;
        const isActive = n.count > 0;
        return (
          <Marker
            key={`label-${n.name}`}
            position={[centerLat, centerLng]}
            interactive={false}
            icon={L.divIcon({
              html: `<div style="
                white-space:nowrap;font-size:${isActive ? 11 : 10}px;font-weight:${isActive ? 700 : 600};
                color:${isActive ? n.color : "#94a3b8"};text-shadow:0 0 3px white, 0 0 6px white, 0 0 9px white;
                pointer-events:none;text-align:center;
                opacity:${isActive ? 0.8 : 0.5};letter-spacing:0.3px;
              ">${n.name}${isActive ? `<span style="display:block;font-size:9px;font-weight:600;opacity:0.6;">${n.count} place${n.count !== 1 ? "s" : ""}</span>` : ""}</div>`,
              className: "",
              iconSize: [120, 30],
              iconAnchor: [60, 15],
            })}
          />
        );
      })}
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
              <Popup maxWidth={300} minWidth={240}>
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
                    {r.posts?.[0] && (
                      <span style={{ display: "inline-block", width: "8px", height: "8px", borderRadius: "50%", background: SENTIMENT_COLORS[r.posts[0].sentiment] || SENTIMENT_COLORS.neutral }} />
                    )}
                  </div>

                  {/* Top post preview */}
                  {r.posts?.[0] && (
                    <div style={{ fontSize: "11px", color: "#64748b", fontStyle: "italic", marginBottom: "8px", lineHeight: 1.4 }}>
                      &ldquo;{r.posts[0].title.slice(0, 80)}{r.posts[0].title.length > 80 ? "..." : ""}&rdquo;
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
