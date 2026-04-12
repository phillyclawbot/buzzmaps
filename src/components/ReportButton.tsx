"use client";

import { useState } from "react";

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
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all border bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700"
      >
        <span>🚩</span>
        <span>Report</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[1200] flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h3 className="font-bold text-slate-900">Report this place</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Help us keep BuzzMaps accurate. We&apos;ll review your report.
            </p>

            {status === "sent" ? (
              <div className="mt-5 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
                {message}
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="text-xs font-semibold text-green-700 underline"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
                <label className="text-xs font-semibold text-slate-700">
                  What&apos;s wrong?
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 outline-none focus:border-[#ff6b35]"
                >
                  {REASONS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>

                <label className="text-xs font-semibold text-slate-700">
                  Details{" "}
                  <span className="font-normal text-slate-400">
                    ({details.length}/500)
                  </span>
                </label>
                <textarea
                  value={details}
                  maxLength={500}
                  rows={3}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Optional — tell us more so we can fix it faster."
                  className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 outline-none focus:border-[#ff6b35] resize-none"
                />

                {message && status === "error" && (
                  <p className="text-xs text-red-500">{message}</p>
                )}

                <div className="flex gap-2 justify-end mt-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="px-4 py-2 text-sm rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={status === "sending"}
                    className="px-4 py-2 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-[#ff6b35] to-[#ea580c] disabled:opacity-60"
                  >
                    {status === "sending" ? "Sending…" : "Submit report"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
