// Inline-SVG wordmark badges for the Pakistani payment wallets we accept.
// JazzCash and Easypaisa are not in Simple Icons (and downloading their
// official PNGs into the repo risks trademark issues), so we render
// recognizable pill-shaped wordmarks in each brand's own colour.

type Provider = "jazzcash" | "easypaisa";

const COLORS: Record<Provider, { bg: string; fg: string }> = {
  jazzcash:  { bg: "#ED1C24", fg: "#ffffff" }, // Jazz red
  easypaisa: { bg: "#54B848", fg: "#ffffff" }, // Easypaisa green
};

const LABELS: Record<Provider, { primary: string; secondary?: string }> = {
  jazzcash:  { primary: "Jazz", secondary: "Cash" },
  easypaisa: { primary: "easypaisa" },
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
  const { bg, fg } = COLORS[provider];
  const { primary, secondary } = LABELS[provider];
  const radius = height / 2;
  const padX = height * 0.55;

  // Approximate width — actual widths come from the SVG <text> rendering, so
  // we set viewBox tall and let the parent scale via height.
  const viewW =
    provider === "easypaisa"
      ? height * 5.4
      : height * 4.2;

  return (
    <svg
      role="img"
      aria-label={provider === "jazzcash" ? "JazzCash" : "Easypaisa"}
      className={className}
      height={height}
      viewBox={`0 0 ${viewW} ${height}`}
      style={{ display: "inline-block", verticalAlign: "middle" }}
    >
      <rect x={0} y={0} width={viewW} height={height} rx={radius} ry={radius} fill={bg} />
      {secondary ? (
        // JazzCash — italic "Jazz" + bold "Cash" with a tiny separator dot
        <g
          fill={fg}
          fontFamily="Inter, system-ui, -apple-system, sans-serif"
          fontWeight={800}
          fontSize={height * 0.6}
          dominantBaseline="central"
          textRendering="geometricPrecision"
        >
          <text x={padX} y={height / 2} fontStyle="italic">
            {primary}
          </text>
          <text x={padX + height * 1.55} y={height / 2}>
            {secondary}
          </text>
        </g>
      ) : (
        // Easypaisa — single lowercase wordmark
        <text
          x={padX}
          y={height / 2}
          fill={fg}
          fontFamily="Inter, system-ui, -apple-system, sans-serif"
          fontWeight={700}
          fontSize={height * 0.58}
          dominantBaseline="central"
          textRendering="geometricPrecision"
          letterSpacing="-0.02em"
        >
          {primary}
        </text>
      )}
    </svg>
  );
}
