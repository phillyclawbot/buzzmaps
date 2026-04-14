"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * "Take me somewhere new" — one-click random place. Fires the /api/places/random
 * endpoint and navigates to /place/[name]. Also surfaced in the command palette.
 */
export default function RandomPlaceLink({
  className = "",
  children = "Take me somewhere new →",
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const go = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/places/random", { cache: "no-store" });
      if (res.ok) {
        const p = await res.json();
        if (p?.name) {
          router.push(`/place/${encodeURIComponent(p.name)}`);
          return;
        }
      }
    } catch {
      /* no-op */
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={go}
      disabled={loading}
      className={`font-display text-xl md:text-2xl ink-underline press-down disabled:opacity-50 ${className}`}
      style={{ color: "var(--brand)", fontWeight: 500 }}
    >
      {loading ? "Thinking…" : children}
    </button>
  );
}
