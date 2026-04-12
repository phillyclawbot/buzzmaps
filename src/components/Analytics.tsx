import Script from "next/script";

// Privacy-friendly analytics via Plausible. Only loads if
// NEXT_PUBLIC_PLAUSIBLE_DOMAIN is set, so previews and local dev stay quiet.
//
// To enable: set NEXT_PUBLIC_PLAUSIBLE_DOMAIN to your site's domain
// (e.g. "buzzmaps.vercel.app"). Optionally override NEXT_PUBLIC_PLAUSIBLE_SRC
// for self-hosted Plausible instances.
export default function Analytics() {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  if (!domain) return null;
  const src =
    process.env.NEXT_PUBLIC_PLAUSIBLE_SRC ?? "https://plausible.io/js/script.js";
  return (
    <Script
      defer
      data-domain={domain}
      src={src}
      strategy="afterInteractive"
    />
  );
}
