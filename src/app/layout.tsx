import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Fraunces, Space_Grotesk } from "next/font/google";
import BottomNav from "@/components/BottomNav";
import SiteHeader from "@/components/SiteHeader";
import Analytics from "@/components/Analytics";
import CommandPalette from "@/components/CommandPalette";
import ShortcutsHelp from "@/components/ShortcutsHelp";
import RecentPlaceTracker from "@/components/RecentPlaceTracker";
import MotionProvider from "@/components/MotionProvider";
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

// Big editorial display face — used only for hero headlines now
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
});

// Rounded-geometric label face for buttons, eyebrows, chips
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ff5b3a",
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
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="h-full">
        <MotionProvider>
          <SiteHeader />
          {children}
          <BottomNav />
          <CommandPalette />
          <ShortcutsHelp />
          <RecentPlaceTracker />
          <Analytics />
        </MotionProvider>
      </body>
    </html>
  );
}
