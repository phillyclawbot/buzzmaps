"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import TopBar from "@/components/ui/TopBar";

interface Similar {
  id: number;
  name: string;
  address: string | null;
  category: string | null;
}

const CATEGORIES = [
  { value: "restaurant", label: "Restaurant" },
  { value: "bar", label: "Bar" },
  { value: "cafe", label: "Café" },
  { value: "shop", label: "Shop" },
  { value: "park", label: "Park" },
  { value: "gym", label: "Gym" },
  { value: "venue", label: "Venue" },
  { value: "other", label: "Other" },
];

export default function SubmitPage() {
  const [form, setForm] = useState({
    name: "",
    category: "restaurant",
    address: "",
    reason: "",
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ name: string; lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [similar, setSimilar] = useState<Similar[]>([]);
  const [dismissedDupes, setDismissedDupes] = useState(false);

  // Debounced "did you mean" lookup: nudges the user toward existing listings
  // before they create a duplicate.
  useEffect(() => {
    const name = form.name.trim();
    if (name.length < 3 || dismissedDupes) {
      setSimilar([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/places/similar?q=${encodeURIComponent(name)}`,
          { signal: ctrl.signal }
        );
        if (!res.ok) return;
        const data = await res.json();
        setSimilar(Array.isArray(data.matches) ? data.matches : []);
      } catch {
        // aborted or network — ignore
      }
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [form.name, dismissedDupes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/places/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Something went wrong. Please try again.");
        return;
      }
      setSuccess({ name: data.place.name, lat: data.place.lat, lng: data.place.lng });
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    background: "var(--bg-elevated)",
    color: "var(--fg)",
    border: "1px solid var(--border)",
    borderRadius: "var(--radius-sm)",
    fontFamily: "var(--font-serif)",
  };

  if (success) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: "var(--bg)" }}
      >
        <TopBar title="Submit" />
        <div className="max-w-lg w-full text-center pt-14 md:pt-0">
          <p className="eyebrow mb-3" style={{ color: "var(--brand)" }}>
            Filed
          </p>
          <h2
            className="font-display text-5xl md:text-6xl mb-4"
            style={{ color: "var(--fg)", fontWeight: 500, lineHeight: 1 }}
          >
            On the map.
          </h2>
          <p
            className="caption mb-10"
            style={{ color: "var(--fg-muted)" }}
          >
            <span style={{ color: "var(--fg)" }}>{success.name}</span> is now
            part of the BuzzMaps Toronto record.
          </p>
          <div className="flex flex-col items-center gap-4">
            <Link
              href={`/map?place=${encodeURIComponent(success.name)}`}
              className="font-display text-2xl ink-underline"
              style={{ color: "var(--brand)", fontWeight: 500 }}
            >
              See it on the map →
            </Link>
            <button
              onClick={() => {
                setSuccess(null);
                setForm({ name: "", category: "restaurant", address: "", reason: "" });
              }}
              className="font-serif italic text-base hover:underline"
              style={{ color: "var(--fg-muted)" }}
            >
              or add another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <TopBar title="Submit" />

      <article className="pt-14 md:pt-16 pb-24 max-w-xl mx-auto px-6 md:px-10 page-enter">
        <header
          className="text-center pt-10 pb-8 mb-10"
          style={{ borderBottom: "1px solid var(--fg)" }}
        >
          <p className="eyebrow mb-3" style={{ color: "var(--brand)" }}>
            Letter to the Editor
          </p>
          <h1
            className="font-display text-5xl md:text-6xl"
            style={{ color: "var(--fg)", fontWeight: 500, lineHeight: 1 }}
          >
            Submit a place.
          </h1>
          <p
            className="caption mt-4 max-w-md mx-auto"
            style={{ color: "var(--fg-muted)" }}
          >
            Know a spot we should know about? File it here.
          </p>
        </header>

        {error && (
          <div
            className="mb-6 p-4 text-sm"
            style={{
              background: "color-mix(in srgb, var(--sent-neg) 8%, transparent)",
              border: "1px solid color-mix(in srgb, var(--sent-neg) 25%, transparent)",
              color: "var(--sent-neg)",
              borderRadius: "var(--radius-sm)",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-7">
          {/* Place name */}
          <label className="block">
            <span
              className="eyebrow block mb-2"
              style={{ color: "var(--fg-muted)" }}
            >
              Place name <span style={{ color: "var(--brand)" }}>*</span>
            </span>
            <input
              type="text"
              required
              placeholder="e.g. Bar Raval, Cherry Street BBQ"
              value={form.name}
              onChange={(e) => {
                setForm({ ...form, name: e.target.value });
                setDismissedDupes(false);
              }}
              className="w-full px-4 py-3 text-base outline-none focus-ring"
              style={inputStyle}
            />
            {similar.length > 0 && !dismissedDupes && (
              <div
                className="mt-3 p-4"
                style={{
                  background: "var(--bg-sunken)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <p
                  className="eyebrow mb-2"
                  style={{ color: "var(--brand)" }}
                >
                  Already on file?
                </p>
                <p
                  className="caption mb-3"
                  style={{ color: "var(--fg-muted)" }}
                >
                  We found {similar.length} similar{" "}
                  {similar.length === 1 ? "place" : "places"}.
                </p>
                <ul className="space-y-1.5 mb-3">
                  {similar.map((m) => (
                    <li
                      key={m.id}
                      className="font-serif text-sm"
                      style={{ color: "var(--fg)" }}
                    >
                      <Link
                        href={`/place/${encodeURIComponent(m.name)}`}
                        className="ink-underline"
                      >
                        {m.name}
                      </Link>
                      {m.address && (
                        <span style={{ color: "var(--fg-muted)" }}>
                          {" "}— {m.address}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => setDismissedDupes(true)}
                  className="font-serif text-sm italic underline"
                  style={{ color: "var(--fg-muted)" }}
                >
                  None of these — add a new place
                </button>
              </div>
            )}
          </label>

          {/* Category */}
          <label className="block">
            <span
              className="eyebrow block mb-2"
              style={{ color: "var(--fg-muted)" }}
            >
              Category
            </span>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-4 py-3 text-base outline-none focus-ring cursor-pointer"
              style={inputStyle}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>

          {/* Address */}
          <label className="block">
            <span
              className="eyebrow block mb-2"
              style={{ color: "var(--fg-muted)" }}
            >
              Address or neighbourhood
            </span>
            <input
              type="text"
              placeholder="e.g. 505 College St, or Kensington Market"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-4 py-3 text-base outline-none focus-ring"
              style={inputStyle}
            />
          </label>

          {/* Reason */}
          <label className="block">
            <span
              className="eyebrow block mb-2 flex items-baseline justify-between"
              style={{ color: "var(--fg-muted)" }}
            >
              <span>Why do you recommend it?</span>
              <span className="dateline">{form.reason.length}/300</span>
            </span>
            <textarea
              placeholder="What makes this place worth visiting?"
              value={form.reason}
              maxLength={300}
              rows={4}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              className="w-full px-4 py-3 text-base outline-none focus-ring resize-none"
              style={inputStyle}
            />
          </label>

          <button
            type="submit"
            disabled={loading || !form.name.trim()}
            className="w-full py-4 text-sm font-semibold press-down transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: "var(--ink)",
              color: "var(--ink-inverse)",
              borderRadius: "var(--radius-sm)",
              letterSpacing: "0.04em",
            }}
          >
            {loading ? "Filing…" : "FILE IT"}
          </button>
        </form>
      </article>
    </div>
  );
}
