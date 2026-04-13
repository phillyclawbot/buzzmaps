import type { ReactNode } from "react";

export default function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon?: ReactNode;
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center py-16 px-6"
      style={{ color: "var(--fg-muted)" }}
    >
      {icon ?? (
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mb-3"
          style={{ color: "var(--fg-faint)" }}
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      )}
      <p className="text-sm font-semibold" style={{ color: "var(--fg)" }}>
        {title}
      </p>
      {message && (
        <p
          className="text-xs mt-1 max-w-sm"
          style={{ color: "var(--fg-subtle)" }}
        >
          {message}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
