import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "s3-media*.yelpcdn.com",
      },
      {
        protocol: "https",
        hostname: "fastly.4sqi.net",
      },
      {
        protocol: "https",
        hostname: "*.wikipedia.org",
      },
    ],
  },
};

export default nextConfig;
