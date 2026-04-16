"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Bookmark, BookmarkCheck, Check, LogIn } from "lucide-react";
import { useConfetti } from "@/components/ui/Confetti";
import type { SavedStatus } from "@/lib/saved-status";

/**
 * Save / visited toggle. Three visual states, celebration on first save.
 */
export default function SaveButton({
  placeId,
  signedIn,
  initialStatus = null,
}: {
  placeId: number;
  signedIn: boolean;
  initialStatus?: SavedStatus | null;
}) {
  const [status, setStatus] = useState<SavedStatus | null>(initialStatus);
  const [busy, setBusy] = useState(false);
  const fire = useConfetti();

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  if (!signedIn) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(
          typeof window !== "undefined" ? window.location.pathname : "/"
        )}`}
        className="btn-secondary"
      >
        <LogIn size={15} />
        Sign in to save
      </Link>
    );
  }

  const doPost = async (next: SavedStatus, celebrate = false) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId, status: next }),
      });
      if (res.ok) {
        setStatus(next);
        if (celebrate) fire();
      }
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

  // UNSAVED → primary "Save"
  if (status === null) {
    return (
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.95 }}
        type="button"
        onClick={() => doPost("wishlist", true)}
        disabled={busy}
        className="btn-primary disabled:opacity-60"
        aria-label="Save to wishlist"
      >
        <Bookmark size={15} strokeWidth={2.3} />
        {busy ? "Saving…" : "Save"}
      </motion.button>
    );
  }

  // WISHLIST → Saved chip + mark visited
  if (status === "wishlist") {
    return (
      <div className="inline-flex items-center gap-2">
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.95 }}
          type="button"
          onClick={doDelete}
          disabled={busy}
          className="btn-secondary"
          style={{
            background: "var(--brand-tint)",
            color: "var(--brand-hover)",
            borderColor: "var(--brand-tint-strong)",
          }}
          aria-label="Remove from wishlist"
        >
          <BookmarkCheck size={15} strokeWidth={2.3} />
          Saved
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.95 }}
          type="button"
          onClick={() => doPost("visited", true)}
          disabled={busy}
          className="btn-secondary"
          aria-label="Mark as visited"
        >
          <Check size={15} strokeWidth={2.3} />
          Mark visited
        </motion.button>
      </div>
    );
  }

  // VISITED
  return (
    <div className="inline-flex items-center gap-2">
      <span
        className="btn-secondary"
        style={{
          background: "color-mix(in srgb, var(--sent-pos) 12%, transparent)",
          color: "var(--sent-pos)",
          borderColor: "color-mix(in srgb, var(--sent-pos) 30%, transparent)",
        }}
      >
        <Check size={15} strokeWidth={2.5} />
        Visited
      </span>
      <motion.button
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.95 }}
        type="button"
        onClick={doDelete}
        disabled={busy}
        className="btn-ghost"
        aria-label="Remove from visited"
      >
        Remove
      </motion.button>
    </div>
  );
}
