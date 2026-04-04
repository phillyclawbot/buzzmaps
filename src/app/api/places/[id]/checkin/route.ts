import { getDb } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const placeId = parseInt(id, 10);
  if (isNaN(placeId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const sql = getDb();

  // Ensure column exists
  await sql`
    ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS checkin_count INTEGER DEFAULT 0
  `;

  const result = await sql`
    UPDATE restaurants
    SET checkin_count = COALESCE(checkin_count, 0) + 1
    WHERE id = ${placeId}
    RETURNING checkin_count
  `;

  if (!result.length) {
    return NextResponse.json({ error: "Place not found" }, { status: 404 });
  }

  return NextResponse.json({ checkin_count: result[0].checkin_count });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const placeId = parseInt(id, 10);
  if (isNaN(placeId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const sql = getDb();

  // Ensure column exists
  await sql`
    ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS checkin_count INTEGER DEFAULT 0
  `;

  const result = await sql`
    SELECT COALESCE(checkin_count, 0) as checkin_count FROM restaurants WHERE id = ${placeId}
  `;

  if (!result.length) {
    return NextResponse.json({ error: "Place not found" }, { status: 404 });
  }

  return NextResponse.json({ checkin_count: result[0].checkin_count });
}
