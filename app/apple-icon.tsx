import { ImageResponse } from "next/og";

/* 180×180 apple-touch-icon (iOS home-screen). Rendered at the right size
   instead of letting iOS scale the small favicon.png. */

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0B1019, #101a2e)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 128,
            height: 128,
            borderRadius: 32,
            background: "linear-gradient(135deg, #F59E0B, #F97316)",
            fontSize: 84,
            fontWeight: 800,
            color: "#fff",
            fontFamily: "sans-serif",
          }}
        >
          S
        </div>
      </div>
    ),
    size
  );
}
