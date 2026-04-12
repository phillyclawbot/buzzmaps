import { ImageResponse } from "next/og";

export const alt = "BuzzMaps Toronto — Discover places locals love on Reddit";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background:
            "linear-gradient(135deg, #ff6b35 0%, #f59e0b 55%, #fbbf24 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              background: "rgba(255,255,255,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
            }}
          >
            📍
          </div>
          <div style={{ fontSize: 36, fontWeight: 700, letterSpacing: -0.5 }}>
            BuzzMaps
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              fontSize: 84,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2,
              maxWidth: 980,
            }}
          >
            Toronto&apos;s places, as told by the internet.
          </div>
          <div
            style={{
              fontSize: 30,
              fontWeight: 500,
              opacity: 0.95,
              maxWidth: 900,
            }}
          >
            Restaurants, bars, cafes, parks and more — curated from Reddit and
            local blogs.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 24,
            fontWeight: 600,
            opacity: 0.9,
          }}
        >
          <div>buzzmaps.vercel.app</div>
          <div style={{ display: "flex", gap: 12 }}>
            <span>🍽️</span>
            <span>🍸</span>
            <span>☕</span>
            <span>🌳</span>
            <span>🏛️</span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
