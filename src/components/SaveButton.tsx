"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { SavedStatus } from "@/lib/saved-status";

/**
 * Editorial save control with three visual states:
 *
 *   null (unsaved)   → "Save"  ← primary action adds to wishlist
 *   "wishlist"       → "Saved · Mark visited"
 *                        primary (underlined) removes · secondary promotes
 *   "visited"        → "Visited · Remove"
 *                        primary shows state · secondary deletes
 *
 * Plain text, ink-underline hover, no pills, no emoji. Inline checkmark
 * SVG for the Visited state.
 *
 * Signed-out users see a "Sign in to save" link pointing back at the
 * current page.
 */
export default function SaveButton({
  placeId,
  signedIn,
  initialStatus = null,
}: {
  placeId: number;
  signedIn: boolean;
  /** Current saved status from the server; null if not saved */
  initialStatus?: SavedStatus | null;
}) {
  const [status, setStatus] = useState<SavedStatus | null>(initialStatus);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  if (!signedIn) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(
          typeof window !== "undefined" ? window.location.pathname : "/"
        )}`}
        className="eyebrow ink-underline"
        style={{ color: "var(--fg-muted)" }}
      >
        Sign in to save
      </Link>
    );
  }

  const doPost = async (next: SavedStatus) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId, status: next }),
      });
      if (res.ok) setStatus(next);
    } finally {
      setBusy(false);
    }
  };

  const doDelete = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/saved?placeId=${placeId}`, {
        method: "DELETE",
      });
      if (res.ok) setStatus(null);
    } finally {
      setBusy(false);
    }
  };

  // UNSAVED
  if (status === null) {
    return (
      <button
        type="button"
        onClick={() => doPost("wishlist")}
        disabled={busy}
        aria-label="Save to wishlist"
        className="eyebrow ink-underline press-down disabled:opacity-50"
        style={{ color: "var(--fg-muted)" }}
      >
        {busy ? "Saving…" : "Save"}
      </button>
    );
  }

  // WISHLIST: primary removes, secondary promotes to visited
  if (status === "wishlist") {
    return (
      <span className="inline-flex items-baseline gap-4">
        <button
          type="button"
          onClick={doDelete}
          disabled={busy}
          aria-label="Remove from wishlist"
          className="eyebrow ink-underline press-down disabled:opacity-50"
          style={{ color: "var(--brand)" }}
        >
          Saved
        </button>
        <span
          aria-hidden="true"
          className="dateline"
          style={{ color: "var(--fg-faint)" }}
        >
          ·
        </span>
        <button
          type="button"
          onClick={() => doPost("visited")}
          disabled={busy}
          aria-label="Mark as visited"
          className="eyebrow ink-underline press-down disabled:opacity-50"
          style={{ color: "var(--fg-muted)" }}
        >
          Mark visited
        </button>
      </span>
    );
  }

  // VISITED: primary shows state, secondary removes
  return (
    <span className="inline-flex items-baseline gap-4">
      <span
        className="eyebrow inline-flex items-center gap-1.5"
        style={{ color: "var(--sent-pos)" }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Visited
      </span>
      <span
        aria-hidden="true"
        className="dateline"
        style={{ color: "var(--fg-faint)" }}
      >
        ·
      </span>
      <button
        type="button"
        onClick={doDelete}
        disabled={busy}
        aria-label="Remove from visited"
        className="eyebrow ink-underline press-down disabled:opacity-50"
        style={{ color: "var(--fg-muted)" }}
      >
        Remove
      </button>
    </span>
  );
}
