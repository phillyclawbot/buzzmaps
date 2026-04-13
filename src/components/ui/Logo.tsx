import Link from "next/link";

/**
 * Editorial wordmark. All-caps, display serif, tight tracking.
 * Optional orange dot as the only chromatic flourish.
 */
export default function Logo({
  href = "/",
  className = "",
  showDot = true,
  size = "md",
}: {
  href?: string;
  className?: string;
  showDot?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const textSize =
    size === "sm" ? "text-[13px]" : size === "lg" ? "text-xl" : "text-[15px]";
  const dotSize = size === "sm" ? 5 : size === "lg" ? 8 : 6;

  return (
    <Link
      href={href}
      className={`group inline-flex items-baseline gap-1.5 hover:opacity-80 transition-opacity ${className}`}
      aria-label="BuzzMaps home"
    >
      {showDot && (
        <span
          className="inline-block rounded-full shrink-0 translate-y-[-1px]"
          style={{
            width: dotSize,
            height: dotSize,
            background: "var(--brand)",
          }}
          aria-hidden="true"
        />
      )}
      <span
        className={`font-display ${textSize} tracking-[0.02em] font-semibold`}
        style={{ color: "var(--fg)" }}
      >
        BuzzMaps
      </span>
    </Link>
  );
}
