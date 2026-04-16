import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function BackLink({
  href = "/",
  label = "Back",
}: {
  href?: string;
  label?: string;
}) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2 font-display-ui font-semibold text-sm transition-all focus-ring"
      style={{
        color: "var(--fg)",
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        padding: "8px 14px",
        borderRadius: "var(--radius-pill)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <ArrowLeft
        size={16}
        className="transition-transform group-hover:-translate-x-0.5"
      />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}
