"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const CATEGORY_COLORS: Record<string, string> = {
  restaurant: "#ff6b35",
  bar: "#a855f7",
  cafe: "#6366f1",
  club: "#ec4899",
  shop: "#06b6d4",
  park: "#22c55e",
  gym: "#ef4444",
  venue: "#f59e0b",
  market: "#10b981",
  museum: "#3b82f6",
  other: "#64748b",
};

function createSinglePin(category: string, color: string) {
  const svg = `<svg width="32" height="44" viewBox="0 0 32 44" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="16" cy="42" rx="10" ry="3" fill="rgba(0,0,0,0.25)"/>
    <path d="M16,43 L2,16 A14,14 0 1 1 30,16 Z" fill="${color}"/>
    <circle cx="16" cy="16" r="11" fill="${color}"/>
    <circle cx="16" cy="16" r="6" fill="white" opacity="0.9"/>
  </svg>`;

  return L.divIcon({
    html: `<div style="position:relative;width:32px;height:44px;">${svg}</div>`,
    className: "",
    iconSize: [32, 44],
    iconAnchor: [16, 43],
    popupAnchor: [0, -40],
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
  const icon = createSinglePin(category, color);

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
