"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { MapPin, Check } from "lucide-react";
import { useConfetti } from "@/components/ui/Confetti";

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
  const fire = useConfetti();

  useEffect(() => {
    const ids = getCheckedIn();
    setHasCheckedIn(ids.has(placeId));
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
      const res = await fetch(`/api/places/${placeId}/checkin`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setCount(data.checkin_count);
        const ids = getCheckedIn();
        ids.add(placeId);
        setCheckedIn(ids);
        setHasCheckedIn(true);
        fire();
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const Icon = hasCheckedIn ? Check : MapPin;
  return (
    <motion.button
      whileHover={hasCheckedIn ? undefined : { scale: 1.03 }}
      whileTap={hasCheckedIn ? undefined : { scale: 0.95 }}
      onClick={handleCheckin}
      disabled={hasCheckedIn || loading}
      className="btn-secondary"
      style={
        hasCheckedIn
          ? {
              background: "color-mix(in srgb, var(--sent-pos) 12%, transparent)",
              color: "var(--sent-pos)",
              borderColor: "color-mix(in srgb, var(--sent-pos) 30%, transparent)",
              cursor: "default",
            }
          : undefined
      }
    >
      <Icon size={15} strokeWidth={2.3} />
      {hasCheckedIn ? "Been here" : "Been here?"}
      {count > 0 && (
        <span
          className="font-display-ui tabular-nums"
          style={{
            fontWeight: 700,
            color: hasCheckedIn ? "var(--sent-pos)" : "var(--brand)",
          }}
        >
          {count}
        </span>
      )}
    </motion.button>
  );
}
