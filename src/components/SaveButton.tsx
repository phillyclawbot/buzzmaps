"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Renders a "Save" toggle. Expects the server component to have determined
// whether the viewer is signed in and (if so) whether this place is saved.
// If signed-out, the button becomes a link to /login.
export default function SaveButton({
  placeId,
  signedIn,
  initiallySaved,
}: {
  placeId: number;
  signedIn: boolean;
  initiallySaved: boolean;
}) {
  const [saved, setSaved] = useState(initiallySaved);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSaved(initiallySaved);
  }, [initiallySaved]);

  if (!signedIn) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(
          typeof window !== "undefined" ? window.location.pathname : "/"
        )}`}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border bg-white border-slate-200 text-slate-600 hover:border-[#ff6b35] hover:text-[#ff6b35]"
      >
        <span>🔖</span>
        <span>Sign in to save</span>
      </Link>
    );
  }

  const toggle = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (saved) {
        const res = await fetch(`/api/saved?placeId=${placeId}`, {
          method: "DELETE",
        });
        if (res.ok) setSaved(false);
      } else {
        const res = await fetch("/api/saved", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ placeId }),
        });
        if (res.ok) setSaved(true);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      aria-pressed={saved}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border ${
        saved
          ? "bg-[#ff6b35]/10 border-[#ff6b35]/40 text-[#ff6b35]"
          : "bg-white border-slate-200 text-slate-600 hover:border-[#ff6b35] hover:text-[#ff6b35]"
      } ${busy ? "opacity-60 cursor-wait" : ""}`}
    >
      <span>{saved ? "⭐" : "🔖"}</span>
      <span>{saved ? "Saved" : "Save"}</span>
    </button>
  );
}
