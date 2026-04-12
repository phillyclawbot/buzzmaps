import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import BottomNav from "@/components/BottomNav";
import { SITE_URL, SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} Toronto — Discover places locals love on Reddit`,
    template: `%s — ${SITE_NAME}`,
  },
  description:
    "Interactive map of Toronto places — restaurants, bars, shops, parks, gyms, venues and more — powered by Reddit and local blogs",
  alternates: {
    canonical: SITE_URL,
    types: {
      "application/atom+xml": [
        { url: `${SITE_URL}/feed.xml`, title: `${SITE_NAME} — New places` },
      ],
    },
  },
  openGraph: {
    title: `${SITE_NAME} Toronto`,
    description: SITE_TAGLINE,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "en_CA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} Toronto`,
    description: SITE_TAGLINE,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full">
        {children}
        <BottomNav />
      </body>
    </html>
  );
}
