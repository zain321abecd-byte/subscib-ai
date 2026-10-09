import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SubscribAI — Premium AI Subscriptions",
    short_name: "SubscribAI",
    description: "Premium AI subscriptions, automation packs, and digital tools — delivered in minutes.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0B1019",
    theme_color: "#4884FF",
    lang: "en",
    categories: ["shopping", "business", "productivity"],
    icons: [
      { src: "/assets/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/assets/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/assets/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
