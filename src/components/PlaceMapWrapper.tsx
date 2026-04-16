"use client";

import dynamic from "next/dynamic";

const PlaceMap = dynamic(() => import("@/components/PlaceMap"), {
  ssr: false,
  loading: () => (
    <div
      className="skeleton w-full"
      style={{ height: 280, borderRadius: "var(--radius-xl)" }}
    />
  ),
});

export default function PlaceMapWrapper({
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
  return <PlaceMap lat={lat} lng={lng} name={name} category={category} />;
}
