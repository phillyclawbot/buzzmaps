import { SENTIMENT_COLORS, SENTIMENT_LABELS } from "@/lib/constants";

export default function SentimentDot({
  sentiment,
  size = 8,
  className = "",
}: {
  sentiment: string;
  size?: number;
  className?: string;
}) {
  const color = SENTIMENT_COLORS[sentiment] || SENTIMENT_COLORS.neutral;
  const label = SENTIMENT_LABELS[sentiment] || "Neutral";
  return (
    <span
      role="img"
      aria-label={label}
      className={`inline-block rounded-full shrink-0 ${className}`}
      style={{ width: size, height: size, background: color }}
    />
  );
}
