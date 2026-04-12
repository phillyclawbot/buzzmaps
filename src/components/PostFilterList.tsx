"use client";

import { useMemo, useState } from "react";
import { isPublication } from "@/lib/constants";

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

const SENTIMENTS: { id: Sentiment; label: string; dot: string }[] = [
  { id: "all", label: "All", dot: "#94a3b8" },
  { id: "positive", label: "Positive", dot: "#22c55e" },
  { id: "neutral", label: "Neutral", dot: "#f59e0b" },
  { id: "negative", label: "Negative", dot: "#ef4444" },
];

function formatDate(utc: number): string {
  return new Date(utc * 1000).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  const config: Record<string, { label: string; bg: string; text: string }> = {
    positive: { label: "Positive", bg: "#dcfce7", text: "#16a34a" },
    negative: { label: "Negative", bg: "#fee2e2", text: "#dc2626" },
    neutral: { label: "Neutral", bg: "#fef9c3", text: "#ca8a04" },
  };
  const c = config[sentiment] || config.neutral;
  return (
    <span
      className="text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ background: c.bg, color: c.text }}
    >
      {c.label}
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
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider px-1">
          💬 Mentions ({filtered.length})
        </h2>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="flex flex-wrap gap-1 bg-white border border-slate-200 rounded-full p-1">
          {SENTIMENTS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSentiment(s.id)}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full transition-colors ${
                sentiment === s.id
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ background: s.dot }}
              />
              {s.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1 bg-white border border-slate-200 rounded-full p-1">
          {TIMEFRAMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTimeframe(t.id)}
              className={`text-xs font-medium px-3 py-1 rounded-full transition-colors ${
                timeframe === t.id
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-10 text-slate-400 text-sm">
          No posts match the current filters.
        </div>
      ) : (
        <div className="space-y-3 mb-6">
          {filtered.map((post) => (
            <a
              key={post.id}
              href={
                isPublication(post.subreddit)
                  ? post.permalink
                  : `https://reddit.com${post.permalink}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-white rounded-xl border border-slate-200 shadow-sm p-4 hover:border-[#ff6b35]/60 hover:shadow-md transition-all group"
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-1 self-stretch rounded-full shrink-0"
                  style={{
                    background:
                      post.sentiment === "positive"
                        ? "#22c55e"
                        : post.sentiment === "negative"
                        ? "#ef4444"
                        : "#f59e0b",
                  }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 group-hover:text-[#ff6b35] transition-colors line-clamp-2">
                    {post.title}
                  </p>
                  <div className="flex items-center flex-wrap gap-2 mt-2">
                    {isPublication(post.subreddit) ? (
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                        📰 {post.subreddit}
                      </span>
                    ) : (
                      <span className="text-xs bg-[#ff6b35]/10 text-[#ff6b35] px-2 py-0.5 rounded-full font-medium">
                        r/{post.subreddit}
                      </span>
                    )}
                    <SentimentBadge sentiment={post.sentiment} />
                    <span className="text-xs text-slate-400">
                      ↑ {post.score} pts
                    </span>
                    <span className="text-xs text-slate-400">
                      {post.num_comments} comments
                    </span>
                    <span className="text-xs text-slate-400 ml-auto">
                      {formatDate(post.created_utc)}
                    </span>
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
