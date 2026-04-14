/**
 * localStorage-backed "recently viewed places" ring buffer.
 *
 * Keyed off the place name (which is what we already route on at
 * /place/[name]). Kept small — 12 entries, oldest first out.
 *
 * Safe to call from client components. All reads/writes guard against
 * SSR / no-window / localStorage disabled.
 */

const KEY = "buzzmaps:recent-places:v1";
const MAX = 12;

export interface RecentPlace {
  name: string;
  category: string;
  viewedAt: number; // epoch ms
}

function readStorage(): RecentPlace[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (r): r is RecentPlace =>
        r &&
        typeof r.name === "string" &&
        typeof r.category === "string" &&
        typeof r.viewedAt === "number"
    );
  } catch {
    return [];
  }
}

function writeStorage(items: RecentPlace[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // localStorage full or disabled — silent no-op
  }
}

/** Get the current list, newest first, deduped by name. */
export function getRecentPlaces(): RecentPlace[] {
  return readStorage();
}

/** Record a visit to a place. Moves existing entries to the front. */
export function rememberPlace(name: string, category: string): void {
  const now = Date.now();
  const current = readStorage();
  const deduped = current.filter((r) => r.name.toLowerCase() !== name.toLowerCase());
  const next: RecentPlace[] = [{ name, category, viewedAt: now }, ...deduped].slice(0, MAX);
  writeStorage(next);
  // Fire a custom event so the header/palette can react live in the same tab.
  window.dispatchEvent(new CustomEvent("buzzmaps:recent-places:updated"));
}

/** Forget everything. Used by a "Clear history" affordance. */
export function clearRecentPlaces(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent("buzzmaps:recent-places:updated"));
}
