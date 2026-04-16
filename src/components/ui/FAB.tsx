"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import Link from "next/link";

interface FABProps {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  ariaLabel: string;
  className?: string;
  size?: "sm" | "md" | "lg";
  variant?: "brand" | "neutral" | "map";
  style?: React.CSSProperties;
  title?: string;
}

/**
 * Floating action button primitive — used for map locate-me, mobile
 * submit, sheet triggers, etc.
 */
export default function FAB({
  children,
  onClick,
  href,
  ariaLabel,
  className = "",
  size = "md",
  variant = "brand",
  style,
  title,
}: FABProps) {
  const dim = size === "sm" ? 40 : size === "lg" ? 56 : 48;
  const bg =
    variant === "brand"
      ? "var(--brand-gradient)"
      : variant === "map"
      ? "var(--map)"
      : "var(--bg-elevated)";
  const color =
    variant === "neutral" ? "var(--fg)" : "var(--fg-inverse)";
  const shadow =
    variant === "brand"
      ? "var(--glow-brand), var(--shadow-md)"
      : variant === "map"
      ? "var(--glow-map), var(--shadow-md)"
      : "var(--shadow-md)";

  const sharedStyle: React.CSSProperties = {
    width: dim,
    height: dim,
    borderRadius: 9999,
    background: bg,
    color,
    boxShadow: shadow,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: variant === "neutral" ? "1px solid var(--border)" : "none",
    ...style,
  };

  const motionProps = {
    whileHover: { scale: 1.08 },
    whileTap: { scale: 0.94 },
    transition: { type: "spring" as const, stiffness: 400, damping: 20 },
  };

  if (href) {
    return (
      <motion.span {...motionProps} className={`inline-flex ${className}`} style={sharedStyle}>
        <Link
          href={href}
          aria-label={ariaLabel}
          title={title}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            borderRadius: "inherit",
            color: "inherit",
          }}
        >
          {children}
        </Link>
      </motion.span>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      title={title}
      className={className}
      style={sharedStyle}
      {...motionProps}
    >
      {children}
    </motion.button>
  );
}
