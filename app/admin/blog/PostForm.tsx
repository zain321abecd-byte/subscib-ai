"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import ImagePicker from "../ImagePicker";
import Select from "@/components/Select";
import { createPost, updatePost } from "./actions";
import type { BlogPostRow } from "@/lib/supabase/types";

type TagValue = "Guide" | "Compare" | "Automation" | "News";
const TAG_OPTIONS: { value: TagValue; label: string }[] = [
  { value: "Guide",      label: "Guide" },
  { value: "Compare",    label: "Compare" },
  { value: "Automation", label: "Automation" },
  { value: "News",       label: "News" },
];

const COLOR_OPTIONS: { value: string; label: string; swatch: string }[] = [
  { value: "var(--brand-soft)",   label: "Orange", swatch: "linear-gradient(135deg, #ff9d57, #ff7a1a)" },
  { value: "var(--accent-soft)",  label: "Pink",   swatch: "linear-gradient(135deg, #ff8db8, #d6336c)" },
  { value: "var(--info-soft)",    label: "Blue",   swatch: "linear-gradient(135deg, #6dc1ff, #3a7bd5)" },
  { value: "var(--warning-soft)", label: "Amber",  swatch: "linear-gradient(135deg, #ffd479, #f59e0b)" },
];

const today = () => new Date().toISOString().slice(0, 10);

