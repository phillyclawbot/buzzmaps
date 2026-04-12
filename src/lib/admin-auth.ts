// Shared admin-auth check for privileged API routes (debug, migrate, scrape).
//
// In production, every gated route must receive either:
//   - header `x-admin-token: <ADMIN_TOKEN>`, or
//   - query param `?token=<ADMIN_TOKEN>`  (convenient for Vercel cron)
//
// In non-production environments, requests pass through without a token so
// local development stays friction-free.
//
// Usage:
//   const denied = requireAdmin(req);
//   if (denied) return denied;

import { NextResponse } from "next/server";

const PROD = process.env.NODE_ENV === "production";

export function requireAdmin(req: Request): NextResponse | null {
  if (!PROD) return null;

  const token = process.env.ADMIN_TOKEN;
  if (!token) {
    // Production without a configured token → lock everything down rather than
    // falling open silently.
    return NextResponse.json(
      { error: "ADMIN_TOKEN not configured" },
      { status: 503 }
    );
  }

  const headerToken = req.headers.get("x-admin-token");
  let queryToken: string | null = null;
  try {
    queryToken = new URL(req.url).searchParams.get("token");
  } catch {
    // non-absolute URL; ignore
  }

  const provided = headerToken ?? queryToken;
  if (provided && timingSafeEqual(provided, token)) return null;

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}
