/**
 * Shimmer placeholder box. Purely visual — animation runs via CSS
 * keyframes defined in globals.css (`.skeleton`).
 */
export default function Skeleton({
  className = "",
  style,
  rounded = "md",
}: {
  className?: string;
  style?: React.CSSProperties;
  rounded?: "sm" | "md" | "lg" | "xl" | "pill" | "none";
}) {
  const radius =
    rounded === "sm"
      ? "var(--radius-sm)"
      : rounded === "lg"
      ? "var(--radius-lg)"
      : rounded === "xl"
      ? "var(--radius-xl)"
      : rounded === "pill"
      ? "var(--radius-pill)"
      : rounded === "none"
      ? "0"
      : "var(--radius-md)";
  return (
    <div
      aria-hidden="true"
      className={`skeleton ${className}`}
      style={{ borderRadius: radius, ...style }}
    />
  );
}
