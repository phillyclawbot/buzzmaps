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
  const svg = `<svg width="36" height="44" viewBox="0 0 36 44" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.25)) drop-shadow(0 1px 2px rgba(0,0,0,0.15));">
    <path d="M18 42l-1-1.2C9.4 32 4 26 4 18.5 4 10.5 10 4.5 18 4.5s14 6 14 14c0 7.5-5.4 13.5-13 22.3L18 42z" fill="${color}"/>
    <rect x="6" y="6" width="24" height="24" rx="6" fill="${color}"/>
    <rect x="7" y="7" width="22" height="22" rx="5" fill="${color}" stroke="white" stroke-opacity="0.15" stroke-width="0.5"/>
    <circle cx="18" cy="18" r="5" fill="white" opacity="0.9"/>
  </svg>`;

  return L.divIcon({
    html: `<div style="position:relative;width:36px;height:44px;">${svg}</div>`,
    className: "",
    iconSize: [36, 44],
    iconAnchor: [18, 44],
    popupAnchor: [0, -38],
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
