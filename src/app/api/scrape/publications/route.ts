import { scrapePublications } from "@/lib/scrape-publications";

export async function GET() {
  try {
    const result = await scrapePublications();
    return Response.json({ success: true, ...result });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
