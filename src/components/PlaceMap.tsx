"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CATEGORY_COLORS, CATEGORY_COLORS_DARK } from "@/lib/constants";
import type { PlaceCategory } from "@/lib/types";

function createHeroPin(category: string) {
  const c =
    (CATEGORY_COLORS as Record<string, string>)[category] ||
    CATEGORY_COLORS.other;
  const cd =
    (CATEGORY_COLORS_DARK as Record<string, string>)[category] ||
    CATEGORY_COLORS_DARK.other;
  const W = 56;
  const H = 68;
  const gradId = `pm-${category}`;
  const svg = `
    <span style="position:relative;display:block;width:${W}px;height:${H}px;filter:drop-shadow(0 10px 16px rgba(15,20,25,0.28));" class="pin-drop">
      <span style="position:absolute;left:${W / 2 - 20}px;top:${W / 2 - 20}px;width:40px;height:40px;border-radius:50%;border:2px solid ${c};opacity:0;animation:pinPulse 2s ease-out infinite;pointer-events:none;"></span>
      <span style="position:absolute;left:${W / 2 - 20}px;top:${W / 2 - 20}px;width:40px;height:40px;border-radius:50%;border:2px solid ${c};opacity:0;animation:pinPulse 2s ease-out 1s infinite;pointer-events:none;"></span>
      <svg width="${W}" height="${H}" viewBox="0 0 40 48" xmlns="http://www.w3.org/2000/svg" style="display:block;">
        <defs>
          <linearGradient id="${gradId}" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="${c}" />
            <stop offset="100%" stop-color="${cd}" />
          </linearGradient>
        </defs>
        <path d="M20 1.5C10.6 1.5 3 9 3 18.3c0 11.8 12.5 24.2 15.8 27.2a1.8 1.8 0 0 0 2.4 0C24.5 42.5 37 30.1 37 18.3 37 9 29.4 1.5 20 1.5z" fill="url(#${gradId})" stroke="#ffffff" stroke-width="1.8"/>
        <circle cx="20" cy="18" r="9" fill="#ffffff"/>
        <circle cx="20" cy="18" r="5" fill="${c}"/>
      </svg>
    </span>
  `;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [W, H],
    iconAnchor: [W / 2, H - 2],
    popupAnchor: [0, -H + 6],
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
  const icon = createHeroPin(category as PlaceCategory);

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={15}
      className="w-full"
      style={{
        height: 280,
        borderRadius: "var(--radius-xl)",
        boxShadow: "var(--shadow-md)",
        overflow: "hidden",
      }}
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
