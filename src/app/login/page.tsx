import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";
import { getSession } from "@/lib/auth";
import { SITE_URL, SITE_NAME } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `Sign in — ${SITE_NAME}`,
  description: "Sign in to BuzzMaps to save places and sync across devices.",
  alternates: { canonical: `${SITE_URL}/login` },
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getSession();
  if (user) redirect("/account");

  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/account";
  const error = typeof sp.error === "string" ? sp.error : null;

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm w-full max-w-md p-6">
        <h1 className="text-xl font-bold text-slate-900">Sign in to BuzzMaps</h1>
        <p className="text-sm text-slate-500 mt-1">
          We&apos;ll email you a one-time sign-in link. No password needed.
        </p>

        {error === "expired" && (
          <div className="mt-4 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            That sign-in link is expired or already used. Request a new one.
          </div>
        )}
        {error === "invalid" && (
          <div className="mt-4 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            That link is invalid.
          </div>
        )}
        {error === "server" && (
          <div className="mt-4 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            Something went wrong. Please try again.
          </div>
        )}

        <Suspense fallback={<div className="mt-6 h-10 bg-slate-100 rounded-lg animate-pulse" />}>
          <LoginForm next={next} />
        </Suspense>

        <p className="mt-6 text-xs text-slate-400">
          By signing in you agree to use BuzzMaps responsibly.{" "}
          <Link href="/" className="text-[#ff6b35] hover:underline">
            Back to map
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
