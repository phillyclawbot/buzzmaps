import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

/**
 * Returns a single random place — used by the "Take me somewhere new" CTA
 * and the command palette's "Random place" action.
 *
 * Prefers places with photos and at least one mention so the destination
 * has something to show. Falls back to any place.
 */
export async function GET() {
  try {
    const sql = getDb();

    const rows = (await sql`
      SELECT r.id, r.name, r.category, r.address
      FROM restaurants r
      WHERE r.photo_url IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM post_restaurants pr WHERE pr.restaurant_id = r.id
        )
      ORDER BY RANDOM()
      LIMIT 1
    `) as { id: number; name: string; category: string; address: string | null }[];

    if (rows.length === 0) {
      // Fallback: any place at all
      const fallback = (await sql`
        SELECT id, name, category, address FROM restaurants
        ORDER BY RANDOM()
        LIMIT 1
      `) as { id: number; name: string; category: string; address: string | null }[];

      if (fallback.length === 0) {
        return NextResponse.json({ error: "No places in the database" }, { status: 404 });
      }
      return NextResponse.json(fallback[0]);
    }

    return NextResponse.json(rows[0]);
  } catch (err) {
    console.error("[random] failed:", err);
    return NextResponse.json({ error: "Random place unavailable" }, { status: 500 });
  }
}
