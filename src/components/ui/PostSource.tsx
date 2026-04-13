import { getPostSource } from "@/lib/post-source";

/**
 * Inline label for a post's origin: subreddit, publication, or ticket vendor.
 *
 * Use this anywhere a post's source needs to be rendered. Don't write
 * `r/${post.subreddit}` directly anywhere else in the app — the prefix is
 * wrong for publications (BlogTO, Toronto Sun, Eater, etc.) and ticket
 * vendors (Ticketmaster, Eventbrite).
 *
 * Visual variants:
 *   - "plain"     — bare text label, inherits color
 *   - "tag"       — small bordered tag (subtle), good for inline rows
 *
 * The colour treatment for publications differs slightly from subreddits
 * so the eye learns the distinction.
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
    return (
      <span
        className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-semibold rounded ${className}`}
        style={{
          color: source.kind === "subreddit" ? "var(--brand)" : "var(--accent-2)",
          background:
            source.kind === "subreddit"
              ? "var(--brand-tint)"
              : "var(--accent-2-tint)",
          letterSpacing: "0.04em",
        }}
      >
        {source.label}
      </span>
    );
  }

  return <span className={className}>{source.label}</span>;
}
