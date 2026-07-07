export const SITE_URL = "https://subscribai.com";

export function absoluteUrl(path = "/") {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${SITE_URL}${cleanPath === "/" ? "/" : cleanPath.replace(/\/{2,}/g, "/")}`;
}
