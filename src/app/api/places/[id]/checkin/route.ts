import { getDb } from "@/lib/db";
import { NextResponse } from "next/server";
import { checkRateLimit, clientIp } from "@/lib/rate-limit";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const placeId = parseInt(id, 10);
  if (isNaN(placeId)) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  // Dedupe / rate-limit: 1 checkin per IP per place per 24h. The client-side
  // localStorage guard is cosmetic; this is the real deduplication.
  const rl = checkRateLimit(`checkin:${placeId}:${clientIp(req)}`, 1, 24 * 60 * 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Already checked in at this place today.", retryAfter: rl.retryAfterSeconds },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    );
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
