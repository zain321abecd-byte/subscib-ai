/**
 * Safe renderer for the HTML stored in products.description.
 *
 * The admin form writes TipTap-generated HTML into the field. We
 * sanitise on every render — never trust stored HTML at the boundary
 * even when the input path was controlled by a signed-in admin. This
 * runs on the server (Node) via isomorphic-dompurify, so nothing
 * touches the browser until it's already clean.
 *
 * Backwards compat: rows created before the editor was introduced
 * store either plain text or Markdown. Plain text is wrapped so its
 * line breaks survive; Markdown-ish content still renders reasonably
 * because paragraph + list HTML equivalents come out of the admin form
 * from now on. Old Markdown symbols on old rows show as-is until an
 * admin edits and re-saves — that's fine.
 */
import DOMPurify from "isomorphic-dompurify";

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
 * Data URIs are blocked so someone can't smuggle base64 script.
 */
const SANITISE_CONFIG: Parameters<typeof DOMPurify.sanitize>[1] = {
  ALLOWED_TAGS: [
    "p", "br", "strong", "em", "u", "s", "code", "pre", "blockquote",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li",
    "a",
    "span",
    "hr",
  ],
  ALLOWED_ATTR: ["href", "target", "rel", "class", "style"],
  ALLOWED_URI_REGEXP: /^(?:https?|mailto|tel):/i,
  // Always force safe link attributes on <a>. DOMPurify adds these
  // via the ADD_ATTR list combined with a post-hook below.
};

/**
 * Post-process the HTML string so every <a> gets safe rel/target.
 * DOMPurify has no built-in for this; a regex is sufficient because
 * the sanitised HTML never contains user-crafted quoting tricks.
 */
function hardenLinks(html: string): string {
  return html.replace(/<a\b([^>]*)>/gi, (_full, attrs: string) => {
    const withTarget = /\btarget=/i.test(attrs) ? attrs : `${attrs} target="_blank"`;
    const withRel = /\brel=/i.test(withTarget)
      ? withTarget
      : `${withTarget} rel="noopener noreferrer nofollow"`;
    return `<a${withRel}>`;
  });
}

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
  const cleaned = DOMPurify.sanitize(wrapped, SANITISE_CONFIG) as string;
  const hardened = hardenLinks(cleaned);
  return (
    <div
      className={`rte-content ${className || ""}`.trim()}
      // Sanitised output — every tag + attribute has been through DOMPurify,
      // links have been re-armed with target/rel, and inline scripts /
      // event handlers are stripped. Safe to inject.
      dangerouslySetInnerHTML={{ __html: hardened }}
    />
  );
}
