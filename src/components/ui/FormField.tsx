import type { InputHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";

const inputBase =
  "w-full rounded-lg px-3 py-2 text-sm outline-none transition-colors focus-ring";

export function FormField({
  label,
  error,
  hint,
  children,
}: {
  label?: string;
  error?: string | null;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      {label && (
        <span
          className="block text-xs font-semibold mb-1.5"
          style={{ color: "var(--fg-muted)" }}
        >
          {label}
        </span>
      )}
      {children}
      {hint && !error && (
        <span className="block text-[11px] mt-1" style={{ color: "var(--fg-subtle)" }}>
          {hint}
        </span>
      )}
      {error && (
        <span
          className="block text-[11px] mt-1"
          style={{ color: "var(--sent-neg)" }}
          role="alert"
        >
          {error}
        </span>
      )}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`${inputBase} ${props.className ?? ""}`}
      style={{
        background: "var(--bg-elevated)",
        color: "var(--fg)",
        border: "1px solid var(--border)",
        ...props.style,
      }}
    />
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`${inputBase} ${props.className ?? ""}`}
      style={{
        background: "var(--bg-elevated)",
        color: "var(--fg)",
        border: "1px solid var(--border)",
        ...props.style,
      }}
    />
  );
}

export function FormError({ children }: { children: ReactNode }) {
  return (
    <div
      className="text-xs rounded-lg px-3 py-2"
      style={{
        color: "var(--sent-neg)",
        background: "color-mix(in srgb, var(--sent-neg) 8%, transparent)",
        border: "1px solid color-mix(in srgb, var(--sent-neg) 20%, transparent)",
      }}
      role="alert"
    >
      {children}
    </div>
  );
}
