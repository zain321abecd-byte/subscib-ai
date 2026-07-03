"use client";

/**
 * Description editor for the admin product form.
 *
 * Uses ReactQuill (Snow theme) — the same choice as the lifecycle-app
 * project. Quill parses pasted content (from Google Docs, Word, and
 * most importantly ChatGPT/plain-text Markdown) into clean HTML on
 * its own, so no bespoke paste plugin is needed.
 *
 * The output HTML is stored verbatim in products.description and read
 * back through <RichTextRenderer />, which sanitises with DOMPurify
 * before rendering to the customer.
 *
 * A hidden <input name={name}> mirrors the current HTML so the
 * existing Server Action's FormData.get("description") flow keeps
 * working with zero server-side changes.
 */
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import "react-quill-new/dist/quill.snow.css";

// Quill needs `window` at construction time; skip SSR to avoid the
// "document is not defined" crash during the Next build.
const ReactQuill = dynamic(() => import("react-quill-new"), {
  ssr: false,
  loading: () => (
    <div className="rte-loading">
      <span className="admin-spinner" /> Loading editor…
    </div>
  ),
});

type Props = {
  /** FormData field name — matches the old textarea. */
  name: string;
  defaultValue?: string;
  placeholder?: string;
  onChange?: (html: string) => void;
};

// Toolbar buttons — richer than lifecycle-app's compact set because
// product descriptions get headings, bullets, and blockquotes.
const modules = {
  toolbar: [
    [{ header: [2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["blockquote", "code-block"],
    ["link"],
    [{ align: [] }],
    ["clean"],
  ],
  clipboard: {
    // Strip the confusing MS Word / Google Docs style baggage that
    // Quill would otherwise carry over, while keeping structural tags.
    matchVisual: false,
  },
};

const formats = [
  "header",
  "bold", "italic", "underline", "strike",
  "list", "bullet",
  "blockquote", "code-block",
  "link",
  "align",
];

/**
 * Old rows saved by the plain textarea are just text — wrap them in a
 * paragraph so Quill treats them as content rather than blowing up
 * with a "no delta" error on load.
 */
function seedContent(raw: string): string {
  const s = (raw || "").trim();
  if (!s) return "";
  if (/<(p|h[1-6]|ul|ol|li|blockquote|strong|em|a|br|div|span)\b/i.test(s)) return s;
  const escaped = s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<p>${escaped.replace(/\n{2,}/g, "</p><p>").replace(/\n/g, "<br/>")}</p>`;
}

export default function RichTextEditor({
  name, defaultValue = "", placeholder = "Write a description… paste from ChatGPT if you like — formatting is preserved.", onChange,
}: Props) {
  const initial = useMemo(() => seedContent(defaultValue), [defaultValue]);
  const [html, setHtml] = useState(initial);

  const handleChange = (value: string) => {
    // Quill's "empty" state is <p><br></p>. Normalise so the FormData
    // value is a real empty string when the shopper leaves it blank.
    const normalised = value === "<p><br></p>" ? "" : value;
    setHtml(normalised);
    onChange?.(normalised);
  };

  return (
    <div className="rte-wrap">
      <ReactQuill
        theme="snow"
        value={html}
        onChange={handleChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />
      {/* Mirror the HTML into a hidden input so the existing
          Server Action reads it via FormData.get(name) unchanged. */}
      <input type="hidden" name={name} value={html} />
    </div>
  );
}
