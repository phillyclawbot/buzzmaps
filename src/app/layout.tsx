import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'BuzzMaps Toronto — Discover places locals love on Reddit',
  description: "Interactive map of Toronto restaurants, bars, shops, parks and more — powered by Reddit recommendations",
  openGraph: {
    title: 'BuzzMaps Toronto',
    description: "Toronto's places, as told by Reddit",
    url: 'https://buzzmaps.vercel.app',
    siteName: 'BuzzMaps',
    images: [{ url: 'https://via.placeholder.com/1200x630/ff6b35/ffffff?text=BuzzMaps+Toronto', width: 1200, height: 630 }],
    locale: 'en_CA',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BuzzMaps Toronto',
    description: "Toronto's places, as told by Reddit",
    images: ['https://via.placeholder.com/1200x630/ff6b35/ffffff?text=BuzzMaps+Toronto'],
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
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  );
}
