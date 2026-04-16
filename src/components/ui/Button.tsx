"use client";

import { motion, type HTMLMotionProps } from "framer-motion";
import type { ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "dark";
type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, { padding: string; font: string }> = {
  sm: { padding: "6px 14px", font: "12px" },
  md: { padding: "10px 20px", font: "14px" },
  lg: { padding: "14px 28px", font: "15px" },
};

type ButtonProps = {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  fullWidth?: boolean;
} & Omit<HTMLMotionProps<"button">, "ref">;

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  style,
  fullWidth,
  ...rest
}: ButtonProps) {
  const dims = SIZES[size];

  const variantStyle: React.CSSProperties =
    variant === "primary"
      ? {
          background: "var(--brand-gradient)",
          color: "var(--fg-inverse)",
          boxShadow: "var(--shadow-sm)",
        }
      : variant === "dark"
      ? {
          background: "var(--fg)",
          color: "var(--fg-inverse)",
          boxShadow: "var(--shadow-sm)",
        }
      : variant === "secondary"
      ? {
          background: "var(--bg-elevated)",
          color: "var(--fg)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-sm)",
        }
      : variant === "outline"
      ? {
          background: "transparent",
          color: "var(--brand)",
          border: "1.5px solid var(--brand)",
        }
      : { background: "transparent", color: "var(--fg-muted)" };

  return (
    <motion.button
      {...rest}
      whileHover={{ y: -1, filter: variant === "primary" ? "brightness(1.05)" : "none" }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: "spring", stiffness: 400, damping: 22 }}
      className={`inline-flex items-center justify-center gap-2 font-display-ui focus-ring disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      style={{
        padding: dims.padding,
        fontSize: dims.font,
        fontWeight: 600,
        borderRadius: "var(--radius-pill)",
        width: fullWidth ? "100%" : undefined,
        ...variantStyle,
        ...style,
      }}
    >
      {children}
    </motion.button>
  );
}
