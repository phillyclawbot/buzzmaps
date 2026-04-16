"use client";

import confetti from "canvas-confetti";
import { useCallback } from "react";

const BRAND_COLORS = ["#ff5b3a", "#ff8a3d", "#0066ff", "#10b981", "#f59e0b", "#ec4899"];

export function useConfetti() {
  return useCallback(
    (opts?: { colors?: string[]; origin?: { x: number; y: number } }) => {
      if (typeof window === "undefined") return;
      const reduced = window.matchMedia?.(
        "(prefers-reduced-motion: reduce)"
      )?.matches;
      if (reduced) return;

      confetti({
        particleCount: 80,
        spread: 70,
        startVelocity: 35,
        origin: opts?.origin ?? { x: 0.5, y: 0.6 },
        colors: opts?.colors ?? BRAND_COLORS,
        gravity: 1,
        scalar: 0.9,
        ticks: 160,
        disableForReducedMotion: true,
      });
      setTimeout(() => {
        confetti({
          particleCount: 40,
          spread: 100,
          startVelocity: 25,
          origin: opts?.origin ?? { x: 0.5, y: 0.6 },
          colors: opts?.colors ?? BRAND_COLORS,
          gravity: 1.1,
          scalar: 0.7,
          ticks: 140,
          disableForReducedMotion: true,
        });
      }, 180);
    },
    []
  );
}
