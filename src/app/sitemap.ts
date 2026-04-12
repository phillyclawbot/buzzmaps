import type { MetadataRoute } from "next";
import { getDb } from "@/lib/db";
import { SITE_URL } from "@/lib/site";
import { VALID_CATEGORIES } from "@/lib/constants";
import { COLLECTIONS } from "@/lib/collections";

// Revalidate the sitemap daily so new places get indexed without requiring a deploy.
export const revalidate = 86400;

const STATIC_ROUTES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "daily", priority: 1.0 },
  { path: "/collections", changeFrequency: "daily", priority: 0.9 },
  { path: "/digest", changeFrequency: "weekly", priority: 0.8 },
  { path: "/stats", changeFrequency: "daily", priority: 0.5 },
  { path: "/about", changeFrequency: "monthly", priority: 0.4 },
  { path: "/submit", changeFrequency: "monthly", priority: 0.4 },
  { path: "/search", changeFrequency: "weekly", priority: 0.5 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    lastModified: now,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  const categoryEntries: MetadataRoute.Sitemap = VALID_CATEGORIES.map((cat) => ({
    url: `${SITE_URL}/category/${cat}`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const collectionEntries: MetadataRoute.Sitemap = COLLECTIONS.map((col) => ({
    url: `${SITE_URL}/collections/${col.id}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  let placeEntries: MetadataRoute.Sitemap = [];
  try {
    const sql = getDb();
    const rows = (await sql`
      SELECT name, first_seen_at
      FROM restaurants
      ORDER BY first_seen_at DESC NULLS LAST
      LIMIT 50000
    `) as { name: string; first_seen_at: string | null }[];

    placeEntries = rows.map((r) => ({
      url: `${SITE_URL}/place/${encodeURIComponent(r.name)}`,
      lastModified: r.first_seen_at ? new Date(r.first_seen_at) : now,
      changeFrequency: "weekly",
      priority: 0.6,
    }));
  } catch (err) {
    // If the DB is unreachable, still serve the static portion rather than 500.
    console.error("[sitemap] failed to load places:", err);
  }

  return [
    ...staticEntries,
    ...categoryEntries,
    ...collectionEntries,
    ...placeEntries,
  ];
}
