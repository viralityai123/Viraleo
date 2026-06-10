import { createFileRoute } from "@tanstack/react-router";
import { LandingV2 } from "@/components/landing-v2/LandingV2";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Viraleo — YouTube Channel Intelligence, decoded" },
      {
        name: "description",
        content:
          "Decode viral YouTube channels. Hooks, retention, thumbnails, niche fit — AI-powered channel analysis for creators.",
      },
      { property: "og:title", content: "Viraleo — YouTube Channel Intelligence, decoded" },
      {
        property: "og:description",
        content: "Decode viral YouTube channels. Hooks, retention, thumbnails, niche fit.",
      },
      { property: "og:image", content: "https://viraleo.pro/og-image.png" },
      { property: "og:url", content: "https://viraleo.pro" },
      { name: "twitter:title", content: "Viraleo — YouTube Channel Intelligence, decoded" },
      { name: "twitter:description", content: "Decode viral YouTube channels with AI." },
      { name: "twitter:image", content: "https://viraleo.pro/og-image.png" },
    ],
    links: [{ rel: "canonical", href: "https://viraleo.pro" }],
  }),
  component: LandingV2,
});
