"use client";

import dynamic from "next/dynamic";

const PlaceMap = dynamic(() => import("@/components/PlaceMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[220px] bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-sm">
      Loading map...
    </div>
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
