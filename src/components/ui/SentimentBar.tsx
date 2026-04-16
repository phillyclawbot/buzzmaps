"use client";

import { motion } from "framer-motion";

export default function SentimentBar({
  positive,
  neutral,
  negative,
  height = 8,
  showLabels = false,
  animated = true,
}: {
  positive: number;
  neutral: number;
  negative: number;
  height?: number;
  showLabels?: boolean;
  animated?: boolean;
}) {
  const total = positive + neutral + negative;
  if (total === 0) return null;
  const pos = Math.round((positive / total) * 100);
  const neg = Math.round((negative / total) * 100);
  const neu = 100 - pos - neg;

  const segments = [
    { w: pos, bg: "linear-gradient(90deg, #10b981, #14c08a)" },
    { w: neu, bg: "linear-gradient(90deg, #f59e0b, #fbbf24)" },
    { w: neg, bg: "linear-gradient(90deg, #ef4444, #f43f5e)" },
  ];

  return (
    <div>
      <div
        className="flex overflow-hidden"
        style={{
          height,
          borderRadius: 9999,
          background: "var(--bg-sunken)",
        }}
        role="img"
        aria-label={`Sentiment: ${positive} positive, ${neutral} neutral, ${negative} negative`}
      >
        {segments.map((s, i) =>
          animated ? (
            <motion.div
              key={i}
              initial={{ width: 0 }}
              animate={{ width: `${s.w}%` }}
              transition={{
                duration: 0.8,
                delay: 0.08 * i,
                ease: [0.22, 1, 0.36, 1],
              }}
              style={{ background: s.bg, height: "100%" }}
            />
          ) : (
            <div
              key={i}
              style={{ width: `${s.w}%`, background: s.bg, height: "100%" }}
            />
          )
        )}
      </div>
      {showLabels && (
        <div
          className="flex items-center justify-between text-[11px] mt-1.5 font-display-ui font-semibold"
          style={{ color: "var(--fg-muted)" }}
        >
          <span style={{ color: "var(--sent-pos)" }}>{positive} loved</span>
          <span style={{ color: "var(--sent-neu)" }}>{neutral} mixed</span>
          <span style={{ color: "var(--sent-neg)" }}>{negative} meh</span>
        </div>
      )}
    </div>
  );
}
