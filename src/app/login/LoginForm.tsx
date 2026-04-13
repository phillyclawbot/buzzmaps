"use client";

import { useState } from "react";
import { FormField, TextInput, FormError } from "@/components/ui/FormField";
import Button from "@/components/ui/Button";

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
      <div
        className="mt-6 rounded-xl px-4 py-3 text-sm"
        style={{
          background: "color-mix(in srgb, var(--sent-pos-fill) 10%, transparent)",
          color: "var(--sent-pos)",
          border: "1px solid color-mix(in srgb, var(--sent-pos-fill) 25%, transparent)",
        }}
      >
        Check your inbox for a sign-in link. It expires in 20 minutes.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 flex flex-col gap-3">
      <FormField label="Email">
        <TextInput
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
        />
      </FormField>
      {error && <FormError>{error}</FormError>}
      <Button type="submit" disabled={loading || !email.trim()} size="lg">
        {loading ? "Sending link…" : "Email me a sign-in link"}
      </Button>
    </form>
  );
}
