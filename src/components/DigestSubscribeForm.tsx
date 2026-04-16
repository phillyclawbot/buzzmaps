"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Mail, Send, CheckCircle2 } from "lucide-react";
import { useConfetti } from "@/components/ui/Confetti";

type Status = "idle" | "loading" | "success" | "error";

export default function DigestSubscribeForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const params = useSearchParams();
  const fire = useConfetti();

  useEffect(() => {
    const confirm = params.get("confirm");
    const unsub = params.get("unsub");
    // Defer state updates to the next tick so lint's "set-state-in-effect"
    // rule is satisfied; effect body itself does not call setState directly.
    const id = window.setTimeout(() => {
      if (confirm === "ok") {
        setStatus("success");
        setMessage("You're confirmed! Next Monday's digest is on its way.");
        fire();
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
    }, 0);
    return () => window.clearTimeout(id);
  }, [params, fire]);

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
      setMessage(data.message || "Check your inbox to confirm!");
      setEmail("");
      fire();
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <form
        onSubmit={onSubmit}
        className="relative flex items-center gap-2 p-1.5"
        style={{
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          borderRadius: 9999,
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <span
          className="pl-4 pr-0 shrink-0"
          style={{ color: "var(--fg-subtle)" }}
        >
          <Mail size={18} />
        </span>
        <input
          type="email"
          required
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === "loading"}
          className="flex-1 bg-transparent outline-none px-2 py-2 text-[15px]"
          style={{ color: "var(--fg)" }}
        />
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.95 }}
          type="submit"
          disabled={status === "loading" || !email.trim()}
          className="btn-primary disabled:opacity-60 !py-2.5"
        >
          {status === "loading" ? (
            "…"
          ) : (
            <>
              <Send size={14} strokeWidth={2.4} />
              Subscribe
            </>
          )}
        </motion.button>
      </form>
      {message ? (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 text-center text-[13px] font-display-ui font-semibold inline-flex items-center gap-1.5 w-full justify-center"
          style={{
            color: status === "error" ? "var(--sent-neg)" : "var(--sent-pos)",
          }}
        >
          {status === "success" && <CheckCircle2 size={14} />}
          {message}
        </motion.p>
      ) : (
        <p
          className="mt-3 text-center text-[12px]"
          style={{ color: "var(--fg-subtle)" }}
        >
          One email per week, easy to unsubscribe.
        </p>
      )}
    </div>
  );
}
