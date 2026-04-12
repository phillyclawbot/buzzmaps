import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { SITE_URL } from "@/lib/site";

// Double-opt-in confirm endpoint. Opens via a link from the confirmation
// email, flips the subscriber to 'confirmed', and redirects to the digest
// page with a success flag.
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token")?.trim();
  if (!token || token.length > 64) {
    return NextResponse.redirect(`${SITE_URL}/digest?confirm=invalid`);
  }

  try {
    const sql = getDb();
    const rows = await sql`
      UPDATE digest_subscribers
      SET status = 'confirmed', confirmed_at = NOW()
      WHERE confirm_token = ${token} AND status != 'unsubscribed'
      RETURNING id
    `;
    if (!rows.length) {
      return NextResponse.redirect(`${SITE_URL}/digest?confirm=invalid`);
    }
    return NextResponse.redirect(`${SITE_URL}/digest?confirm=ok`);
  } catch (err) {
    console.error("[digest] confirm error:", err);
    return NextResponse.redirect(`${SITE_URL}/digest?confirm=error`);
  }
}
