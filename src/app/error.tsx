"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[buzzmaps:error]", error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="max-w-xl w-full text-center">
        <div
          className="inline-flex items-center justify-center w-20 h-20 rounded-full mb-6"
          style={{ background: "rgba(239,68,68,0.12)" }}
        >
          <span className="text-4xl" aria-hidden>
            ⚠️
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
          Something went off the map
        </h1>
        <p className="mt-4 text-slate-600 text-base">
          We hit an unexpected error loading this page. You can try again, or head
          back to the map.
        </p>
        {error.digest ? (
          <p className="mt-2 text-xs text-slate-400 font-mono">
            ref: {error.digest}
          </p>
        ) : null}

        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="rounded-full bg-[var(--accent)] px-6 py-3 text-white font-semibold shadow-sm hover:brightness-95 press-down"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-full border border-slate-200 bg-white px-6 py-3 text-slate-700 font-semibold hover:border-slate-300 press-down"
          >
            Back to the map
          </Link>
        </div>
      </div>
    </main>
  );
}
