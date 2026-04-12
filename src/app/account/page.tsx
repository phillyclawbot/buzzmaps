import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { CATEGORY_EMOJI } from "@/lib/types";
import type { PlaceCategory } from "@/lib/types";
import LogoutButton from "./LogoutButton";
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
    <main className="min-h-screen bg-slate-50">
      <div className="fixed top-0 left-0 right-0 h-12 bg-white/95 backdrop-blur-sm border-b border-slate-200 z-50 flex items-center px-4 gap-3">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff6b35] shrink-0" />
          <span className="font-semibold text-sm tracking-tight bg-gradient-to-r from-[#ff6b35] to-[#f59e0b] bg-clip-text text-transparent">
            BuzzMaps
          </span>
        </Link>
        <span className="text-slate-300">·</span>
        <span className="text-sm font-semibold text-slate-700">Account</span>
      </div>

      <div className="pt-16 pb-20 max-w-3xl mx-auto px-4">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Your account</h1>
            <p className="text-sm text-slate-500 mt-1">
              Signed in as{" "}
              <span className="font-medium text-slate-700">{user.email}</span>
            </p>
          </div>
          <LogoutButton />
        </div>

        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider px-1 mb-3">
          ⭐ Saved places ({saved.length})
        </h2>

        {saved.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
            <p className="text-sm text-slate-500">
              You haven&apos;t saved any places yet.
            </p>
            <Link
              href="/"
              className="mt-4 inline-block px-5 py-2 bg-[#ff6b35] text-white text-xs font-semibold rounded-lg hover:bg-[#ea580c] transition-colors"
            >
              Explore the map
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {saved.map((p) => {
              const emoji = CATEGORY_EMOJI[p.category] || "📍";
              return (
                <Link
                  key={p.id}
                  href={`/place/${encodeURIComponent(p.name)}`}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-[#ff6b35]/40 transition-all overflow-hidden flex"
                >
                  {p.photo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.photo_url}
                      alt={p.name}
                      className="w-24 h-24 object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-24 h-24 flex items-center justify-center text-3xl bg-slate-50 shrink-0">
                      {emoji}
                    </div>
                  )}
                  <div className="p-3 min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      {p.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">
                      {emoji} {p.category}
                    </p>
                    {p.address && (
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        {p.address}
                      </p>
                    )}
                    {p.google_rating !== null && (
                      <p className="text-xs text-slate-500 mt-1">
                        ⭐ {p.google_rating.toFixed(1)}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
