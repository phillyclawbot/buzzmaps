"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Mail,
  TrendingUp,
  Info,
  UserCircle,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";

type Item = {
  href: string;
  label: string;
  desc: string;
  Icon: LucideIcon;
  color: string;
};

const ITEMS: Item[] = [
  {
    href: "/digest",
    label: "Dispatch",
    desc: "Weekly email. This week's top picks.",
    Icon: Mail,
    color: "#ff5b3a",
  },
  {
    href: "/stats",
    label: "Index",
    desc: "Trends, movers, totals.",
    Icon: TrendingUp,
    color: "#0066ff",
  },
  {
    href: "/about",
    label: "About",
    desc: "How BuzzMaps works.",
    Icon: Info,
    color: "#10b981",
  },
  {
    href: "/account",
    label: "Account",
    desc: "Saved places · sign in.",
    Icon: UserCircle,
    color: "#8b5cf6",
  },
];

export default function MoreMenu({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[1100] md:hidden flex items-end"
          role="dialog"
          aria-modal="true"
          aria-label="More"
        >
          <motion.button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ background: "rgba(15, 20, 25, 0.55)" }}
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="relative w-full overflow-hidden"
            style={{
              background: "var(--bg-elevated)",
              paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)",
              boxShadow: "var(--shadow-lg)",
              borderTopLeftRadius: "var(--radius-xl)",
              borderTopRightRadius: "var(--radius-xl)",
            }}
          >
            <div className="flex justify-center pt-3 pb-2">
              <span
                className="w-12 h-1.5 rounded-full"
                style={{ background: "var(--border-strong)" }}
              />
            </div>
            <div className="px-5 pt-2 pb-2">
              <p className="eyebrow mb-3 px-1">More from BuzzMaps</p>
              <ul className="flex flex-col gap-2">
                {ITEMS.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onClose}
                      className="flex items-center gap-3 p-3 rounded-[var(--radius-lg)] press-down transition-colors"
                      style={{ background: "var(--bg-sunken)" }}
                    >
                      <span
                        className="inline-flex items-center justify-center shrink-0"
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 14,
                          background: `${item.color}1f`,
                          color: item.color,
                        }}
                      >
                        <item.Icon size={22} strokeWidth={2} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span
                          className="block font-display-ui font-semibold text-[15px]"
                          style={{ color: "var(--fg)" }}
                        >
                          {item.label}
                        </span>
                        <span
                          className="block text-[12.5px] mt-0.5"
                          style={{ color: "var(--fg-muted)" }}
                        >
                          {item.desc}
                        </span>
                      </span>
                      <ChevronRight
                        size={18}
                        style={{ color: "var(--fg-subtle)" }}
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
