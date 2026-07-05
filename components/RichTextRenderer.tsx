/**
 * Safe renderer for the HTML stored in products.description.
 *
 * The admin editor (TipTap / Quill) writes clean HTML into the field.
 * We sanitise on every render — never trust stored HTML at the
 * boundary even when the input path was controlled by a signed-in
 * admin. `sanitize-html` is pure JavaScript (no jsdom, no native
 * modules) so it works cleanly on serverless functions — the previous
 * `isomorphic-dompurify` implementation pulled in `jsdom` → `@exodus/bytes`
 * which crashed Vercel with `require() of ES Module` errors.
 *
 * Backwards compat: rows created before the editor was introduced
 * store either plain text or Markdown. Plain text is wrapped so its
 * line breaks and paragraphs survive; Markdown-ish content shows as-is.
 */
import sanitizeHtml from "sanitize-html";

/** Wrap loose plain text so paragraph and line-break semantics survive. */
function wrapPlainText(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  // If the string already looks like HTML, hand it straight to the sanitiser.
  if (/<(p|h[1-6]|ul|ol|li|blockquote|strong|em|a|br|div|span)\b/i.test(trimmed)) {
    return trimmed;
  }
  const escaped = trimmed
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<p>${escaped.replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br />")}</p>`;
}

/**
 * Tags + attributes the renderer allows. Deliberately narrow — no
 * <script>, <iframe>, <style>, event handlers, or `on*` attrs.
 * Data URIs are blocked so nobody can smuggle base64-encoded script.
 *
 * Every <a> gets `target="_blank"` + `rel="noopener noreferrer nofollow"`
 * forced on via `transformTags` so external navigation is always safe
 * regardless of what the editor wrote.
 */
const SANITISE_CONFIG: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "strong", "em", "u", "s", "code", "pre", "blockquote",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li",
    "a",
    "span",
    "hr",
  ],
  allowedAttributes: {
    a:    ["href", "target", "rel", "class"],
    span: ["class", "style"],
    "*":  ["class"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesAppliedToAttributes: ["href"],
  allowProtocolRelative: false,
  // Force safe link attributes even if the editor forgot them.
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", {
      target: "_blank",
      rel: "noopener noreferrer nofollow",
    }, true),
  },
  // Strip inline style declarations entirely — too easy to hide
  // background-image: url(...) exfil, position: fixed abuse, etc.
  allowedStyles: {},
};

export default function RichTextRenderer({
  content, className, fallback,
}: {
  content: string | null | undefined;
  className?: string;
  fallback?: React.ReactNode;
}) {
  const raw = (content ?? "").toString();
  if (!raw.trim()) return <>{fallback ?? null}</>;
  const wrapped = wrapPlainText(raw);
  const cleaned = sanitizeHtml(wrapped, SANITISE_CONFIG);
  return (
    <div
      className={`rte-content ${className || ""}`.trim()}
      // Sanitised output — every tag + attribute has been through
      // sanitize-html, links are re-armed with target/rel via
      // transformTags, inline scripts / event handlers stripped. Safe.
      dangerouslySetInnerHTML={{ __html: cleaned }}
    />
  );
}
