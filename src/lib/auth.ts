// Minimal magic-link auth. No external dependencies — uses the Postgres tables
// defined in src/lib/db.ts. Two tokens are involved:
//
//   auth_tokens   — one-time, short-lived; emailed to the user as a magic link
//   user_sessions — long-lived session cookie after a successful verify
//
// Delivery of the magic-link email is out of scope for now: callers log the
// link server-side. Swap in Resend / Postmark / SES later without touching
// the frontend.

import { cookies } from "next/headers";
import { getDb } from "@/lib/db";

export const SESSION_COOKIE = "bm_session";
const SESSION_MAX_AGE_DAYS = 30;
const MAGIC_LINK_TTL_MINUTES = 20;

export function generateToken(bytes = 24): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

export interface SessionUser {
  id: number;
  email: string;
}

/**
 * Create a single-use magic-link token that expires in 20 minutes. Emails the
 * caller nothing; the route handler is responsible for surfacing the link.
 */
export async function createMagicLink(email: string): Promise<string> {
  const sql = getDb();
  const token = generateToken();
  const expires = new Date(Date.now() + MAGIC_LINK_TTL_MINUTES * 60_000);
  await sql`
    INSERT INTO auth_tokens (token, email, expires_at)
    VALUES (${token}, ${email}, ${expires.toISOString()})
  `;
  return token;
}

/**
 * Redeem a magic-link token and produce a session. Returns null if the token
 * is missing, expired, or already used.
 */
export async function redeemMagicLink(
  token: string
): Promise<{ user: SessionUser; sessionToken: string } | null> {
  const sql = getDb();
  const rows = (await sql`
    SELECT email, expires_at, used_at FROM auth_tokens WHERE token = ${token}
  `) as { email: string; expires_at: string; used_at: string | null }[];
  if (!rows.length) return null;
  const row = rows[0];
  if (row.used_at) return null;
  if (new Date(row.expires_at).getTime() < Date.now()) return null;

  await sql`UPDATE auth_tokens SET used_at = NOW() WHERE token = ${token}`;

  const userRows = (await sql`
    INSERT INTO users (email, last_login_at)
    VALUES (${row.email}, NOW())
    ON CONFLICT (email) DO UPDATE SET last_login_at = NOW()
    RETURNING id, email
  `) as { id: number; email: string }[];
  const user = userRows[0];

  const sessionToken = generateToken(32);
  const sessionExpiry = new Date(
    Date.now() + SESSION_MAX_AGE_DAYS * 86400_000
  );
  await sql`
    INSERT INTO user_sessions (token, user_id, expires_at)
    VALUES (${sessionToken}, ${user.id}, ${sessionExpiry.toISOString()})
  `;

  return { user, sessionToken };
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const sql = getDb();
  const rows = (await sql`
    SELECT u.id, u.email, s.expires_at
    FROM user_sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ${token}
  `) as { id: number; email: string; expires_at: string }[];
  if (!rows.length) return null;
  const row = rows[0];
  if (new Date(row.expires_at).getTime() < Date.now()) return null;
  return { id: row.id, email: row.email };
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return;
  const sql = getDb();
  await sql`DELETE FROM user_sessions WHERE token = ${token}`;
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_DAYS * 86400,
  };
}
