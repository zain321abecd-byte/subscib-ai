import Image from "next/image";

type BrandLogoProps = {
  size?: number;
  className?: string;
  priority?: boolean;
};

export default function BrandLogo({ size = 40, className = "", priority = false }: BrandLogoProps) {
  return (
    <Image
      src="/assets/subscribai-symbol.png"
      alt="SubscribAI"
      width={size}
      height={size}
      priority={priority}
      className={`brand-symbol ${className}`.trim()}
    />
  );
}
