"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import ImagePicker from "../ImagePicker";
import FloatField from "../FloatField";
import Select from "@/components/Select";
import { calculateSeoScore, estimateReadingTime, extractHeadings, parseFaqItems, slugifyBlogTitle } from "@/lib/blog-seo";
import type { BlogPostRow } from "@/lib/supabase/types";
import { createPost, updatePost } from "./actions";

type Props = {
  post?: BlogPostRow;
  posts?: BlogPostRow[];
};

type Tab = "Content" | "SEO" | "Social Preview" | "Schema" | "Settings";

const TABS: Tab[] = ["Content", "SEO", "Social Preview", "Schema", "Settings"];
const TAG_OPTIONS = ["Guide", "Compare", "Automation", "News"].map((value) => ({ value, label: value }));
const CATEGORY_OPTIONS = ["AI Guides", "Premium Tools", "Automation", "Subscriptions", "Growth"].map((value) => ({ value, label: value }));
const STATUS_OPTIONS = ["Draft", "Published", "Scheduled"].map((value) => ({ value, label: value }));
const SCHEMA_OPTIONS = ["BlogPosting", "Article"].map((value) => ({ value, label: value }));
const COLOR_OPTIONS = [
  { value: "var(--brand-soft)", label: "Orange", swatch: "linear-gradient(135deg, #8FB4FF, #4884FF)" },
  { value: "var(--accent-soft)", label: "Pink", swatch: "linear-gradient(135deg, #ff8db8, #d6336c)" },
  { value: "var(--info-soft)", label: "Blue", swatch: "linear-gradient(135deg, #6dc1ff, #3a7bd5)" },
  { value: "var(--warning-soft)", label: "Amber", swatch: "linear-gradient(135deg, #F8B055, #F59622)" },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

function localDateTime(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

function csv(value?: string[] | null) {
  return value?.join(", ") || "";
}

function getStatus(post?: BlogPostRow) {
  if (!post) return "Draft";
  if (post.status) return post.status;
  if (post.scheduled_at && new Date(post.scheduled_at) > new Date()) return "Scheduled";
  return post.published ? "Published" : "Draft";
}

export default function PostForm({ post, posts = [] }: Props) {
  const isEdit = !!post;
  const [pending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<Tab>("Content");
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(post?.title ?? "");
  const [slug, setSlug] = useState(post?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(!!post?.slug);
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const [body, setBody] = useState(post?.body ?? "");
  const [coverUrl, setCoverUrl] = useState(post?.cover_url ?? "");
  const [coverAlt, setCoverAlt] = useState(post?.featured_image_alt ?? "");
  const [category, setCategory] = useState(post?.category_name || "AI Guides");
  const [tag, setTag] = useState(post?.tag || "Guide");
  const [tags, setTags] = useState(csv(post?.tags));
  const [author, setAuthor] = useState(post?.author ?? "SubscribAI Team");
  const [authorInitials, setAuthorInitials] = useState(post?.author_initials ?? "SA");
  const [authorColor, setAuthorColor] = useState(post?.author_color ?? "var(--brand-soft)");
  const [authorBio, setAuthorBio] = useState(post?.author_bio ?? "");
  const [authorImage, setAuthorImage] = useState(post?.author_image ?? "");
  const [authorLinks, setAuthorLinks] = useState(
    post?.author_social_links ? Object.entries(post.author_social_links).map(([k, v]) => `${k}: ${v}`).join("\n") : ""
  );
  const [date, setDate] = useState(post?.date ?? today());
  const [status, setStatus] = useState(getStatus(post));
  const [scheduledAt, setScheduledAt] = useState(localDateTime(post?.scheduled_at));
  const [featured, setFeatured] = useState(post?.featured ?? false);
  const [related, setRelated] = useState(csv(post?.related_post_ids));

  const [metaTitle, setMetaTitle] = useState(post?.meta_title ?? "");
  const [metaDescription, setMetaDescription] = useState(post?.meta_description ?? "");
  const [focusKeyword, setFocusKeyword] = useState(post?.focus_keyword ?? "");
  const [secondaryKeywords, setSecondaryKeywords] = useState(csv(post?.secondary_keywords));
  const [canonicalUrl, setCanonicalUrl] = useState(post?.canonical_url ?? "");
  const [robotsIndex, setRobotsIndex] = useState(post?.robots_index === false ? "noindex" : "index");
  const [robotsFollow, setRobotsFollow] = useState(post?.robots_follow === false ? "nofollow" : "follow");
  const [ogTitle, setOgTitle] = useState(post?.og_title ?? "");
  const [ogDescription, setOgDescription] = useState(post?.og_description ?? "");
  const [ogImage, setOgImage] = useState(post?.og_image ?? post?.cover_url ?? "");
  const [twitterTitle, setTwitterTitle] = useState(post?.twitter_title ?? "");
  const [twitterDescription, setTwitterDescription] = useState(post?.twitter_description ?? "");
  const [twitterImage, setTwitterImage] = useState(post?.twitter_image ?? post?.og_image ?? post?.cover_url ?? "");
  const [schemaType, setSchemaType] = useState(post?.schema_type || "BlogPosting");
  const [faqItems, setFaqItems] = useState(parseFaqItems(post?.faq_items).length ? parseFaqItems(post?.faq_items) : [{ question: "", answer: "" }]);

  useEffect(() => {
    if (!slugTouched) setSlug(slugifyBlogTitle(title));
  }, [title, slugTouched]);

  useEffect(() => {
    if (!coverAlt && title) setCoverAlt(title);
  }, [title, coverAlt]);

  useEffect(() => {
    if (coverUrl && !ogImage) setOgImage(coverUrl);
    if (coverUrl && !twitterImage) setTwitterImage(coverUrl);
  }, [coverUrl, ogImage, twitterImage]);

  const readMins = estimateReadingTime(body);
  const headings = useMemo(() => extractHeadings(body), [body]);
  const cleanFaqItems = useMemo(() => faqItems.filter((item) => item.question.trim() && item.answer.trim()), [faqItems]);
  const score = useMemo(() => calculateSeoScore({
    title,
    slug,
    content: body,
    metaTitle: metaTitle || title,
    metaDescription: metaDescription || excerpt,
    focusKeyword,
    canonicalUrl,
    featuredImageAlt: coverAlt,
    ogImage: ogImage || coverUrl,
    faqItems: cleanFaqItems,
  }), [title, slug, body, metaTitle, metaDescription, excerpt, focusKeyword, canonicalUrl, coverAlt, ogImage, coverUrl, cleanFaqItems]);

  function handleSubmit(formData: FormData) {
    formData.set("read_mins", String(readMins));
    formData.set("faq_items_json", JSON.stringify(cleanFaqItems));
    setError(null);
    startTransition(async () => {
      const action = isEdit ? updatePost : createPost;
      const result = await action(formData);
      if (result && "error" in result) setError(result.error);
    });
  }

  const postUrl = slug ? `https://subscribai.com/blog/${slug}` : "https://subscribai.com/blog/new-post";

  return (
    <form action={handleSubmit} className="admin-form admin-blog-editor">
      {isEdit && <input type="hidden" name="__original_slug" value={post.slug} />}
      <input type="hidden" name="cover_url" value={coverUrl} />
      <input type="hidden" name="og_image" value={ogImage} />
      <input type="hidden" name="twitter_image" value={twitterImage} />
      <input type="hidden" name="author_image" value={authorImage} />
      <input type="hidden" name="faq_items_json" value={JSON.stringify(cleanFaqItems)} />

      {error && <div className="admin-card admin-blog-error">{error}</div>}

      <aside className="admin-card admin-seo-panel">
        <div className="admin-seo-score-head">
          <span>{score.label}</span>
          <strong>{score.score}%</strong>
        </div>
        <div className="admin-seo-meter"><span style={{ width: `${score.score}%` }} /></div>
        <ul>
          {score.checks.map((check) => (
            <li key={check.label} className={check.passed ? "is-pass" : ""}>
              <i className={`fa-solid ${check.passed ? "fa-check" : "fa-circle"}`} />
              {check.label}
            </li>
          ))}
        </ul>
      </aside>

      <section className="admin-card admin-blog-tabs">
        <div className="admin-tab-list" role="tablist" aria-label="Blog editor sections">
          {TABS.map((tab) => (
            <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} className={activeTab === tab ? "is-active" : ""} onClick={() => setActiveTab(tab)}>
              {tab}
            </button>
          ))}
        </div>

        <div hidden={activeTab !== "Content"} className="admin-tab-panel">
          <div className="admin-row cols-2">
            <FloatField id="title" name="title" label="Blog title" icon="fa-heading" required value={title} onChange={(e) => setTitle(e.target.value)} />
            <FloatField id="slug" name="slug" label="Slug / URL" icon="fa-link" required value={slug} onChange={(e) => { setSlugTouched(true); setSlug(slugifyBlogTitle(e.target.value)); }} hint={`/blog/${slug || "post-slug"}`} />
          </div>

          <FloatField as="textarea" id="excerpt" name="excerpt" label="Short excerpt" icon="fa-quote-left" required rows={3} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />

          <div className="admin-blog-image-grid">
            <div>
              <label className="admin-label">Featured image</label>
              <ImagePicker value={coverUrl} onChange={setCoverUrl} folder="blog" />
            </div>
            <FloatField as="textarea" id="featured_image_alt" name="featured_image_alt" label="Featured image alt text" icon="fa-image" rows={4} value={coverAlt} onChange={(e) => setCoverAlt(e.target.value)} />
          </div>

          <FloatField
            as="textarea"
            id="body"
            name="body"
            label="Full content editor"
            icon="fa-align-left"
            required
            rows={18}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            hint="Use Markdown: # H1, ## H2, ### H3, **bold**, [internal link](/shop), [external](https://example.com), ![alt](image.webp), > quote, ```code```, tables, and CTA lines like [Button: Browse Plans](/prices)."
          />

          <div className="admin-editor-tools">
            <span><i className="fa-solid fa-clock" /> {readMins} min read</span>
            <span><i className="fa-solid fa-list" /> {headings.length} TOC items</span>
            <span><i className="fa-solid fa-file-lines" /> {body.trim().split(/\s+/).filter(Boolean).length} words</span>
          </div>
        </div>

        <div hidden={activeTab !== "SEO"} className="admin-tab-panel">
          <div className="admin-row cols-2">
            <FloatField id="meta_title" name="meta_title" label="Meta title" icon="fa-tag" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} hint={`${(metaTitle || title).length}/60 characters`} />
            <FloatField id="focus_keyword" name="focus_keyword" label="Focus keyword" icon="fa-bullseye" value={focusKeyword} onChange={(e) => setFocusKeyword(e.target.value)} />
          </div>
          <FloatField as="textarea" id="meta_description" name="meta_description" label="Meta description" icon="fa-align-left" rows={4} value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} hint={`${(metaDescription || excerpt).length}/160 characters`} />
          <div className="admin-row cols-2">
            <FloatField id="secondary_keywords" name="secondary_keywords" label="Secondary keywords" icon="fa-key" value={secondaryKeywords} onChange={(e) => setSecondaryKeywords(e.target.value)} hint="Comma-separated keyword variants." />
            <FloatField id="canonical_url" name="canonical_url" label="Canonical URL" icon="fa-link" value={canonicalUrl} onChange={(e) => setCanonicalUrl(e.target.value)} hint={postUrl} />
          </div>
          <div className="admin-row cols-2">
            <div>
              <label className="admin-label">Robots index</label>
              <Select value={robotsIndex} onChange={setRobotsIndex} options={[{ value: "index", label: "Index" }, { value: "noindex", label: "Noindex" }]} ariaLabel="Robots index" />
              <input type="hidden" name="robots_index" value={robotsIndex} />
            </div>
            <div>
              <label className="admin-label">Robots follow</label>
              <Select value={robotsFollow} onChange={setRobotsFollow} options={[{ value: "follow", label: "Follow" }, { value: "nofollow", label: "Nofollow" }]} ariaLabel="Robots follow" />
              <input type="hidden" name="robots_follow" value={robotsFollow} />
            </div>
          </div>
          <div className="admin-google-preview">
            <span>{postUrl}</span>
            <strong>{metaTitle || title || "Search result title"}</strong>
            <p>{metaDescription || excerpt || "Search result description will appear here."}</p>
          </div>
        </div>

        <div hidden={activeTab !== "Social Preview"} className="admin-tab-panel">
          <div className="admin-row cols-2">
            <FloatField id="og_title" name="og_title" label="Open Graph title" icon="fa-share-nodes" value={ogTitle} onChange={(e) => setOgTitle(e.target.value)} />
            <FloatField id="twitter_title" name="twitter_title" label="Twitter/X card title" icon="fa-hashtag" value={twitterTitle} onChange={(e) => setTwitterTitle(e.target.value)} />
          </div>
          <div className="admin-row cols-2">
            <FloatField as="textarea" id="og_description" name="og_description" label="Open Graph description" icon="fa-comment" rows={4} value={ogDescription} onChange={(e) => setOgDescription(e.target.value)} />
            <FloatField as="textarea" id="twitter_description" name="twitter_description" label="Twitter/X card description" icon="fa-comment-dots" rows={4} value={twitterDescription} onChange={(e) => setTwitterDescription(e.target.value)} />
          </div>
          <div className="admin-blog-image-grid">
            <div>
              <label className="admin-label">Open Graph image</label>
              <ImagePicker value={ogImage} onChange={setOgImage} folder="blog/social" />
            </div>
            <div>
              <label className="admin-label">Twitter/X card image</label>
              <ImagePicker value={twitterImage} onChange={setTwitterImage} folder="blog/social" />
            </div>
          </div>
          <div className="admin-social-preview-grid">
            <SocialPreview title={ogTitle || metaTitle || title} description={ogDescription || metaDescription || excerpt} image={ogImage || coverUrl} label="Facebook / WhatsApp" />
            <SocialPreview title={twitterTitle || ogTitle || title} description={twitterDescription || ogDescription || excerpt} image={twitterImage || ogImage || coverUrl} label="Twitter/X" />
          </div>
        </div>

        <div hidden={activeTab !== "Schema"} className="admin-tab-panel">
          <div>
            <label className="admin-label">Schema type</label>
            <Select value={schemaType} onChange={setSchemaType} options={SCHEMA_OPTIONS} ariaLabel="Schema type" />
            <input type="hidden" name="schema_type" value={schemaType} />
          </div>
          <div className="admin-faq-builder">
            <div className="admin-section-head">
              <h3>FAQ schema builder</h3>
              <p>These questions appear on the article and in JSON-LD FAQ schema.</p>
            </div>
            {faqItems.map((item, index) => (
              <div className="admin-faq-item" key={index}>
                <FloatField label={`Question ${index + 1}`} icon="fa-circle-question" value={item.question} onChange={(e) => setFaqItems((items) => items.map((faq, i) => i === index ? { ...faq, question: e.target.value } : faq))} />
                <FloatField as="textarea" label={`Answer ${index + 1}`} icon="fa-message" rows={3} value={item.answer} onChange={(e) => setFaqItems((items) => items.map((faq, i) => i === index ? { ...faq, answer: e.target.value } : faq))} />
                <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setFaqItems((items) => items.filter((_, i) => i !== index))}>
                  <i className="fa-solid fa-trash" /> Remove
                </button>
              </div>
            ))}
            <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setFaqItems((items) => [...items, { question: "", answer: "" }])}>
              <i className="fa-solid fa-plus" /> Add FAQ
            </button>
          </div>
          <div className="admin-schema-preview">
            <strong>Generated schema</strong>
            <p>BlogPosting/Article, FAQ, Breadcrumb, and Article metadata are generated on the public post page.</p>
          </div>
        </div>

        <div hidden={activeTab !== "Settings"} className="admin-tab-panel">
          <div className="admin-row cols-3">
            <div>
              <label className="admin-label">Category</label>
              <Select value={category} onChange={setCategory} options={CATEGORY_OPTIONS} ariaLabel="Category" />
              <input type="hidden" name="category_name" value={category} />
            </div>
            <div>
              <label className="admin-label">Post type</label>
              <Select value={tag} onChange={setTag} options={TAG_OPTIONS} ariaLabel="Post type" />
              <input type="hidden" name="tag" value={tag} />
            </div>
            <div>
              <label className="admin-label">Status</label>
              <Select value={status} onChange={setStatus} options={STATUS_OPTIONS} ariaLabel="Status" />
              <input type="hidden" name="status" value={status} />
            </div>
          </div>
          <div className="admin-row cols-3">
            <FloatField id="date" name="date" type="date" label="Published date" icon="fa-calendar" value={date} onChange={(e) => setDate(e.target.value)} />
            <FloatField id="scheduled_at" name="scheduled_at" type="datetime-local" label="Scheduled date" icon="fa-clock" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            <FloatField id="tags" name="tags" label="Tags" icon="fa-tags" value={tags} onChange={(e) => setTags(e.target.value)} hint="Comma-separated tags." />
          </div>
          <div className="admin-row cols-2">
            <FloatField id="author" name="author" label="Author" icon="fa-user" value={author} onChange={(e) => setAuthor(e.target.value)} />
            <FloatField id="author_initials" name="author_initials" label="Author initials" icon="fa-user-tag" maxLength={4} value={authorInitials} onChange={(e) => setAuthorInitials(e.target.value)} />
          </div>
          <FloatField as="textarea" id="author_bio" name="author_bio" label="Author bio" icon="fa-id-card" rows={3} value={authorBio} onChange={(e) => setAuthorBio(e.target.value)} />
          <div className="admin-blog-image-grid">
            <div>
              <label className="admin-label">Author image</label>
              <ImagePicker value={authorImage} onChange={setAuthorImage} folder="authors" shape="avatar" />
            </div>
            <FloatField as="textarea" id="author_social_links" name="author_social_links" label="Author social links" icon="fa-share" rows={4} value={authorLinks} onChange={(e) => setAuthorLinks(e.target.value)} hint="One per line, like linkedin: https://..." />
          </div>
          <div>
            <label className="admin-label">Author avatar colour</label>
            <div className="admin-swatch-row" role="radiogroup" aria-label="Author avatar colour">
              {COLOR_OPTIONS.map((color) => (
                <button key={color.value} type="button" role="radio" aria-checked={authorColor === color.value} className={`admin-swatch ${authorColor === color.value ? "is-active" : ""}`} onClick={() => setAuthorColor(color.value)} title={color.label} style={{ background: color.swatch }}>
                  {authorColor === color.value && <i className="fa-solid fa-check" />}
                </button>
              ))}
            </div>
            <input type="hidden" name="author_color" value={authorColor} />
          </div>
          <label className="admin-toggle">
            <input type="checkbox" name="featured" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
            <span className="admin-toggle-slider" aria-hidden />
            <span><strong>Featured post</strong><small>Show this post in the featured blog section.</small></span>
          </label>
          <div className="admin-related-picker">
            <FloatField id="related_post_ids" name="related_post_ids" label="Related posts" icon="fa-link" value={related} onChange={(e) => setRelated(e.target.value)} hint="Comma-separated slugs, or use the quick-select buttons below." />
            <div>
              {posts.filter((item) => item.slug !== post?.slug).slice(0, 12).map((item) => (
                <button key={item.slug} type="button" className="admin-mini-chip" onClick={() => setRelated((current) => Array.from(new Set([...current.split(",").map((v) => v.trim()).filter(Boolean), item.slug])).join(", "))}>
                  {item.title}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="admin-form-actions admin-form-actions-sticky">
        <Link href="/admin/blog" className="admin-btn admin-btn-ghost">Cancel</Link>
        <button type="submit" className="admin-btn admin-btn-primary" disabled={pending}>
          {pending ? <><span className="admin-spinner" /> Saving...</> : isEdit ? "Save changes" : "Create post"}
        </button>
      </div>
    </form>
  );
}

function SocialPreview({ title, description, image, label }: { title: string; description: string; image: string; label: string }) {
  return (
    <div className="admin-social-preview">
      <span>{label}</span>
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" />
      ) : (
        <div className="admin-social-preview-empty">No image selected</div>
      )}
      <strong>{title || "Social preview title"}</strong>
      <p>{description || "Social preview description will appear here."}</p>
    </div>
  );
}
