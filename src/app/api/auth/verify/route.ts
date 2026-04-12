import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  redeemMagicLink,
  sessionCookieOptions,
} from "@/lib/auth";
import { SITE_URL } from "@/lib/site";

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token")?.trim();
  if (!token || token.length > 128) {
    return NextResponse.redirect(`${SITE_URL}/login?error=invalid`);
  }

  try {
    const result = await redeemMagicLink(token);
    if (!result) {
      return NextResponse.redirect(`${SITE_URL}/login?error=expired`);
    }
    const store = await cookies();
    store.set(SESSION_COOKIE, result.sessionToken, sessionCookieOptions());
    return NextResponse.redirect(`${SITE_URL}/account`);
  } catch (err) {
    console.error("[auth] verify error:", err);
    return NextResponse.redirect(`${SITE_URL}/login?error=server`);
  }
}
