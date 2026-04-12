import { getDb } from "@/lib/db";
import { SITE_URL, SITE_NAME, SITE_TAGLINE } from "@/lib/site";

// Refresh at most once per hour so crawlers don't hammer the DB.
export const revalidate = 3600;

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

interface FeedRow {
  name: string;
  address: string | null;
  category: string | null;
  first_seen_at: string | null;
  mention_count: number;
}

export async function GET() {
  const sql = getDb();
  let rows: FeedRow[] = [];
  try {
    rows = (await sql`
      SELECT r.name, r.address, r.category, r.first_seen_at,
        (SELECT COUNT(*)::int FROM post_restaurants WHERE restaurant_id = r.id) AS mention_count
      FROM restaurants r
      WHERE r.first_seen_at IS NOT NULL
      ORDER BY r.first_seen_at DESC
      LIMIT 50
    `) as FeedRow[];
  } catch (err) {
    console.error("[feed] failed to load places:", err);
  }

  const updated = rows[0]?.first_seen_at
    ? new Date(rows[0].first_seen_at).toISOString()
    : new Date().toISOString();

  const entries = rows
    .map((r) => {
      const url = `${SITE_URL}/place/${encodeURIComponent(r.name)}`;
      const published = r.first_seen_at
        ? new Date(r.first_seen_at).toISOString()
        : updated;
      const summary = [
        r.address ? r.address : null,
        r.category ? `Category: ${r.category}` : null,
        r.mention_count
          ? `${r.mention_count} mention${r.mention_count === 1 ? "" : "s"} across Reddit & local blogs`
          : null,
      ]
        .filter(Boolean)
        .join(" · ");

      return `  <entry>
    <id>${xmlEscape(url)}</id>
    <title>${xmlEscape(r.name)}</title>
    <link href="${xmlEscape(url)}" />
    <updated>${published}</updated>
    <published>${published}</published>
    <summary>${xmlEscape(summary || `New place added to ${SITE_NAME}.`)}</summary>
  </entry>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>${xmlEscape(`${SITE_NAME} — New places`)}</title>
  <subtitle>${xmlEscape(SITE_TAGLINE)}</subtitle>
  <link href="${SITE_URL}/feed.xml" rel="self" />
  <link href="${SITE_URL}" />
  <id>${SITE_URL}/feed.xml</id>
  <updated>${updated}</updated>
${entries}
</feed>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/atom+xml; charset=utf-8",
    },
  });
}
