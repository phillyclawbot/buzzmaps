import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BuzzMaps Toronto",
    short_name: "BuzzMaps",
    description: "Toronto's places, as told by Reddit",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ff6b35",
    icons: [
      // icon.tsx generates a 512x512 PNG at /icon
      { src: "/icon", sizes: "512x512", type: "image/png", purpose: "any" },
      // apple-icon.tsx generates a 180x180 PNG at /apple-icon
      { src: "/apple-icon", sizes: "180x180", type: "image/png", purpose: "any" },
    ],
  };
}
