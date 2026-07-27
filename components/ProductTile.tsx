import Link from "next/link";
import BrandIcon from "@/components/BrandIcon";
import type { Product } from "@/lib/products";

/**
 * Square brand tile + name underneath — no price, no Buy button.
 * Shared by the homepage "Popular" rail and the shop category grid so the
 * media-resolution rules (and the light tile brand icons need) live in one place.
 *
 * `has-brand-icon` matters: brand icons render in their official hex
 * (Claude #D97757, Notion #000…), which vanishes on the default dark surface.
 */
export default function ProductTile({
  product,
  iconSize = 48,
}: {
  product: Product;
  iconSize?: number;
}) {
  const kind: "image" | "brand" | "fallback" =
    product.imageUrl ? "image" : product.brand ? "brand" : "fallback";

  return (
    <Link className="pl-tile" href={`/product/${product.id}`}>
      <span
        className={`pl-tile-media ${
          kind === "image" ? "has-product-image" : kind === "brand" ? "has-brand-icon" : ""
        }`}
      >
        {kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.imageUrl} alt="" loading="lazy" />
        ) : kind === "brand" ? (
          <BrandIcon name={product.brand!} size={iconSize} />
        ) : (
          <i className={product.iconClass}></i>
        )}
      </span>
      <span className="pl-tile-name">{product.name}</span>
    </Link>
  );
}
