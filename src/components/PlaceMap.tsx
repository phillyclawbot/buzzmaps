"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const CATEGORY_COLORS: Record<string, string> = {
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

function createSinglePin(color: string) {
  const size = 28;
  const r = size / 2;
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 1px 3px rgba(0,0,0,0.3));">
    <circle cx="${r}" cy="${r}" r="${r}" fill="${color}"/>
    <circle cx="${r}" cy="${r}" r="${r - 1.5}" fill="${color}" stroke="white" stroke-width="2.5"/>
  </svg>`;

  return L.divIcon({
    html: `<div style="position:relative;width:${size}px;height:${size}px;">${svg}</div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [r, r],
    popupAnchor: [0, -r],
  });
}

export default function PlaceMap({
  lat,
  lng,
  name,
  category,
}: {
  lat: number;
  lng: number;
  name: string;
  category: string;
}) {
  const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.other;
  const icon = createSinglePin(color);

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={15}
      className="w-full rounded-xl"
      style={{ height: "220px" }}
      zoomControl={false}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <Marker position={[lat, lng]} icon={icon}>
        <Popup>{name}</Popup>
      </Marker>
    </MapContainer>
  );
}
