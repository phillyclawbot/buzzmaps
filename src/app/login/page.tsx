import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";
import TopBar from "@/components/ui/TopBar";
import { FormError } from "@/components/ui/FormField";
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
    <main
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ background: "var(--bg)" }}
    >
      <TopBar title="Sign in" />
      <div className="app-card w-full max-w-md p-6 mt-16 md:mt-14">
        <h1 className="text-xl font-bold" style={{ color: "var(--fg)" }}>
          Sign in to BuzzMaps
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--fg-muted)" }}>
          We&apos;ll email you a one-time sign-in link. No password needed.
        </p>

        {error === "expired" && (
          <div className="mt-4">
            <FormError>That sign-in link is expired or already used. Request a new one.</FormError>
          </div>
        )}
        {error === "invalid" && (
          <div className="mt-4">
            <FormError>That link is invalid.</FormError>
          </div>
        )}
        {error === "server" && (
          <div className="mt-4">
            <FormError>Something went wrong. Please try again.</FormError>
          </div>
        )}

        <Suspense
          fallback={
            <div
              className="mt-6 h-10 rounded-lg animate-pulse"
              style={{ background: "var(--bg-sunken)" }}
            />
          }
        >
          <LoginForm next={next} />
        </Suspense>

        <p className="mt-6 text-xs" style={{ color: "var(--fg-subtle)" }}>
          By signing in you agree to use BuzzMaps responsibly.{" "}
          <Link
            href="/"
            className="hover:underline"
            style={{ color: "var(--brand)" }}
          >
            Back to map
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
