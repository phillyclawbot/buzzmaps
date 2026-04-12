import { scrapePublications } from "@/lib/scrape-publications";
import { requireAdmin } from "@/lib/admin-auth";

export async function GET(req: Request) {
  const denied = requireAdmin(req);
  if (denied) return denied;
  try {
    const result = await scrapePublications();
    return Response.json({ success: true, ...result });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
