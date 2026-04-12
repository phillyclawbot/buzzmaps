import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { SITE_URL } from "@/lib/site";

// Single-click unsubscribe, accessible from every digest email footer.
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token")?.trim();
  if (!token || token.length > 64) {
    return NextResponse.redirect(`${SITE_URL}/digest?unsub=invalid`);
  }
  try {
    const sql = getDb();
    const rows = await sql`
      UPDATE digest_subscribers
      SET status = 'unsubscribed', unsubscribed_at = NOW()
      WHERE unsubscribe_token = ${token}
      RETURNING id
    `;
    if (!rows.length) {
      return NextResponse.redirect(`${SITE_URL}/digest?unsub=invalid`);
    }
    return NextResponse.redirect(`${SITE_URL}/digest?unsub=ok`);
  } catch (err) {
    console.error("[digest] unsubscribe error:", err);
    return NextResponse.redirect(`${SITE_URL}/digest?unsub=error`);
  }
}
