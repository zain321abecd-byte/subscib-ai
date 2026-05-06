import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SubscribAI — Premium AI Subscriptions",
    short_name: "SubscribAI",
    description: "Premium AI subscriptions, automation packs, and digital tools — delivered in minutes.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0A0A0E",
    theme_color: "#FF7A1A",
    lang: "en",
    categories: ["shopping", "business", "productivity"],
    icons: [
      { src: "/assets/favicon.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/assets/favicon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/assets/favicon.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
