// Renders the real JazzCash / Easypaisa / Mastercard logos that live in
// /public/assets/. Plain <img> is used (not next/image) because these are
// small payment-method badges where layout-shift / optimization don't
// matter and we want the natural aspect ratio without computing widths.

type Provider = "jazzcash" | "easypaisa" | "card";

const SOURCES: Record<Provider, { src: string; label: string }> = {
  jazzcash:  { src: "/assets/jazzcash.webp",  label: "JazzCash"  },
  // Note: the file ships as "easypysa.webp" (typo at upload time); kept
  // as-is so we don't have to rename a binary asset.
  easypaisa: { src: "/assets/easypysa.webp",  label: "Easypaisa" },
  card:      { src: "/assets/mastercard.jpeg", label: "Card"     },
};

export default function PaymentLogo({
  provider,
  height = 22,
  className,
}: {
  provider: Provider;
  height?: number;
  className?: string;
}) {
  const { src, label } = SOURCES[provider];
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={label}
      className={className}
      style={{
        display: "inline-block",
        verticalAlign: "middle",
        height,
        width: "auto",
        objectFit: "contain",
      }}
    />
  );
}
