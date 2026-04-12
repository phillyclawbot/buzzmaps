import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { SESSION_COOKIE, endSession } from "@/lib/auth";

export async function POST() {
  await endSession();
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  return NextResponse.json({ success: true });
}
