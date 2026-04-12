"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Similar {
  id: number;
  name: string;
  address: string | null;
  category: string | null;
}

const CATEGORIES = [
  { value: "restaurant", label: "🍽️ Restaurant" },
  { value: "bar", label: "🍺 Bar" },
  { value: "cafe", label: "☕ Cafe" },
  { value: "shop", label: "🛍️ Shop" },
  { value: "park", label: "🌳 Park" },
  { value: "gym", label: "🏋️ Gym" },
  { value: "venue", label: "⭐ Venue" },
  { value: "other", label: "📍 Other" },
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

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">📍</div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Pin Added!</h2>
          <p className="text-slate-500 text-sm mb-1">
            <span className="font-semibold text-[#ff6b35]">{success.name}</span> has been added to the map.
          </p>
          <p className="text-slate-400 text-xs mb-6">It&apos;s now visible to everyone on BuzzMaps Toronto.</p>
          <div className="flex flex-col gap-3">
            <Link
              href={`/?place=${encodeURIComponent(success.name)}`}
              className="block w-full px-4 py-3 bg-gradient-to-r from-[#ff6b35] to-[#ea580c] text-white font-semibold rounded-xl text-sm hover:opacity-90 transition-opacity"
            >
              View on Map →
            </Link>
            <button
              onClick={() => {
                setSuccess(null);
                setForm({ name: "", category: "restaurant", address: "", reason: "" });
              }}
              className="block w-full px-4 py-3 bg-slate-100 text-slate-600 font-medium rounded-xl text-sm hover:bg-slate-200 transition-colors"
            >
              Add Another Place
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 h-12 bg-white/95 backdrop-blur-sm border-b border-slate-200 z-[1000] flex items-center px-4 gap-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff6b35] shrink-0" />
          <div className="flex flex-col leading-none">
            <span className="font-semibold text-sm tracking-tight bg-gradient-to-r from-[#ff6b35] to-[#f59e0b] bg-clip-text text-transparent leading-tight">BuzzMaps</span>
            <span className="text-[10px] text-slate-400 leading-tight">Toronto</span>
          </div>
        </Link>
        <span className="text-slate-300 mx-1">›</span>
        <span className="text-sm font-medium text-slate-600">Submit a Place</span>
        <Link href="/" className="ml-auto text-sm text-slate-500 hover:text-slate-900 transition-colors">
          ← Back to map
        </Link>
      </div>

      <div className="pt-20 pb-20 px-4 flex justify-center">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-lg w-full">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-slate-900 mb-1">Add a Place to BuzzMaps</h1>
            <p className="text-sm text-slate-500">Know a great spot in Toronto? Share it with the community.</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Place name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Place Name <span className="text-[#ff6b35]">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Bar Raval, Cherry Street BBQ"
                value={form.name}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value });
                  setDismissedDupes(false);
                }}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#ff6b35] transition-colors"
              />
              {similar.length > 0 && !dismissedDupes && (
                <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                  <div className="flex items-start gap-2">
                    <span>🤔</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-amber-900">
                        Already on the map?
                      </p>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        We found {similar.length} similar place
                        {similar.length === 1 ? "" : "s"}. If one of these is
                        yours, visit it instead of adding a duplicate.
                      </p>
                      <ul className="mt-2 space-y-1">
                        {similar.map((m) => (
                          <li key={m.id}>
                            <Link
                              href={`/place/${encodeURIComponent(m.name)}`}
                              className="text-xs font-medium text-amber-900 underline"
                            >
                              {m.name}
                            </Link>
                            {m.address ? (
                              <span className="text-[11px] text-amber-700">
                                {" "}
                                — {m.address}
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                      <button
                        type="button"
                        onClick={() => setDismissedDupes(true)}
                        className="mt-2 text-[11px] font-semibold text-amber-900 underline"
                      >
                        None of these — add a new place
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 outline-none focus:border-[#ff6b35] transition-colors cursor-pointer"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Address or Neighbourhood</label>
              <input
                type="text"
                placeholder="e.g. 505 College St, or Kensington Market"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#ff6b35] transition-colors"
              />
            </div>

            {/* Reason */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Why do you recommend it?
                <span className="font-normal text-slate-400 ml-1">({form.reason.length}/300)</span>
              </label>
              <textarea
                placeholder="What makes this place worth visiting?"
                value={form.reason}
                maxLength={300}
                rows={3}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#ff6b35] transition-colors resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !form.name.trim()}
              className="w-full px-4 py-3 bg-gradient-to-r from-[#ff6b35] to-[#ea580c] text-white font-semibold rounded-xl text-sm hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Adding to map..." : "➕ Add to BuzzMaps"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
