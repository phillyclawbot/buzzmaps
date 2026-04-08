"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { Suspense } from "react";

const tabs = [
  {
    label: "Explore",
    href: "/",
    icon: '<polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/>',
    match: (p: string, v: string | null) => p === "/" && v !== "list",
  },
  {
    label: "List",
    href: "/?view=list",
    icon: '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
    match: (p: string, v: string | null) => p === "/" && v === "list",
  },
  {
    label: "Collections",
    href: "/collections",
    icon: '<path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/>',
    match: (p: string) => p.startsWith("/collections"),
  },
  {
    label: "Submit",
    href: "/submit",
    icon: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    match: (p: string) => p === "/submit",
  },
  {
    label: "More",
    href: "/about",
    icon: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    match: (p: string) => p === "/about" || p === "/stats" || p === "/digest",
  },
];

function BottomNavInner() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const viewParam = searchParams.get("view");

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm z-[1000] md:hidden flex items-stretch border-t border-slate-200"
      style={{ height: "56px", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {tabs.map((tab) => {
        const active = tab.match(pathname, viewParam);
        const isHomeTab = tab.href === "/" || tab.href === "/?view=list";

        // Home tabs (Explore/List): use router for reliable param switching
        if (isHomeTab) {
          return (
            <button
              key={tab.label}
              onClick={() => {
                if (pathname === "/") {
                  // Already on home — just change the query param
                  router.replace(tab.href, { scroll: false });
                } else {
                  // Coming from another page
                  router.push(tab.href);
                }
              }}
              className="flex-1 flex flex-col items-center justify-center gap-0.5"
              style={{ color: active ? "#E05D36" : "#94a3b8" }}
            >
              <svg
                width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                dangerouslySetInnerHTML={{ __html: tab.icon }}
              />
              <span style={{ fontSize: "10px", fontWeight: 600 }}>{tab.label}</span>
            </button>
          );
        }

        return (
          <Link
            key={tab.label}
            href={tab.href}
            prefetch={true}
            className="flex-1 flex flex-col items-center justify-center gap-0.5"
            style={{ color: active ? "#E05D36" : "#94a3b8" }}
          >
            <svg
              width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              dangerouslySetInnerHTML={{ __html: tab.icon }}
            />
            <span style={{ fontSize: "10px", fontWeight: 600 }}>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function BottomNav() {
  return (
    <Suspense fallback={null}>
      <BottomNavInner />
    </Suspense>
  );
}
