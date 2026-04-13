export default function SentimentBar({
  positive,
  neutral,
  negative,
  height = 6,
  showLabels = false,
}: {
  positive: number;
  neutral: number;
  negative: number;
  height?: number;
  showLabels?: boolean;
}) {
  const total = positive + neutral + negative;
  if (total === 0) return null;
  const pos = Math.round((positive / total) * 100);
  const neg = Math.round((negative / total) * 100);
  const neu = 100 - pos - neg;

  return (
    <div>
      <div
        className="flex rounded-full overflow-hidden"
        style={{ height }}
        role="img"
        aria-label={`Sentiment: ${positive} positive, ${neutral} neutral, ${negative} negative`}
      >
        <div style={{ width: `${pos}%`, background: "var(--sent-pos-fill)" }} />
        <div style={{ width: `${neu}%`, background: "var(--sent-neu)" }} />
        <div style={{ width: `${neg}%`, background: "var(--sent-neg)" }} />
      </div>
      {showLabels && (
        <div
          className="flex items-center justify-between text-[10px] mt-1"
          style={{ color: "var(--fg-subtle)" }}
        >
          <span>{positive} positive</span>
          <span>{neutral} neutral</span>
          <span>{negative} negative</span>
        </div>
      )}
    </div>
  );
}
