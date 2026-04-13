import type { ButtonHTMLAttributes, ReactNode } from "react";

/**
 * Filter/category pill. Active state uses brand tint. Inactive is neutral.
 */
export default function Chip({
  active = false,
  color,
  children,
  className = "",
  style,
  ...rest
}: {
  active?: boolean;
  /** Optional category color — overrides the default brand tint when active */
  color?: string;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const accent = color ?? "var(--brand)";
  const activeStyle: React.CSSProperties = color
    ? { background: color, color: "var(--fg-inverse)", borderColor: color }
    : {
        background: "var(--brand)",
        color: "var(--fg-inverse)",
        borderColor: "var(--brand)",
      };
  const inactiveStyle: React.CSSProperties = {
    background: "var(--bg-elevated)",
    color: "var(--fg-muted)",
    borderColor: "var(--border)",
  };

  return (
    <button
      {...rest}
      className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors press-down focus-ring ${className}`}
      style={{
        ...(active ? activeStyle : inactiveStyle),
        ...style,
      }}
      data-accent={accent}
    >
      {children}
    </button>
  );
}
