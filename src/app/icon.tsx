import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #ff6b35 0%, #ea580c 100%)",
          color: "#ffffff",
          fontSize: 320,
          fontWeight: 800,
          letterSpacing: -12,
        }}
      >
        📍
      </div>
    ),
    { ...size }
  );
}
