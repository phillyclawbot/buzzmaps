"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * Ambient gradient-blob background. Positioned fixed, -z so it sits
 * behind page content but in front of the base bg color. Two soft
 * colored blurs drift lazily. Respects prefers-reduced-motion.
 */
export default function GradientMesh({
  tone = "warm",
}: {
  tone?: "warm" | "cool" | "violet";
}) {
  const reduced = useReducedMotion();

  const blobs =
    tone === "cool"
      ? [
          { color: "rgba(0,102,255,0.30)", size: 520, top: "-10%", left: "-10%" },
          { color: "rgba(16,185,129,0.28)", size: 620, bottom: "-18%", right: "-15%" },
        ]
      : tone === "violet"
      ? [
          { color: "rgba(139,92,246,0.32)", size: 520, top: "-10%", left: "-10%" },
          { color: "rgba(236,72,153,0.28)", size: 620, bottom: "-18%", right: "-15%" },
        ]
      : [
          { color: "rgba(255,138,61,0.35)", size: 520, top: "-10%", left: "-10%" },
          { color: "rgba(0,102,255,0.25)", size: 620, bottom: "-18%", right: "-15%" },
        ];

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: -1 }}
    >
      {blobs.map((b, i) => (
        <motion.div
          key={i}
          style={{
            position: "absolute",
            width: b.size,
            height: b.size,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${b.color}, transparent 65%)`,
            filter: "blur(70px)",
            top: b.top,
            bottom: b.bottom,
            left: b.left,
            right: b.right,
          }}
          animate={
            reduced
              ? undefined
              : {
                  x: [0, i === 0 ? 40 : -30, 0],
                  y: [0, i === 0 ? -20 : 30, 0],
                  scale: [1, i === 0 ? 1.08 : 0.94, 1],
                }
          }
          transition={{
            duration: 22 + i * 6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}
