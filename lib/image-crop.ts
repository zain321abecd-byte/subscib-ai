/**
 * Product image cropping.
 *
 * The admin drags/zooms a square window over the uploaded picture; the chosen
 * region is stored as source-pixel coordinates and applied on delivery, so the
 * exact same crop shows on every surface (shop grid, homepage rails,
 * "You may also like", product page and admin previews).
 *
 * Cloudinary does the cropping server-side via URL transforms, which keeps the
 * bytes small and the result pixel-identical everywhere. Non-Cloudinary URLs
 * are returned untouched — the container still renders them, just uncropped.
 */

export type CropRect = {
  /** Left edge of the crop window, in source pixels. */
  x: number;
  /** Top edge of the crop window, in source pixels. */
  y: number;
  /** Crop width in source pixels (height matches — the window is square). */
  w: number;
  /** Crop height in source pixels. */
  h: number;
};

/** Delivered size of the cropped square. 512 is sharp on retina tiles. */
const OUTPUT_SIZE = 512;

export function serializeCrop(crop: CropRect | null): string {
  if (!crop) return "";
  const r = (n: number) => Math.max(0, Math.round(n));
  return `${r(crop.x)},${r(crop.y)},${r(crop.w)},${r(crop.h)}`;
}

export function parseCrop(value: unknown): CropRect | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const parts = value.split(",").map((n) => Number(n.trim()));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n) || n < 0)) return null;
  const [x, y, w, h] = parts;
  if (w <= 0 || h <= 0) return null;
  return { x, y, w, h };
}

function isCloudinary(url: string): boolean {
  return url.includes("res.cloudinary.com") && url.includes("/upload/");
}

/**
 * Apply a stored crop to an image URL.
 *
 * Cloudinary transforms are inserted right after `/upload/`:
 *   c_crop,x_,y_,w_,h_  → cut the chosen region out of the original
 *   c_fill,w_,h_        → scale that region to the delivered square
 */
export function croppedImageUrl(url: string | undefined, crop: unknown): string | undefined {
  if (!url) return url;
  const rect = parseCrop(crop);
  if (!rect || !isCloudinary(url)) return url;
  const transform = `c_crop,x_${Math.round(rect.x)},y_${Math.round(rect.y)},w_${Math.round(rect.w)},h_${Math.round(rect.h)}/c_fill,w_${OUTPUT_SIZE},h_${OUTPUT_SIZE}`;
  return url.replace("/upload/", `/upload/${transform}/`);
}
