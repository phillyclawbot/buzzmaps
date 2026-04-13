import Link from "next/link";

export default function Logo({
  href = "/",
  className = "",
}: {
  href?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 hover:opacity-80 transition-opacity ${className}`}
      aria-label="BuzzMaps home"
    >
      <span
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ background: "var(--brand)" }}
      />
      <span
        className="font-semibold text-sm tracking-tight bg-clip-text text-transparent"
        style={{
          backgroundImage: "linear-gradient(90deg, var(--brand), #f59e0b)",
        }}
      >
        BuzzMaps
      </span>
    </Link>
  );
}
