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
      className="min-h-screen flex items-center justify-center px-6 py-20"
      style={{ background: "var(--bg)" }}
    >
      <TopBar title="Sign in" />
      <div className="w-full max-w-lg text-center pt-14 md:pt-0">
        <p className="eyebrow mb-3" style={{ color: "var(--brand)" }}>
          The Library
        </p>
        <h1
          className="font-display text-5xl md:text-6xl mb-4"
          style={{ color: "var(--fg)", fontWeight: 500, lineHeight: 1 }}
        >
          Welcome back.
        </h1>
        <p
          className="caption mb-10 max-w-sm mx-auto"
          style={{ color: "var(--fg-muted)" }}
        >
          We&apos;ll email you a one-time sign-in link. No password needed.
        </p>

        {error === "expired" && (
          <div className="mb-4 max-w-sm mx-auto text-left">
            <FormError>That sign-in link is expired or already used. Request a new one.</FormError>
          </div>
        )}
        {error === "invalid" && (
          <div className="mb-4 max-w-sm mx-auto text-left">
            <FormError>That link is invalid.</FormError>
          </div>
        )}
        {error === "server" && (
          <div className="mb-4 max-w-sm mx-auto text-left">
            <FormError>Something went wrong. Please try again.</FormError>
          </div>
        )}

        <div className="max-w-sm mx-auto text-left">
          <Suspense
            fallback={
              <div
                className="h-12 rounded animate-pulse"
                style={{ background: "var(--bg-sunken)" }}
              />
            }
          >
            <LoginForm next={next} />
          </Suspense>
        </div>

        <p className="dateline mt-10">
          By signing in you agree to use BuzzMaps responsibly.{" "}
          <Link
            href="/"
            className="hover:underline"
            style={{ color: "var(--brand)" }}
          >
            Back to the feed
          </Link>
        </p>
      </div>
    </main>
  );
}
