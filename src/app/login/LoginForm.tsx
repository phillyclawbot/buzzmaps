"use client";

import { useState } from "react";

export default function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/request-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setError(data.error || "Couldn't send link.");
        return;
      }
      setSent(true);
    } catch {
      setError("Network error. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="mt-6 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
        Check your inbox for a sign-in link. It expires in 20 minutes.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
      <label className="text-xs font-semibold text-slate-700">Email</label>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#ff6b35] transition-colors"
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={loading || !email.trim()}
        className="w-full px-4 py-2.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-[#ff6b35] to-[#ea580c] disabled:opacity-60"
      >
        {loading ? "Sending link…" : "Email me a sign-in link"}
      </button>
    </form>
  );
}
