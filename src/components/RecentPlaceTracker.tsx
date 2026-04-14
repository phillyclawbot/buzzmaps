"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { rememberPlace } from "@/lib/recent-places";

/**
 * Watches the URL and — when the user lands on /place/[name] — records
 * that visit in the localStorage "recent places" ring buffer.
 *
 * Categories aren't on the URL, so we leave category empty ("" resolves
 * to the CategoryIcon fallback). That keeps this tracker side-effect-
 * free; no DB call, no prop drilling.
 */
export default function RecentPlaceTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const match = /^\/place\/([^/?#]+)/.exec(pathname || "");
    if (!match) return;
    try {
      const name = decodeURIComponent(match[1]);
      if (name) rememberPlace(name, "place");
    } catch {
      // malformed URI — ignore
    }
  }, [pathname]);

  return null;
}
