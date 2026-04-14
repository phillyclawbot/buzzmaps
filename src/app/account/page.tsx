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
  description: "Your wishlist and visited places on BuzzMaps.",
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
  status: "wishlist" | "visited";
  created_at: string;
}

export default async function AccountPage() {
  const user = await getSession();
  if (!user) redirect("/login");

  const sql = getDb();
  const saved = (await sql`
    SELECT r.id, r.name, r.address, r.category, r.google_rating, r.photo_url,
           sp.status, sp.created_at
    FROM saved_places sp
    JOIN restaurants r ON r.id = sp.restaurant_id
    WHERE sp.user_id = ${user.id}
    ORDER BY sp.created_at DESC
  `) as SavedRow[];

  const wishlist = saved.filter((s) => s.status !== "visited");
  const visited = saved.filter((s) => s.status === "visited");

  return (
    <main className="min-h-screen" style={{ background: "var(--bg)" }}>
      <TopBar title="Account" />

      <article className="pt-14 md:pt-16 pb-24 max-w-3xl mx-auto px-6 md:px-10 page-enter">
        {/* Header */}
        <div
          className="flex items-end justify-between pb-6 mb-12"
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
              Your shelves.
            </h1>
            <p className="caption mt-3" style={{ color: "var(--fg-muted)" }}>
              Signed in as{" "}
              <span style={{ color: "var(--fg)" }}>{user.email}</span>
            </p>
          </div>
          <LogoutButton />
        </div>

        {/* Section: Want to go */}
        <section className="mb-16">
          <div
            className="flex items-baseline justify-between pb-3 mb-8"
            style={{ borderBottom: "1px solid var(--fg)" }}
          >
            <h2
              className="font-display text-2xl md:text-3xl"
              style={{ color: "var(--fg)", fontWeight: 500 }}
            >
              Want to go
            </h2>
            <p className="dateline">
              {wishlist.length} {wishlist.length === 1 ? "place" : "places"}
            </p>
          </div>

          {wishlist.length === 0 ? (
            <div className="py-12 text-center">
              <p
                className="font-serif italic text-lg mb-6"
                style={{ color: "var(--fg-muted)" }}
              >
                Your wishlist is empty.
              </p>
              <Link
                href="/"
                className="font-display text-xl ink-underline"
                style={{ color: "var(--brand)", fontWeight: 500 }}
              >
                Browse the feed →
              </Link>
            </div>
          ) : (
            <div className="space-y-8">
              {wishlist.map((p, i) => (
                <PlaceCard key={p.id} place={p} variant="row" stagger={i} />
              ))}
            </div>
          )}
        </section>

        {/* Section: Visited */}
        <section>
          <div
            className="flex items-baseline justify-between pb-3 mb-8"
            style={{ borderBottom: "1px solid var(--fg)" }}
          >
            <h2
              className="font-display text-2xl md:text-3xl"
              style={{ color: "var(--fg)", fontWeight: 500 }}
            >
              Visited
            </h2>
            <p className="dateline">
              {visited.length} {visited.length === 1 ? "place" : "places"}
            </p>
          </div>

          {visited.length === 0 ? (
            <p
              className="font-serif italic text-lg py-12 text-center"
              style={{ color: "var(--fg-muted)" }}
            >
              Nothing marked visited yet. Use &ldquo;Mark visited&rdquo; on any
              place page.
            </p>
          ) : (
            <div className="space-y-8">
              {visited.map((p, i) => (
                <PlaceCard key={p.id} place={p} variant="row" stagger={i} />
              ))}
            </div>
          )}
        </section>
      </article>
    </main>
  );
}
