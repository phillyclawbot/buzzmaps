import type { InputHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";

const inputBase =
  "w-full px-4 py-3 text-[15px] outline-none transition-all focus-ring";

const inputStyle: React.CSSProperties = {
  background: "var(--bg-elevated)",
  color: "var(--fg)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
};

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
          className="eyebrow block mb-2"
          style={{ color: "var(--fg-muted)" }}
        >
          {label}
        </span>
      )}
      {children}
      {hint && !error && (
        <span
          className="block mt-1.5 text-[12px]"
          style={{ color: "var(--fg-subtle)" }}
        >
          {hint}
        </span>
      )}
      {error && (
        <span
          className="block mt-1.5 text-[12px] font-display-ui font-semibold"
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
      style={{ ...inputStyle, ...props.style }}
    />
  );
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`${inputBase} ${props.className ?? ""}`}
      style={{ ...inputStyle, ...props.style }}
    />
  );
}

export function FormError({ children }: { children: ReactNode }) {
  return (
    <div
      className="px-4 py-3 text-sm font-medium"
      style={{
        color: "var(--sent-neg)",
        background: "color-mix(in srgb, var(--sent-neg) 10%, transparent)",
        border: "1px solid color-mix(in srgb, var(--sent-neg) 30%, transparent)",
        borderRadius: "var(--radius-md)",
      }}
      role="alert"
    >
      {children}
    </div>
  );
}
