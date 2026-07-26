import {
  SiAnthropic,
  SiClaude,
  SiNotion,
  SiElevenlabs,
  SiGooglegemini,
  SiGrammarly,
  SiClickup,
  SiZapier,
  SiPerplexity,
  SiMake,
} from "@icons-pack/react-simple-icons";
import type { ComponentType, SVGProps } from "react";

// 1) Bundled Simple Icons (no CDN — guaranteed to render)
//    OpenAI/Canva/Midjourney/CapCut were removed from Simple Icons due to
//    trademark policy, so they get a styled monogram below instead.
const ICON_COMPONENTS: Record<string, ComponentType<SVGProps<SVGSVGElement> & { size?: number; color?: string; title?: string }>> = {
  claude: SiClaude,
  anthropic: SiAnthropic,
  notion: SiNotion,
  elevenlabs: SiElevenlabs,
  gemini: SiGooglegemini,
  googlegemini: SiGooglegemini,
  grammarly: SiGrammarly,
  clickup: SiClickup,
  zapier: SiZapier,
  perplexity: SiPerplexity,
  make: SiMake,
};

// Each brand's official Simple Icons hex color. Used as the default fill
// when `color` isn't explicitly passed to <BrandIcon>.
const BRAND_HEX: Record<string, string> = {
  claude:       "#D97757",
  anthropic:    "#D97757",
  notion:       "#000000",
  elevenlabs:   "#000000",
  gemini:       "#4796E3",
  googlegemini: "#4796E3",
  grammarly:    "#15C39A",
  clickup:      "#7B68EE",
  zapier:       "#FF4F00",
  perplexity:   "#1FB8CD",
  make:         "#6D00CC",
};

// 2) Clean colored-monogram badges using each brand's official color.
//    Recognizable, on-brand, never breaks.
const MONOGRAM_BRANDS: Record<string, { letter: string; color: string; label: string }> = {
  openai:     { letter: "AI", color: "#10A37F", label: "ChatGPT" },
  chatgpt:    { letter: "AI", color: "#10A37F", label: "ChatGPT" },
  midjourney: { letter: "MJ", color: "#0F172A", label: "Midjourney" },
  canva:      { letter: "Cv", color: "#00C4CC", label: "Canva" },
  capcut:     { letter: "CC", color: "#000000", label: "CapCut" },
  adobe:      { letter: "Ai", color: "#FF0000", label: "Adobe" },
  firefly:    { letter: "Ff", color: "#F59622", label: "Firefly" },
  leonardo:   { letter: "L",  color: "#0F172A", label: "Leonardo" },
  n8n:        { letter: "n8", color: "#EA4B71", label: "n8n" },
};

/**
 * The full list of brand slugs `BrandIcon` knows how to render — exposed so
 * the admin form can offer them in a dropdown picker. Each entry has a stable
 * slug (saved to DB) and a human label (shown in the UI).
 */
export const SUPPORTED_BRANDS: { slug: string; label: string }[] = [
  // Real bundled SVGs
  { slug: "claude",      label: "Claude" },
  { slug: "anthropic",   label: "Anthropic" },
  { slug: "notion",      label: "Notion" },
  { slug: "elevenlabs",  label: "ElevenLabs" },
  { slug: "gemini",      label: "Google Gemini" },
  { slug: "grammarly",   label: "Grammarly" },
  { slug: "clickup",     label: "ClickUp" },
  { slug: "zapier",      label: "Zapier" },
  { slug: "perplexity",  label: "Perplexity" },
  { slug: "make",        label: "Make.com" },
  // Monogram badges (when official SVG isn't available)
  { slug: "openai",      label: "OpenAI / ChatGPT" },
  { slug: "midjourney",  label: "Midjourney" },
  { slug: "canva",       label: "Canva" },
  { slug: "capcut",      label: "CapCut" },
  { slug: "adobe",       label: "Adobe" },
  { slug: "firefly",     label: "Adobe Firefly" },
  { slug: "leonardo",    label: "Leonardo AI" },
  { slug: "n8n",         label: "n8n" },
];

export default function BrandIcon({
  name,
  size = 24,
  color,
}: {
  name: string;
  size?: number;
  /** Optional color override. If omitted, the brand's official hex color is used. */
  color?: string;
}) {
  const slug = name.toLowerCase();

  // Path 1: real bundled SVG component, rendered in the brand's real color
  // unless the caller explicitly overrides via `color`.
  const Component = ICON_COMPONENTS[slug];
  if (Component) {
    const fg = color ?? BRAND_HEX[slug] ?? "#ffffff";
    return <Component size={size} color={fg} aria-label={name} />;
  }

  // Path 2: colored monogram badge for brands that aren't in the package
  const m = MONOGRAM_BRANDS[slug];
  if (m) {
    return (
      <span
        aria-label={m.label}
        style={{
          display: "inline-grid",
          placeItems: "center",
          width: size,
          height: size,
          borderRadius: Math.max(4, size * 0.22),
          background: m.color,
          color: "#ffffff",
          fontFamily: "var(--font-heading), Inter, sans-serif",
          fontWeight: 700,
          fontSize: Math.round(size * (m.letter.length === 1 ? 0.55 : 0.40)),
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        {m.letter}
      </span>
    );
  }

  // Last-ditch fallback — empty placeholder so layout stays stable
  return <span style={{ display: "inline-block", width: size, height: size }} aria-hidden />;
}
