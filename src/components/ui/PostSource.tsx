import { getPostSource } from "@/lib/post-source";

/**
 * Inline label for a post's origin: subreddit, publication, or ticket vendor.
 * - "plain" — bare text label
 * - "tag"   — pill with tinted background, colored by source kind
 */
export default function PostSource({
  subreddit,
  variant = "plain",
  className = "",
}: {
  subreddit: string;
  variant?: "plain" | "tag";
  className?: string;
}) {
  const source = getPostSource(subreddit);

  if (variant === "tag") {
    const color =
      source.kind === "subreddit"
        ? "#ff5b3a"
        : source.kind === "publication"
        ? "#0066ff"
        : "#10b981";
    return (
      <span
        className={`inline-flex items-center gap-1 font-display-ui font-semibold ${className}`}
        style={{
          color,
          background: `${color}14`,
          padding: "3px 10px",
          borderRadius: 9999,
          fontSize: 10.5,
          letterSpacing: "0.04em",
          lineHeight: 1.2,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: "inline-block",
            width: 5,
            height: 5,
            borderRadius: 9999,
            background: color,
          }}
        />
        {source.label}
      </span>
    );
  }

  return <span className={className}>{source.label}</span>;
}
