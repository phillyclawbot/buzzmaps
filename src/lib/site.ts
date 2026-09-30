// Canonical site URL. Prefers env override for preview/staging, falls back to the
// production URL used across OG tags, sitemaps, JSON-LD, and email links.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://buzzmaps.vercel.app"
).replace(/\/$/, "");

// Client-side CARTO basemap key; visible in tile requests, restrict by domain in the CARTO dashboard.
export const CARTO_API_KEY =
  process.env.NEXT_PUBLIC_CARTO_API_KEY ?? "cb1_455e_1_49d8bb0d8058e796adaf61a4";

export const SITE_NAME = "BuzzMaps";
export const SITE_TAGLINE = "Toronto's places, as told by the internet";
