import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";

export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const sql = getDb();
  const rows = await sql`
    SELECT sp.restaurant_id AS id
    FROM saved_places sp
    WHERE sp.user_id = ${user.id}
  `;
  return NextResponse.json({
    saved: (rows as { id: number }[]).map((r) => r.id),
  });
}

export async function POST(req: Request) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const placeId = Number((body as { placeId?: unknown }).placeId);
  if (!Number.isFinite(placeId) || placeId <= 0) {
    return NextResponse.json({ error: "Invalid placeId" }, { status: 400 });
  }
  const sql = getDb();
  await sql`
    INSERT INTO saved_places (user_id, restaurant_id)
    VALUES (${user.id}, ${placeId})
    ON CONFLICT DO NOTHING
  `;
  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const url = new URL(req.url);
  const placeId = Number(url.searchParams.get("placeId"));
  if (!Number.isFinite(placeId) || placeId <= 0) {
    return NextResponse.json({ error: "Invalid placeId" }, { status: 400 });
  }
  const sql = getDb();
  await sql`
    DELETE FROM saved_places
    WHERE user_id = ${user.id} AND restaurant_id = ${placeId}
  `;
  return NextResponse.json({ success: true });
}
