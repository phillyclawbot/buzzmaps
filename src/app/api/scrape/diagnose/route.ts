import { PUBLICATION_FEEDS, parseRSS } from "@/lib/scrape-publications";

export const maxDuration = 120;

interface FeedResult {
  name: string;
  url: string;
  status: number | null;
  contentType: string | null;
  itemCount: number;
  sampleTitle: string | null;
  error: string | null;
}

export async function GET() {
  const results: FeedResult[] = [];
  let working = 0;

  for (const feed of PUBLICATION_FEEDS) {
    const result: FeedResult = {
      name: feed.name,
      url: feed.url,
      status: null,
      contentType: null,
      itemCount: 0,
      sampleTitle: null,
      error: null,
    };

    try {
      const res = await fetch(feed.url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; BuzzMaps/1.0; +https://buzzmaps.vercel.app)",
          Accept: "application/rss+xml, application/xml, text/xml, application/atom+xml, */*",
        },
        signal: AbortSignal.timeout(5000),
        redirect: "follow",
      });

      result.status = res.status;
      result.contentType = res.headers.get("content-type")?.split(";")[0] || null;

      if (!res.ok) {
        result.error = `HTTP ${res.status}`;
      } else {
        const xml = await res.text();
        const items = parseRSS(xml);
        result.itemCount = items.length;
        result.sampleTitle = items[0]?.title?.slice(0, 100) || null;
        if (items.length > 0) working++;
      }
    } catch (e) {
      result.error = String(e).slice(0, 120);
    }

    results.push(result);

    // Small delay to be polite
    await new Promise((r) => setTimeout(r, 300));
  }

  return Response.json({
    total: PUBLICATION_FEEDS.length,
    working,
    failed: PUBLICATION_FEEDS.length - working,
    feeds: results,
  });
}
