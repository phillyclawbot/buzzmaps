"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Pill chip — used for filters, tags, categories. Active state uses
 * dark ink fill by default, or a category color when `color` is set.
 */
type ChipProps = {
  active?: boolean;
  color?: string;
  children: ReactNode;
  size?: "sm" | "md";
} & Omit<HTMLMotionProps<"button">, "ref">;

export default function Chip({
  active = false,
  color,
  children,
  className = "",
  style,
  size = "md",
  ...rest
}: ChipProps) {
  const padding = size === "sm" ? "4px 10px" : "6px 14px";
  const fontSize = size === "sm" ? 11 : 12.5;

  const activeStyle: React.CSSProperties = color
    ? {
        background: color,
        color: "var(--fg-inverse)",
        borderColor: color,
        boxShadow: `0 4px 12px ${color}33`,
      }
    : {
        background: "var(--fg)",
        color: "var(--fg-inverse)",
        borderColor: "var(--fg)",
        boxShadow: "var(--shadow-sm)",
      };

  const inactiveStyle: React.CSSProperties = {
    background: "var(--bg-elevated)",
    color: "var(--fg)",
    borderColor: "var(--border)",
  };

  return (
    <motion.button
      {...rest}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      className={`shrink-0 inline-flex items-center gap-1.5 font-display-ui focus-ring ${className}`}
      style={{
        padding,
        fontSize,
        fontWeight: 600,
        borderRadius: "var(--radius-pill)",
        borderWidth: 1,
        borderStyle: "solid",
        lineHeight: 1,
        letterSpacing: "0.01em",
        transition: "box-shadow 180ms ease, background 180ms ease, color 180ms ease, border-color 180ms ease",
        ...(active ? activeStyle : inactiveStyle),
        ...style,
      }}
    >
      {children}
    </motion.button>
  );
}
