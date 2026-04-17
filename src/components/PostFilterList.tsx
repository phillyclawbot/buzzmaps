"use client";

import { useMemo, useState } from "react";
import { decodeHtmlEntities, getPostHref } from "@/lib/post-source";
import PostSource from "@/components/ui/PostSource";
import Chip from "@/components/ui/Chip";
import { SENTIMENT_COLORS, SENTIMENT_LABELS } from "@/lib/constants";
import { ArrowUp, MessageCircle } from "@/lib/icons-lucide";

interface Post {
  id: number;
  title: string;
  subreddit: string;
  score: number;
  num_comments: number;
  permalink: string;
  sentiment: string;
  created_utc: number;
}

type Sentiment = "all" | "positive" | "neutral" | "negative";
type Timeframe = "all" | "month" | "quarter" | "year";

const TIMEFRAMES: { id: Timeframe; label: string; seconds: number | null }[] = [
  { id: "all", label: "All time", seconds: null },
  { id: "year", label: "Past year", seconds: 365 * 86400 },
  { id: "quarter", label: "Past 3 months", seconds: 90 * 86400 },
  { id: "month", label: "Past month", seconds: 30 * 86400 },
];

const SENTIMENTS: { id: Sentiment; label: string }[] = [
  { id: "all", label: "All" },
  { id: "positive", label: "Positive" },
  { id: "neutral", label: "Neutral" },
  { id: "negative", label: "Negative" },
];

function sentimentColor(id: string): string {
  return SENTIMENT_COLORS[id] ?? "var(--fg-subtle)";
}

function formatDate(utc: number): string {
  return new Date(utc * 1000).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  const color = sentimentColor(sentiment);
  const label = SENTIMENT_LABELS[sentiment] ?? "Neutral";
  return (
    <span
      className="inline-flex items-center gap-1 font-display-ui font-semibold text-[11px]"
      style={{
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
        color,
        padding: "3px 8px",
        borderRadius: 9999,
        letterSpacing: "0.02em",
      }}
    >
      <span
        aria-hidden
        className="inline-block w-1.5 h-1.5 rounded-full"
        style={{ background: color }}
      />
      {label}
    </span>
  );
}

export default function PostFilterList({ posts }: { posts: Post[] }) {
  const [sentiment, setSentiment] = useState<Sentiment>("all");
  const [timeframe, setTimeframe] = useState<Timeframe>("all");

  const filtered = useMemo(() => {
    const window = TIMEFRAMES.find((t) => t.id === timeframe)?.seconds ?? null;
    const cutoff = window === null ? 0 : Math.floor(Date.now() / 1000) - window;
    return posts.filter((p) => {
      if (sentiment !== "all" && p.sentiment !== sentiment) return false;
      if (cutoff > 0 && p.created_utc < cutoff) return false;
      return true;
    });
  }, [posts, sentiment, timeframe]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p
          className="eyebrow inline-flex items-center gap-2"
          style={{ color: "var(--fg-muted)" }}
        >
          <MessageCircle size={12} strokeWidth={2.4} />
          Mentions ({filtered.length})
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {SENTIMENTS.map((s) => {
          const isActive = sentiment === s.id;
          const color = s.id === "all" ? undefined : sentimentColor(s.id);
          return (
            <Chip
              key={s.id}
              size="sm"
              active={isActive}
              color={color}
              onClick={() => setSentiment(s.id)}
            >
              {s.id !== "all" && (
                <span
                  aria-hidden
                  className="inline-block w-1.5 h-1.5 rounded-full"
                  style={{
                    background: isActive ? "var(--fg-inverse)" : color,
                  }}
                />
              )}
              {s.label}
            </Chip>
          );
        })}
        <span
          aria-hidden
          className="hidden sm:inline-block w-px self-stretch mx-1"
          style={{ background: "var(--border)" }}
        />
        {TIMEFRAMES.map((t) => (
          <Chip
            key={t.id}
            size="sm"
            active={timeframe === t.id}
            onClick={() => setTimeframe(t.id)}
          >
            {t.label}
          </Chip>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div
          className="text-center py-12 rounded-[var(--radius-lg)]"
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            color: "var(--fg-subtle)",
          }}
        >
          <p className="font-display-ui text-sm">
            No posts match the current filters.
          </p>
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {filtered.map((post) => (
            <a
              key={post.id}
              href={getPostHref(post.subreddit, post.permalink)}
              target="_blank"
              rel="noopener noreferrer"
              className="group block place-card-hover"
              style={
                {
                  ["--card-glow" as string]: `${sentimentColor(post.sentiment)}55`,
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)",
                  boxShadow: "var(--shadow-sm)",
                  padding: "16px",
                  color: "inherit",
                  textDecoration: "none",
                } as React.CSSProperties
              }
            >
              <div className="flex items-start gap-3">
                <div
                  aria-hidden
                  className="w-1 self-stretch rounded-full shrink-0"
                  style={{ background: sentimentColor(post.sentiment) }}
                />
                <div className="flex-1 min-w-0">
                  <p
                    className="font-display-ui font-semibold text-sm line-clamp-2 transition-colors group-hover:text-[color:var(--brand)]"
                    style={{ color: "var(--fg)" }}
                  >
                    {decodeHtmlEntities(post.title)}
                  </p>
                  <div
                    className="flex items-center flex-wrap gap-2 mt-2 font-display-ui text-[11.5px]"
                    style={{ color: "var(--fg-subtle)" }}
                  >
                    <PostSource subreddit={post.subreddit} variant="tag" />
                    <SentimentBadge sentiment={post.sentiment} />
                    <span className="inline-flex items-center gap-1">
                      <ArrowUp size={11} strokeWidth={2.4} />
                      {post.score}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle size={11} strokeWidth={2.4} />
                      {post.num_comments}
                    </span>
                    <span className="ml-auto">{formatDate(post.created_utc)}</span>
                  </div>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
