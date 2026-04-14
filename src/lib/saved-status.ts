/**
 * Saved-places status — one of two buckets a user can file a place into.
 *
 *   wishlist → "I want to go here"
 *   visited  → "I've been here"
 *
 * Default on the DB column is 'wishlist' so that legacy rows (saved
 * before this column existed) keep appearing in the user's Want-to-go
 * list without any backfill migration.
 *
 * Used by:
 *   - src/app/api/saved/route.ts
 *   - src/components/SaveButton.tsx
 *   - src/app/account/page.tsx
 *   - src/app/place/[name]/page.tsx (to pre-fill the button state)
 */

export type SavedStatus = "wishlist" | "visited";

export const SAVED_STATUSES: readonly SavedStatus[] = [
  "wishlist",
  "visited",
] as const;

export function isSavedStatus(x: unknown): x is SavedStatus {
  return x === "wishlist" || x === "visited";
}

export function statusLabel(s: SavedStatus): string {
  return s === "visited" ? "Visited" : "Want to go";
}

export function statusVerbPast(s: SavedStatus): string {
  return s === "visited" ? "marked visited" : "saved";
}
