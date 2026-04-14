import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { isSavedStatus, type SavedStatus } from "@/lib/saved-status";

/**
 * GET /api/saved
 * Returns the signed-in user's saved-places split by status:
 *   { wishlist: [id, ...], visited: [id, ...] }
 *
 * Callers that previously read `saved` can use
 * `[...wishlist, ...visited]` for the combined set.
 */
export async function GET() {
  const user = await getSession();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }
  const sql = getDb();
  const rows = (await sql`
    SELECT sp.restaurant_id AS id, sp.status
    FROM saved_places sp
    WHERE sp.user_id = ${user.id}
  `) as { id: number; status: string }[];

  const wishlist: number[] = [];
  const visited: number[] = [];
  for (const r of rows) {
    if (r.status === "visited") visited.push(r.id);
    else wishlist.push(r.id);
  }
  return NextResponse.json({ wishlist, visited });
}

/**
 * POST /api/saved
 * Body: { placeId: number; status?: "wishlist" | "visited" }
 *
 * Upserts the (user, place) row. If it already exists, updates its
 * status — which lets the "Mark visited" action on SaveButton promote
 * a wishlist entry without having to delete + re-insert.
 */
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
  const rawStatus = (body as { status?: unknown }).status;
  const status: SavedStatus = isSavedStatus(rawStatus) ? rawStatus : "wishlist";

  const sql = getDb();
  await sql`
    INSERT INTO saved_places (user_id, restaurant_id, status)
    VALUES (${user.id}, ${placeId}, ${status})
    ON CONFLICT (user_id, restaurant_id)
    DO UPDATE SET status = EXCLUDED.status
  `;
  return NextResponse.json({ success: true, status });
}

/**
 * DELETE /api/saved?placeId=123
 * Removes the row regardless of current status.
 */
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
