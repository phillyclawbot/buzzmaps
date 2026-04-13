import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import type { PlaceCategory } from "@/lib/types";
import LogoutButton from "./LogoutButton";
import TopBar from "@/components/ui/TopBar";
import PlaceCard from "@/components/ui/PlaceCard";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Your account — ${SITE_NAME}`,
  description: "Manage your saved places on BuzzMaps.",
  alternates: { canonical: `${SITE_URL}/account` },
  robots: { index: false, follow: false },
};

interface SavedRow {
  id: number;
  name: string;
  address: string | null;
  category: PlaceCategory;
  google_rating: number | null;
  photo_url: string | null;
}

export default async function AccountPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const sql = getDb();
  const saved = (await sql`
    SELECT r.id, r.name, r.address, r.category, r.google_rating, r.photo_url
    FROM saved_places sp
    JOIN restaurants r ON r.id = sp.restaurant_id
    WHERE sp.user_id = ${user.id}
    ORDER BY sp.created_at DESC
  `) as SavedRow[];

  return (
    <main className="min-h-screen" style={{ background: "var(--bg)" }}>
      <TopBar title="Account" />

      <article className="pt-14 md:pt-16 pb-24 max-w-3xl mx-auto px-6 md:px-10 page-enter">
        <div
          className="flex items-end justify-between pb-6 mb-10"
          style={{ borderBottom: "1px solid var(--fg)" }}
        >
          <div>
            <p className="eyebrow mb-2" style={{ color: "var(--brand)" }}>
              The Library
            </p>
            <h1
              className="font-display text-5xl md:text-6xl"
              style={{ color: "var(--fg)", fontWeight: 500, lineHeight: 1 }}
            >
              Your saves
            </h1>
            <p className="caption mt-3" style={{ color: "var(--fg-muted)" }}>
              Signed in as{" "}
              <span style={{ color: "var(--fg)" }}>{user.email}</span>
            </p>
          </div>
          <LogoutButton />
        </div>

        <div className="flex items-baseline justify-between mb-8">
          <p className="dateline">
            {saved.length} {saved.length === 1 ? "place" : "places"}
          </p>
        </div>

        {saved.length === 0 ? (
          <div className="text-center py-20">
            <h2
              className="font-display text-3xl md:text-4xl mb-3"
              style={{ color: "var(--fg)", fontWeight: 500 }}
            >
              Nothing saved yet.
            </h2>
            <p
              className="caption max-w-sm mx-auto mb-8"
              style={{ color: "var(--fg-muted)" }}
            >
              Tap the heart on any place to keep it here.
            </p>
            <Link
              href="/"
              className="font-display text-xl ink-underline"
              style={{ color: "var(--brand)", fontWeight: 500 }}
            >
              Start reading the feed →
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {saved.map((p, i) => (
              <PlaceCard key={p.id} place={p} variant="row" stagger={i} />
            ))}
          </div>
        )}
      </article>
    </main>
  );
}
