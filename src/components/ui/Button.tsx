import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

const SIZES: Record<Size, string> = {
  sm: "text-xs px-3 py-1.5 rounded-lg",
  md: "text-sm px-4 py-2 rounded-lg",
  lg: "text-sm px-5 py-2.5 rounded-xl",
};

export default function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  style,
  ...rest
}: {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const base =
    "inline-flex items-center justify-center gap-2 font-semibold transition-colors press-down focus-ring disabled:opacity-50 disabled:cursor-not-allowed";

  const variantStyle: React.CSSProperties =
    variant === "primary"
      ? {
          backgroundImage: "linear-gradient(135deg, var(--brand), var(--brand-hover))",
          color: "var(--fg-inverse)",
        }
      : variant === "secondary"
      ? { background: "var(--bg-sunken)", color: "var(--fg)" }
      : variant === "outline"
      ? { background: "transparent", color: "var(--brand)", border: "1px solid var(--brand)" }
      : { background: "transparent", color: "var(--fg-muted)" };

  return (
    <button
      {...rest}
      className={`${base} ${SIZES[size]} ${className}`}
      style={{ ...variantStyle, ...style }}
    >
      {children}
    </button>
  );
}
