/**
 * Cloudinary delivery-URL helper.
 *
 * Product and blog artwork is uploaded through the admin (lib/uploads →
 * Cloudinary) and rendered with plain <img> tags, so it never passes through
 * Next's image optimizer. The URLs stored in the DB carry no transformations,
 * which means a blog body image ships as its raw upload — measured on
 * production: 1672×941 PNGs weighing 1.4–1.7 MB each, five or six per article.
 *
 * Adding `f_auto,q_auto,w_<n>,c_limit` makes Cloudinary do the work it's
 * already paid for: AVIF/WebP by Accept header, auto quality, capped width, no
 * crop (`c_limit` only ever shrinks, never enlarges or changes the ratio).
 *
 * Deliberately conservative:
 *   • Non-Cloudinary URLs are returned untouched.
 *   • URLs that already carry a transformation segment are returned untouched,
 *     so anything an admin hand-tuned keeps working.
 *   • No `dpr_auto` (it needs client hints to do anything); a 2× entry in
 *     `srcSet` handles retina instead.
 */

const CLOUDINARY_UPLOAD =
  /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/(?:image|video)\/upload\/)(.+)$/;

/** Widest variant we'll ever ask Cloudinary for. */
const MAX_WIDTH = 1600;

/** Does this path segment look like a Cloudinary transformation list? */
function isTransformSegment(segment: string): boolean {
  if (!segment) return false;
  // A version segment (v1234567890) is not a transformation.
  if (/^v\d+$/.test(segment)) return false;
  // Transformations are comma-separated `key_value` pairs: f_auto,q_auto,w_800
  return segment.split(",").every((part) => /^[a-z]{1,3}_[^,]+$/i.test(part));
}

export interface CdnImageOptions {
  /** Intrinsic width to deliver at 1×. Omit for "as uploaded, just compressed". */
  width?: number;
  /** Cloudinary quality string. "auto" adapts per image. */
  quality?: string;
}

/** Rewrite one Cloudinary URL with the given transformations. */
export function cloudinaryUrl(src: string, options: CdnImageOptions = {}): string {
  if (!src) return src;
  const match = src.match(CLOUDINARY_UPLOAD);
  if (!match) return src;

  const [, base, rest] = match;
  const firstSegment = rest.split("/")[0];
  if (isTransformSegment(firstSegment)) return src; // already transformed — leave it

  const transforms = ["f_auto", `q_${options.quality ?? "auto"}`];
  if (options.width) {
    transforms.push(`w_${Math.min(Math.round(options.width), MAX_WIDTH)}`, "c_limit");
  }
  return `${base}${transforms.join(",")}/${rest}`;
}

export interface CdnImage {
  src: string;
  /** `undefined` for non-Cloudinary URLs, so the attribute is simply omitted. */
  srcSet?: string;
}

/**
 * Build a `src` + 1×/2× `srcSet` pair for an <img>.
 *
 * `displayWidth` is the widest CSS pixel width the image is shown at — the
 * article column, the card, the thumbnail. Pass it and the browser downloads
 * roughly what it needs instead of a full-resolution upload.
 */
export function cdnImage(src: string, displayWidth?: number): CdnImage {
  if (!src) return { src };
  if (!CLOUDINARY_UPLOAD.test(src) || !displayWidth) {
    // Still worth compressing when we don't know the display size.
    return { src: cloudinaryUrl(src) };
  }
  const oneX = cloudinaryUrl(src, { width: displayWidth });
  const twoX = cloudinaryUrl(src, { width: displayWidth * 2 });
  return {
    src: oneX,
    srcSet: oneX === src ? undefined : `${oneX} 1x, ${twoX} 2x`,
  };
}
