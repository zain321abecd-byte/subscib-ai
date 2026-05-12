// Renders the real JazzCash / Easypaisa / Mastercard logos that live in
// /public/assets/. Plain <img> is used (not next/image) because these are
// small payment-method badges where layout-shift / optimization don't
// matter and we want the natural aspect ratio without computing widths.

type Provider = "jazzcash" | "easypaisa" | "card";

// The supplied artwork files have their own black backgrounds and brand
// padding baked in, so each provider has a slightly different intrinsic
// aspect ratio. Use that ratio to pick a sensible width per provider so
// none of the logos get squashed or float in oversized whitespace.
//
// The `nudgeY` value applies a small vertical translate to compensate for
// where each brand's *visible* mark sits inside its source image. The
// JazzCash artwork places its icon in the upper half of the JPEG (with
// "JazzCash" text below), so without a nudge it sits visibly higher than
// the others when they're laid out in a row.
const SOURCES: Record<
  Provider,
  { src: string; label: string; aspect: number; nudgeY: number }
> = {
  jazzcash: { src: "/assets/jazzcash.jpeg", label: "JazzCash", aspect: 1, nudgeY: 3 },
  // Note: the file ships as "easypysa.png" (typo at upload time); kept
  // as-is so we don't have to rename a binary asset.
  easypaisa: { src: "/assets/easypysa.png", label: "Easypaisa", aspect: 1, nudgeY: 1 },
  card: { src: "/assets/mastercard.png", label: "Visa & Mastercard", aspect: 2.6, nudgeY: 0 },
};

export default function PaymentLogo({
  provider,
  height = 28,
  className,
}: {
  provider: Provider;
  height?: number;
  className?: string;
}) {
  const { src, label, aspect, nudgeY } = SOURCES[provider];
  const width = Math.round(height * aspect);
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={label}
      className={className}
      width={width}
      height={height}
      style={{
        display: "block",
        height,
        width,
        objectFit: "contain",
        transform: nudgeY ? `translateY(${nudgeY}px)` : undefined,
      }}
    />
  );
}
