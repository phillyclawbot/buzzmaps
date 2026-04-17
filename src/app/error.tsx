"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle } from "@/lib/icons-lucide";
import GradientMesh from "@/components/ui/GradientMesh";

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
    <main
      className="min-h-screen flex items-center justify-center px-6 py-16 page-enter"
      style={{ background: "var(--bg)" }}
    >
      <GradientMesh tone="warm" />
      <div className="max-w-xl w-full text-center relative">
        <span
          aria-hidden
          className="inline-flex items-center justify-center mb-6"
          style={{
            width: 64,
            height: 64,
            borderRadius: "var(--radius-lg)",
            background: "var(--brand-tint)",
            color: "var(--brand)",
          }}
        >
          <AlertTriangle size={28} strokeWidth={2.2} />
        </span>
        <p className="eyebrow mb-3" style={{ color: "var(--brand)" }}>
          Detour
        </p>
        <h1
          className="font-display text-4xl sm:text-5xl"
          style={{
            color: "var(--fg)",
            fontWeight: 500,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
          }}
        >
          Something went off the map.
        </h1>
        <p
          className="mt-5 text-base"
          style={{ color: "var(--fg-muted)" }}
        >
          We hit an unexpected error loading this page. Try again, or head back
          to the map.
        </p>
        {error.digest && (
          <p
            className="mt-3 font-mono text-xs"
            style={{ color: "var(--fg-subtle)", letterSpacing: "0.04em" }}
          >
            ref: {error.digest}
          </p>
        )}

        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="btn-primary"
          >
            Try again
          </button>
          <Link href="/" className="btn-secondary">
            Back to the map
          </Link>
        </div>
      </div>
    </main>
  );
}
