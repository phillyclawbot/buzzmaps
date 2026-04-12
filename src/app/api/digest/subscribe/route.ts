import { NextResponse } from "next/server";
import { getDb, runMigrations } from "@/lib/db";
import { checkRateLimit, clientIp, rateLimitResponse } from "@/lib/rate-limit";
import { SITE_URL, SITE_NAME } from "@/lib/site";

// Basic-but-strict email check. We don't need to deliver to every valid
// address in the universe — just reject obvious junk.
const EMAIL_RE = /^[^\s@]+@[^\s@.]+\.[^\s@]+$/;

function token(): string {
  // 24 hex chars of entropy — plenty for confirm/unsubscribe links.
  const buf = new Uint8Array(12);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(req: Request) {
  // 3 signup attempts per 10 min per IP.
  const rl = checkRateLimit(`digest-subscribe:${clientIp(req)}`, 3, 10 * 60_000);
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
    const sql = getDb();

    const confirmToken = token();
    const unsubscribeToken = token();

    // Upsert: if an unconfirmed row exists we refresh the token; if a
    // confirmed row exists we treat the request as a no-op success.
    const rows = await sql`
      INSERT INTO digest_subscribers (email, confirm_token, unsubscribe_token, status)
      VALUES (${email}, ${confirmToken}, ${unsubscribeToken}, 'pending')
      ON CONFLICT (email) DO UPDATE SET
        confirm_token = CASE
          WHEN digest_subscribers.status = 'confirmed' THEN digest_subscribers.confirm_token
          ELSE EXCLUDED.confirm_token
        END
      RETURNING id, status, confirm_token
    `;
    const row = rows[0] as { id: number; status: string; confirm_token: string };

    if (row.status === "confirmed") {
      return NextResponse.json({
        success: true,
        message: "You're already subscribed.",
      });
    }

    // A real email service (Resend / Postmark / SES) would send the confirm
    // link here. For now we return it so an operator can wire up delivery
    // later without blocking the frontend.
    const confirmUrl = `${SITE_URL}/api/digest/confirm?token=${row.confirm_token}`;
    console.log(`[digest] new subscriber ${email} — confirm: ${confirmUrl}`);

    return NextResponse.json({
      success: true,
      message:
        `Thanks! Check your inbox for a confirmation link from ${SITE_NAME}.`,
    });
  } catch (err) {
    console.error("[digest] subscribe error:", err);
    return NextResponse.json(
      { error: "Couldn't save your subscription. Please try again." },
      { status: 500 }
    );
  }
}
