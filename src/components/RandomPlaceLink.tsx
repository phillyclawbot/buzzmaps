"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Loader2 } from "lucide-react";

/**
 * "Surprise me" — one-click random place button.
 */
export default function RandomPlaceLink({
  className = "",
  children = "Surprise me",
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
    <motion.button
      type="button"
      onClick={go}
      disabled={loading}
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.95 }}
      className={`btn-primary disabled:opacity-60 ${className}`}
    >
      {loading ? (
        <Loader2 size={15} className="animate-spin" />
      ) : (
        <Sparkles size={15} strokeWidth={2.4} />
      )}
      {loading ? "Picking…" : children}
    </motion.button>
  );
}
