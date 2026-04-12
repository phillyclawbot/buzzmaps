import { NextResponse } from "next/server";
import { getDb, runMigrations } from "@/lib/db";
import { checkRateLimit, clientIp, rateLimitResponse } from "@/lib/rate-limit";

const VALID_REASONS = new Set([
  "incorrect_info",
  "wrong_location",
  "duplicate",
  "closed",
  "spam",
  "other",
]);

export async function POST(req: Request) {
  // Cap 5 reports / hour / IP. Legitimate users never send that many; this
  // stops a drive-by from flooding the moderation queue.
  const rl = checkRateLimit(`report:${clientIp(req)}`, 5, 60 * 60_000);
  if (!rl.allowed) return rateLimitResponse(rl);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { placeId, reason, details } = body as {
    placeId?: unknown;
    reason?: unknown;
    details?: unknown;
  };

  const id = typeof placeId === "number" ? placeId : parseInt(String(placeId), 10);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid placeId" }, { status: 400 });
  }
  const reasonStr = typeof reason === "string" ? reason : "";
  if (!VALID_REASONS.has(reasonStr)) {
    return NextResponse.json({ error: "Invalid reason" }, { status: 400 });
  }
  const detailsStr =
    typeof details === "string" ? details.slice(0, 500) : null;

  try {
    await runMigrations();
    const sql = getDb();
    await sql`
      INSERT INTO place_reports (restaurant_id, reason, details, reporter_ip)
      VALUES (${id}, ${reasonStr}, ${detailsStr}, ${clientIp(req)})
    `;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[reports] insert error:", err);
    return NextResponse.json(
      { error: "Couldn't save report." },
      { status: 500 }
    );
  }
}
