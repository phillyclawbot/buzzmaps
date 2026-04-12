"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Status = "idle" | "loading" | "success" | "error";

export default function DigestSubscribeForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const params = useSearchParams();

  // Pick up confirm / unsubscribe callbacks from the email links so the
  // subscriber gets a friendly message inline.
  useEffect(() => {
    const confirm = params.get("confirm");
    const unsub = params.get("unsub");
    if (confirm === "ok") {
      setStatus("success");
      setMessage("You're confirmed! Next Monday's digest is on its way.");
    } else if (confirm === "invalid") {
      setStatus("error");
      setMessage("That confirmation link is invalid or already used.");
    } else if (confirm === "error") {
      setStatus("error");
      setMessage("Something went wrong confirming your email.");
    } else if (unsub === "ok") {
      setStatus("success");
      setMessage("You've been unsubscribed. Sorry to see you go!");
    } else if (unsub === "invalid") {
      setStatus("error");
      setMessage("That unsubscribe link is invalid.");
    }
  }, [params]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || status === "loading") return;
    setStatus("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/digest/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setStatus("error");
        setMessage(data.error || "Couldn't subscribe. Please try again.");
        return;
      }
      setStatus("success");
      setMessage(data.message || "Thanks! Check your inbox.");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  };

  return (
    <div>
      <form onSubmit={onSubmit} className="flex gap-2 max-w-sm mx-auto">
        <input
          type="email"
          required
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === "loading"}
          className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-900 placeholder-slate-300 outline-none focus:border-[#ff6b35] transition-colors disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={status === "loading" || !email.trim()}
          className="px-4 py-2 text-sm font-semibold text-white rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(135deg, #ff6b35 0%, #ea580c 100%)",
          }}
        >
          {status === "loading" ? "…" : "Subscribe"}
        </button>
      </form>
      {message ? (
        <p
          className={`text-[11px] mt-2 ${
            status === "error" ? "text-red-500" : "text-slate-500"
          }`}
        >
          {message}
        </p>
      ) : (
        <p className="text-[10px] text-slate-400 mt-2">
          Confirmation link sent to your inbox. One email per week, easy to
          unsubscribe.
        </p>
      )}
    </div>
  );
}
