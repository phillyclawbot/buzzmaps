"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "buzzmaps_checkins";

function getCheckedIn(): Set<number> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as number[]);
  } catch {
    return new Set();
  }
}

function setCheckedIn(ids: Set<number>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids]));
  } catch {
    // ignore
  }
}

export default function CheckinButton({
  placeId,
  initialCount,
}: {
  placeId: number;
  initialCount?: number;
}) {
  const [count, setCount] = useState(initialCount ?? 0);
  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const ids = getCheckedIn();
    setHasCheckedIn(ids.has(placeId));
    // Fetch current count from API
    fetch(`/api/places/${placeId}/checkin`)
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.checkin_count === "number") setCount(d.checkin_count);
      })
      .catch(() => {});
  }, [placeId]);

  const handleCheckin = async () => {
    if (hasCheckedIn || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/places/${placeId}/checkin`, { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setCount(data.checkin_count);
        const ids = getCheckedIn();
        ids.add(placeId);
        setCheckedIn(ids);
        setHasCheckedIn(true);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCheckin}
      disabled={hasCheckedIn || loading}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
        hasCheckedIn
          ? "bg-green-50 border-green-200 text-green-600 cursor-default"
          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-[#ff6b35] hover:text-white hover:border-[#ff6b35] cursor-pointer"
      }`}
    >
      <span>{hasCheckedIn ? "✅" : "📍"}</span>
      <span>{hasCheckedIn ? "Been here" : "Been here?"}</span>
      {count > 0 && (
        <span className={`font-bold ${hasCheckedIn ? "text-green-600" : "text-[#ff6b35]"}`}>
          {count}
        </span>
      )}
    </button>
  );
}
