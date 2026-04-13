import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import type { PlaceCategory } from "@/lib/types";
import LogoutButton from "./LogoutButton";
import TopBar from "@/components/ui/TopBar";
import PlaceCard from "@/components/ui/PlaceCard";
import EmptyState from "@/components/ui/EmptyState";
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

      <div className="pt-12 md:pt-14 pb-20 max-w-3xl mx-auto px-4 py-6 page-enter">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: "var(--fg)" }}>
              Your account
            </h1>
            <p className="text-sm mt-1" style={{ color: "var(--fg-muted)" }}>
              Signed in as{" "}
              <span className="font-medium" style={{ color: "var(--fg)" }}>
                {user.email}
              </span>
            </p>
          </div>
          <LogoutButton />
        </div>

        <h2
          className="text-sm font-bold uppercase tracking-wider px-1 mb-3"
          style={{ color: "var(--fg-muted)" }}
        >
          ⭐ Saved places ({saved.length})
        </h2>

        {saved.length === 0 ? (
          <EmptyState
            title="No saved places yet"
            message="Tap the heart on any place to save it here."
            action={
              <Link
                href="/"
                className="inline-block px-5 py-2 rounded-lg text-xs font-semibold press-down hover:opacity-90 transition-opacity"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, var(--brand), var(--brand-hover))",
                  color: "var(--fg-inverse)",
                }}
              >
                Explore the map
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {saved.map((p, i) => (
              <PlaceCard key={p.id} place={p} variant="row" stagger={i} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
