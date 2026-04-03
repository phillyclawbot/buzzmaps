import { runMigrations } from "@/lib/db";

export async function GET() {
  try {
    await runMigrations();
    return Response.json({ success: true, message: "Migrations complete" });
  } catch (err) {
    return Response.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}
