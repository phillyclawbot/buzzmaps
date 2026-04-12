import { NextResponse } from "next/server";
import { runMigrations } from "@/lib/db";
import { createMagicLink } from "@/lib/auth";
import { SITE_URL, SITE_NAME } from "@/lib/site";
import { checkRateLimit, clientIp, rateLimitResponse } from "@/lib/rate-limit";

const EMAIL_RE = /^[^\s@]+@[^\s@.]+\.[^\s@]+$/;

export async function POST(req: Request) {
  // 5 login links per 10 min per IP — plenty for retries, tight enough to
  // stop anyone spamming inboxes.
  const rl = checkRateLimit(`login:${clientIp(req)}`, 5, 10 * 60_000);
  if (!rl.allowed) return rateLimitResponse(rl);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const email = String((body as { email?: unknown }).email ?? "")
    .trim()
    .toLowerCase();
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 }
    );
  }

  try {
    await runMigrations();
    const token = await createMagicLink(email);
    const link = `${SITE_URL}/api/auth/verify?token=${token}`;
    // TODO: hand off to a real email service. Until then, log the link so an
    // operator can grab it from Vercel logs.
    console.log(`[auth] magic link for ${email}: ${link}`);

    return NextResponse.json({
      success: true,
      message: `Check your email for a sign-in link from ${SITE_NAME}.`,
    });
  } catch (err) {
    console.error("[auth] request-login error:", err);
    return NextResponse.json(
      { error: "Couldn't send the sign-in link." },
      { status: 500 }
    );
  }
}
