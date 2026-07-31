import { ImageResponse } from "next/og";

/* Default social-share card (WhatsApp / X / Facebook). A designed
   1200×630 render instead of the bare transparent logo PNG. The admin
   can still override it via the seo_og_image site setting. */

export const runtime = "edge";
export const alt = "SubscribAI — Premium AI Subscriptions";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px 96px",
          background: "linear-gradient(135deg, #0B1019 0%, #101a2e 55%, #0B1019 100%)",
          color: "#fff",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Accent glow */}
        <div
          style={{
            position: "absolute",
            right: -160,
            top: -160,
            width: 520,
            height: 520,
            borderRadius: 9999,
            background: "rgba(72, 132, 255, 0.18)",
            filter: "blur(90px)",
          }}
        />
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 84,
              height: 84,
              borderRadius: 20,
              background: "linear-gradient(135deg, #F59E0B, #F97316)",
              fontSize: 54,
              fontWeight: 800,
              color: "#fff",
            }}
          >
            S
          </div>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 800, letterSpacing: -2 }}>
            Subscrib<span style={{ color: "#F59E0B" }}>AI</span>
          </div>
        </div>

        <div style={{ marginTop: 44, fontSize: 44, fontWeight: 700, lineHeight: 1.25, maxWidth: 900 }}>
          Premium AI subscriptions, delivered in minutes
        </div>
        <div style={{ marginTop: 20, fontSize: 28, color: "#9CA3AF", maxWidth: 880 }}>
          ChatGPT Plus · Claude Pro · Midjourney · Canva Pro · Notion AI — pay in your local currency
        </div>

        <div style={{ display: "flex", gap: 14, marginTop: 44 }}>
          {["Instant email delivery", "Replacement guarantee", "Human support"].map((chip) => (
            <div
              key={chip}
              style={{
                display: "flex",
                padding: "12px 22px",
                borderRadius: 9999,
                border: "1px solid rgba(72, 132, 255, 0.45)",
                background: "rgba(72, 132, 255, 0.12)",
                fontSize: 22,
                color: "#DBEAFE",
              }}
            >
              {chip}
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
