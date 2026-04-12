// Best-effort in-memory rate limiter. Suitable for abuse mitigation on a
// small site running on a single serverless region. Does NOT coordinate
// across instances — if you scale horizontally and need strict limits, swap
// this for @upstash/ratelimit backed by Upstash Redis.
//
// Each limiter keeps a sliding window of request timestamps per key.

import { NextResponse } from "next/server";

type Bucket = { timestamps: number[] };
const buckets = new Map<string, Bucket>();

// Clean up stale buckets occasionally so the map can't grow forever.
let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (!bucket.timestamps.length || now - bucket.timestamps[bucket.timestamps.length - 1] > 10 * 60_000) {
      buckets.delete(key);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key) ?? { timestamps: [] };
  // Drop entries outside the window.
  const cutoff = now - windowMs;
  while (bucket.timestamps.length && bucket.timestamps[0] < cutoff) {
    bucket.timestamps.shift();
  }

  if (bucket.timestamps.length >= limit) {
    const retryAfter = Math.max(0, Math.ceil((bucket.timestamps[0] + windowMs - now) / 1000));
    buckets.set(key, bucket);
    return { allowed: false, remaining: 0, retryAfterSeconds: retryAfter };
  }

  bucket.timestamps.push(now);
  buckets.set(key, bucket);
  return {
    allowed: true,
    remaining: limit - bucket.timestamps.length,
    retryAfterSeconds: 0,
  };
}

export function clientIp(req: Request): string {
  // Vercel/most edges: x-forwarded-for is a comma-separated list.
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real;
  return "unknown";
}

export function rateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    { error: "Too many requests. Please slow down." },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSeconds),
      },
    }
  );
}
