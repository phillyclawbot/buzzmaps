// Canonical site URL. Prefers env override for preview/staging, falls back to the
// production URL used across OG tags, sitemaps, JSON-LD, and email links.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://buzzmaps.vercel.app"
).replace(/\/$/, "");

export const SITE_NAME = "BuzzMaps";
export const SITE_TAGLINE = "Toronto's places, as told by the internet";
