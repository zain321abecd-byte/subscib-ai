/**
 * Product image crop ratio.
 *
 * The admin picks a ratio when uploading the product picture; that framing is
 * then used everywhere the image appears (homepage sections, shop grid,
 * related products, product page gallery).
 *
 * The ratio is applied to the <img> itself, not the tile, so cards keep a
 * uniform size and the grids stay aligned — the image is cropped to the
 * chosen shape and centred inside its tile.
 */

export const IMAGE_RATIOS = [
  { value: "original", label: "Original", hint: "No crop — the picture keeps its own shape.", css: null },
  { value: "1:1", label: "Square 1:1", hint: "Equal width and height. Best for logos and icons.", css: "1 / 1" },
  { value: "4:3", label: "Landscape 4:3", hint: "Slightly wide. Good for screenshots.", css: "4 / 3" },
  { value: "16:9", label: "Wide 16:9", hint: "Cinematic banner shape.", css: "16 / 9" },
  { value: "3:4", label: "Portrait 3:4", hint: "Taller than wide.", css: "3 / 4" },
] as const;

export type ImageRatio = (typeof IMAGE_RATIOS)[number]["value"];

export const DEFAULT_IMAGE_RATIO: ImageRatio = "original";

/** Narrow an arbitrary DB/form value to a supported ratio. */
export function normaliseImageRatio(value: unknown): ImageRatio {
  const found = IMAGE_RATIOS.find((r) => r.value === value);
  return found ? found.value : DEFAULT_IMAGE_RATIO;
}

/**
 * Inline style that crops an image to the chosen ratio.
 *
 * "original" returns undefined so the existing stylesheet rules keep working
 * untouched — products saved before this option existed look exactly as they
 * did. Any real ratio uses object-fit: cover so the image fills the cropped
 * box instead of letterboxing inside it.
 */
export function imageRatioStyle(ratio: unknown): React.CSSProperties | undefined {
  const entry = IMAGE_RATIOS.find((r) => r.value === normaliseImageRatio(ratio));
  if (!entry?.css) return undefined;
  return {
    aspectRatio: entry.css,
    width: "100%",
    height: "auto",
    maxHeight: "100%",
    objectFit: "cover",
    margin: "auto",
    padding: 0,
  };
}
