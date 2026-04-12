"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function CollectionsError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[buzzmaps:collections-error]", error);
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="max-w-lg w-full text-center">
        <div className="text-4xl mb-4" aria-hidden>
          📚
        </div>
        <h1 className="text-2xl font-bold text-slate-900">
          Couldn&apos;t load collections
        </h1>
        <p className="mt-3 text-slate-600">
          We had trouble fetching curated collections. Try again in a moment.
        </p>
        {error.digest ? (
          <p className="mt-2 text-xs text-slate-400 font-mono">ref: {error.digest}</p>
        ) : null}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-white font-semibold press-down"
          >
            Try again
          </button>
          <Link
            href="/"
            className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-slate-700 font-semibold press-down"
          >
            Back to map
          </Link>
        </div>
      </div>
    </main>
  );
}
