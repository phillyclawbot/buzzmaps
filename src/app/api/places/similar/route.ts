import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { checkRateLimit, clientIp, rateLimitResponse } from "@/lib/rate-limit";

// Returns up to 5 existing places whose names look similar to the query.
// Used by the submit form to surface "did you mean this one?" before the
// user commits a duplicate. ILIKE on a short prefix catches most typos,
// and pg_trgm could improve this later — intentionally keeping it simple.
export async function GET(req: Request) {
  // Light limit: this is called while typing, so be generous but not crazy.
  const rl = checkRateLimit(`similar:${clientIp(req)}`, 60, 60_000);
  if (!rl.allowed) return rateLimitResponse(rl);

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 80);
  if (q.length < 3) {
    return NextResponse.json({ matches: [] });
  }

  try {
    const sql = getDb();
    const rows = (await sql`
      SELECT id, name, address, category
      FROM restaurants
      WHERE name ILIKE ${`%${q}%`}
      ORDER BY
        CASE WHEN LOWER(name) = LOWER(${q}) THEN 0
             WHEN LOWER(name) LIKE LOWER(${q + "%"}) THEN 1
             ELSE 2 END,
        LENGTH(name) ASC
      LIMIT 5
    `) as {
      id: number;
      name: string;
      address: string | null;
      category: string | null;
    }[];
    return NextResponse.json({ matches: rows });
  } catch (err) {
    console.error("[similar] query error:", err);
    return NextResponse.json({ matches: [] });
  }
}
