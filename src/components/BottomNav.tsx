"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, LayoutGroup } from "framer-motion";
import { Home, LayoutGrid, Map as MapIcon, Plus, Menu } from "lucide-react";
import MoreMenu from "./MoreMenu";

type Item =
  | { kind: "link"; key: string; href: string; label: string; Icon: typeof Home }
  | { kind: "fab"; key: string; href: string; label: string; Icon: typeof Plus }
  | { kind: "button"; key: string; label: string; Icon: typeof Menu };

export default function BottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const [openedAt, setOpenedAt] = useState<string | null>(null);
  if (moreOpen && openedAt !== null && openedAt !== pathname) {
    setMoreOpen(false);
    setOpenedAt(null);
  }

  const openMore = () => {
    setOpenedAt(pathname);
    setMoreOpen(true);
  };
  const closeMore = () => {
    setMoreOpen(false);
    setOpenedAt(null);
  };

  const items: Item[] = [
    { kind: "link", key: "feed", href: "/", label: "Feed", Icon: Home },
    {
      kind: "link",
      key: "lists",
      href: "/collections",
      label: "Lists",
      Icon: LayoutGrid,
    },
    { kind: "fab", key: "submit", href: "/submit", label: "Add", Icon: Plus },
    { kind: "link", key: "map", href: "/map", label: "Map", Icon: MapIcon },
    { kind: "button", key: "more", label: "More", Icon: Menu },
  ];

  const isActive = (key: string) => {
    if (key === "feed") return pathname === "/";
    if (key === "lists") return pathname.startsWith("/collections");
    if (key === "map") return pathname === "/map";
    if (key === "submit") return pathname === "/submit";
    if (key === "more") return moreOpen;
    return false;
  };

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-[1000] md:hidden"
        style={{
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
        aria-label="Primary"
      >
        <div
          className="mx-3 mb-3 flex items-stretch glass rounded-full"
          style={{
            height: 64,
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <LayoutGroup id="bottom-nav">
            {items.map((item) => {
              const active = isActive(item.key);
              const { Icon } = item;

              if (item.kind === "fab") {
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className="flex-1 flex items-center justify-center"
                    aria-label={item.label}
                    aria-current={active ? "page" : undefined}
                  >
                    <motion.span
                      whileTap={{ scale: 0.9 }}
                      whileHover={{ scale: 1.06 }}
                      transition={{ type: "spring", stiffness: 400, damping: 20 }}
                      className="relative -mt-7 inline-flex items-center justify-center"
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 9999,
                        background: "var(--brand-gradient)",
                        color: "#fff",
                        boxShadow: "var(--glow-brand), var(--shadow-md)",
                      }}
                    >
                      <Icon size={24} strokeWidth={2.6} />
                    </motion.span>
                  </Link>
                );
              }

              const innerContent = (
                <motion.span
                  whileTap={{ scale: 0.92 }}
                  className="relative inline-flex flex-col items-center justify-center gap-0.5 px-4 py-2 rounded-full"
                  style={{
                    color: active ? "var(--fg)" : "var(--fg-muted)",
                  }}
                >
                  {active && (
                    <motion.span
                      layoutId="bottom-active-pill"
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 30,
                      }}
                      className="absolute inset-0 rounded-full -z-0"
                      style={{ background: "var(--bg-sunken)" }}
                      aria-hidden="true"
                    />
                  )}
                  <Icon
                    size={20}
                    strokeWidth={active ? 2.4 : 2}
                    className="relative z-[1]"
                  />
                  <span
                    className="relative z-[1] eyebrow"
                    style={{
                      color: "inherit",
                      fontSize: 9.5,
                      letterSpacing: "0.16em",
                    }}
                  >
                    {item.label}
                  </span>
                </motion.span>
              );

              if (item.kind === "link") {
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    prefetch
                    className="flex-1 flex items-center justify-center"
                    aria-label={item.label}
                    aria-current={active ? "page" : undefined}
                  >
                    {innerContent}
                  </Link>
                );
              }

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={openMore}
                  className="flex-1 flex items-center justify-center"
                  aria-label={item.label}
                  aria-haspopup="dialog"
                  aria-expanded={moreOpen}
                >
                  {innerContent}
                </button>
              );
            })}
          </LayoutGroup>
        </div>
      </nav>

      <MoreMenu open={moreOpen} onClose={closeMore} />
    </>
  );
}
