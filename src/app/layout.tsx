import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import BottomNav from "@/components/BottomNav";
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
  title: 'BuzzMaps Toronto — Discover places locals love on Reddit',
  description: "Interactive map of Toronto places — restaurants, bars, shops, parks, gyms, venues and more — powered by Reddit and local blogs",
  openGraph: {
    title: 'BuzzMaps Toronto',
    description: "Toronto's places, as told by the internet",
    url: 'https://buzzmaps.vercel.app',
    siteName: 'BuzzMaps',
    locale: 'en_CA',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BuzzMaps Toronto',
    description: "Toronto's places, as told by the internet",
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
