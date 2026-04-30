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

// 2) Clean colored-monogram badges using each brand's official color.
//    Recognizable, on-brand, never breaks.
const MONOGRAM_BRANDS: Record<string, { letter: string; color: string; label: string }> = {
  openai:     { letter: "AI", color: "#10A37F", label: "ChatGPT" },
  chatgpt:    { letter: "AI", color: "#10A37F", label: "ChatGPT" },
  midjourney: { letter: "MJ", color: "#0F172A", label: "Midjourney" },
  canva:      { letter: "Cv", color: "#00C4CC", label: "Canva" },
  capcut:     { letter: "CC", color: "#000000", label: "CapCut" },
  adobe:      { letter: "Ai", color: "#FF0000", label: "Adobe" },
  firefly:    { letter: "Ff", color: "#FF7A1A", label: "Firefly" },
  leonardo:   { letter: "L",  color: "#0F172A", label: "Leonardo" },
  n8n:        { letter: "n8", color: "#EA4B71", label: "n8n" },
};

export default function BrandIcon({
  name,
  size = 24,
  color = "#ffffff",
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  const slug = name.toLowerCase();

  // Path 1: real bundled SVG component
  const Component = ICON_COMPONENTS[slug];
  if (Component) {
    return <Component size={size} color={color} aria-label={name} />;
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
