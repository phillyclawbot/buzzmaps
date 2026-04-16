"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Flag, X } from "lucide-react";

const REASONS: { id: string; label: string }[] = [
  { id: "incorrect_info", label: "Incorrect info" },
  { id: "wrong_location", label: "Wrong location" },
  { id: "duplicate", label: "Duplicate listing" },
  { id: "closed", label: "Closed / no longer exists" },
  { id: "spam", label: "Spam / not a real place" },
  { id: "other", label: "Something else" },
];

type Status = "idle" | "sending" | "sent" | "error";

export default function ReportButton({ placeId }: { placeId: number }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0].id);
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setMessage(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ placeId, reason, details: details || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        setStatus("error");
        setMessage(data.error || "Couldn't submit report. Try again later.");
        return;
      }
      setStatus("sent");
      setMessage("Thanks — we'll take a look.");
      setDetails("");
    } catch {
      setStatus("error");
      setMessage("Network error. Try again later.");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setStatus("idle");
          setMessage(null);
        }}
        className="btn-ghost"
      >
        <Flag size={15} />
        Report
      </button>

      <AnimatePresence>
        {open && (
          <div
            className="fixed inset-0 z-[1200] flex items-center justify-center px-4"
            onClick={() => setOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Report this place"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
              style={{
                background: "rgba(15, 20, 25, 0.45)",
                backdropFilter: "blur(6px)",
              }}
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md p-6"
              style={{
                background: "var(--bg-elevated)",
                borderRadius: "var(--radius-xl)",
                boxShadow: "var(--shadow-lg)",
                border: "1px solid var(--border)",
              }}
            >
              <div className="flex items-start justify-between">
                <h3
                  className="font-display text-2xl"
                  style={{
                    color: "var(--fg)",
                    fontWeight: 600,
                    letterSpacing: "-0.01em",
                  }}
                >
                  Report this place
                </h3>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="btn-ghost !p-1.5 !rounded-full"
                >
                  <X size={18} />
                </button>
              </div>
              <p
                className="text-[13.5px] mt-1"
                style={{ color: "var(--fg-muted)" }}
              >
                Help us keep BuzzMaps accurate. We&apos;ll review your report.
              </p>

              {status === "sent" ? (
                <div
                  className="mt-5 p-4"
                  style={{
                    background: "color-mix(in srgb, var(--sent-pos) 12%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--sent-pos) 30%, transparent)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--sent-pos)",
                  }}
                >
                  <p className="font-display-ui font-semibold">{message}</p>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="mt-3 btn-ghost !px-0"
                    style={{ color: "var(--sent-pos)" }}
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
                  <label className="block">
                    <span className="eyebrow block mb-2">What&apos;s wrong?</span>
                    <select
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="w-full px-4 py-3 text-[15px] outline-none focus-ring"
                      style={{
                        background: "var(--bg-elevated)",
                        color: "var(--fg)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-md)",
                      }}
                    >
                      {REASONS.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="eyebrow flex items-center justify-between mb-2">
                      <span>Details</span>
                      <span style={{ color: "var(--fg-subtle)" }}>
                        {details.length}/500
                      </span>
                    </span>
                    <textarea
                      value={details}
                      maxLength={500}
                      rows={3}
                      onChange={(e) => setDetails(e.target.value)}
                      placeholder="Optional — tell us more so we can fix it faster."
                      className="w-full px-4 py-3 text-[15px] outline-none focus-ring resize-none"
                      style={{
                        background: "var(--bg-elevated)",
                        color: "var(--fg)",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius-md)",
                      }}
                    />
                  </label>

                  {message && status === "error" && (
                    <p
                      className="text-[13px]"
                      style={{ color: "var(--sent-neg)" }}
                    >
                      {message}
                    </p>
                  )}

                  <div className="flex gap-2 justify-end">
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="btn-ghost"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={status === "sending"}
                      className="btn-primary disabled:opacity-60"
                    >
                      {status === "sending" ? "Sending…" : "Submit report"}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