export default function PostForm({ post }: { post?: BlogPostRow }) {
  const isEdit = !!post;
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string>(post?.cover_url ?? "");
  const [tag, setTag] = useState<TagValue>((post?.tag as TagValue) ?? "Guide");
  const [color, setColor] = useState<string>(post?.author_color ?? "var(--brand-soft)");

  function handleSubmit(formData: FormData) {
    if (coverUrl) formData.set("cover_url", coverUrl);
    setError(null);
    startTransition(async () => {
      const action = isEdit ? updatePost : createPost;
      const result = await action(formData);
      if (result && "error" in result) setError(result.error);
    });
  }

  return (
    <form action={handleSubmit} className="admin-form admin-form-narrow">
      {isEdit && <input type="hidden" name="__original_slug" value={post!.slug} />}

      {error && (
        <div className="admin-card" style={{ background: "rgba(239,68,68,0.10)", borderColor: "rgba(239,68,68,0.30)", color: "#fca5a5" }}>{error}</div>
      )}

      {/* SECTION 1 — Cover image (now first) */}
      <section className="admin-card">
        <header className="admin-section-head">
          <h3>Cover image</h3>
          <p>Used as the OG image (link previews) and on the post hero.</p>
        </header>

        <ImagePicker value={coverUrl} onChange={setCoverUrl} folder="blog" />
        <input type="hidden" name="cover_url" value={coverUrl} />
      </section>

      {/* SECTION 2 — Content */}
      <section className="admin-card">
        <header className="admin-section-head">
          <h3>Content</h3>
          <p>Title, summary, and the full body of the post.</p>
        </header>

        <div className="admin-form-stack">
          <div>
            <label className="admin-label" htmlFor="title">Title</label>
            <input id="title" name="title" required className="admin-input" defaultValue={post?.title ?? ""} placeholder="AI for Pakistani businesses" />
            {isEdit && post?.slug ? (
              <p className="admin-help">
                URL: <code style={{ color: "var(--text-soft)" }}>/blog/{post.slug}</code> · auto-generated, stays stable on edits
              </p>
            ) : (
              <p className="admin-help">URL is auto-generated from the title.</p>
            )}
          </div>

          <div>
            <label className="admin-label" htmlFor="excerpt">Excerpt</label>
            <textarea id="excerpt" name="excerpt" required className="admin-textarea" defaultValue={post?.excerpt ?? ""} placeholder="One-sentence summary shown on the blog index card." />
          </div>

          <div>
            <label className="admin-label" htmlFor="body">Body</label>
            <textarea
              id="body"
              name="body"
              required
              className="admin-textarea"
              defaultValue={post?.body ?? ""}
              style={{ minHeight: 320 }}
              placeholder={"Heading paragraphs are split on double newlines.\n\n## Subheadings start with two hashes.\n\n- Bullets start with a dash."}
            />
            <p className="admin-help">
              Paragraphs split on blank lines. Lines starting with <code>## </code> render as section headings.
              Lines starting with <code>- </code> render as bullets.
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 3 — Meta */}
      <section className="admin-card">
        <header className="admin-section-head">
          <h3>Meta</h3>
          <p>Author info and reading details.</p>
        </header>

        <div className="admin-row cols-3">
          <div>
            <label className="admin-label" htmlFor="date">Publish date</label>
            <input id="date" name="date" type="date" required className="admin-input" defaultValue={post?.date ?? today()} />
          </div>
          <div>
            <label className="admin-label" htmlFor="read_mins">Read minutes</label>
            <input id="read_mins" name="read_mins" type="number" min="1" required className="admin-input" defaultValue={post?.read_mins ?? 5} />
          </div>
          <div>
            <label className="admin-label">Tag</label>
            <Select<TagValue>
              value={tag}
              onChange={setTag}
              options={TAG_OPTIONS}
              ariaLabel="Tag"
            />
            <input type="hidden" name="tag" value={tag} />
          </div>
        </div>

        <div className="admin-row cols-2">
          <div>
            <label className="admin-label" htmlFor="author">Author</label>
            <input id="author" name="author" required className="admin-input" defaultValue={post?.author ?? ""} placeholder="Sara Hashmi" />
          </div>
          <div>
            <label className="admin-label" htmlFor="author_initials">Author initials</label>
            <input id="author_initials" name="author_initials" required className="admin-input" defaultValue={post?.author_initials ?? ""} placeholder="SH" maxLength={4} />
          </div>
        </div>

        <div>
          <label className="admin-label">Author avatar colour</label>
          <div className="admin-swatch-row" role="radiogroup" aria-label="Author avatar colour">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c.value}
                type="button"
                role="radio"
                aria-checked={color === c.value}
                className={`admin-swatch ${color === c.value ? "is-active" : ""}`}
                onClick={() => setColor(c.value)}
                title={c.label}
                style={{ background: c.swatch }}
              >
                {color === c.value && <i className="fa-solid fa-check"></i>}
              </button>
            ))}
          </div>
          <input type="hidden" name="author_color" value={color} />
        </div>
      </section>

      {/* SECTION 4 — Visibility */}
      <section className="admin-card">
        <header className="admin-section-head">
          <h3>Visibility</h3>
          <p>Whether this post is live and where it appears.</p>
        </header>

        <div className="admin-toggle-stack">
          <label className="admin-toggle">
            <input type="checkbox" name="published" defaultChecked={post?.published ?? true} />
            <span className="admin-toggle-slider" aria-hidden />
            <span>
              <strong>Published</strong>
              <small>Visible on the public site. Uncheck to keep as a draft.</small>
            </span>
          </label>
          <label className="admin-toggle">
            <input type="checkbox" name="featured" defaultChecked={post?.featured ?? false} />
            <span className="admin-toggle-slider" aria-hidden />
            <span>
              <strong>Featured</strong>
              <small>Pinned to the top of the blog index.</small>
            </span>
          </label>
        </div>
      </section>

      <div className="admin-form-actions admin-form-actions-sticky">
        <Link href="/admin/blog" className="admin-btn admin-btn-ghost">Cancel</Link>
        <button type="submit" className="admin-btn admin-btn-primary" disabled={pending}>
          {pending ? (
            <>
              <span className="admin-spinner" />
              {isEdit ? "Saving…" : "Creating…"}
            </>
          ) : (
            isEdit ? "Save changes" : "Create post"
          )}
        </button>
      </div>
    </form>
  );
}
