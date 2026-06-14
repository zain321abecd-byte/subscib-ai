#!/usr/bin/env node
/**
 * Insert missing demo blog posts from data/blogs.ts into Supabase.
 * Existing slugs are left untouched so admin edits are not overwritten.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(path) {
  try {
    const text = readFileSync(path, "utf8");
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
      if (!m) continue;
      const [, k, v] = m;
      if (!(k in process.env)) process.env[k] = v.replace(/^["']|["']$/g, "");
    }
  } catch {
    // Missing env file is fine.
  }
}

function demoPostToRow(post, sortIndex) {
  const date = new Date(post.date);
  const isoDate = Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10);
  const tag =
    post.category === "Automation" ? "Automation" :
    post.category === "Subscriptions" ? "Compare" :
    post.category === "Growth" ? "News" :
    "Guide";

  return {
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt,
    body: post.content,
    date: isoDate,
    read_mins: post.readingTime,
    tag,
    tags: post.tags,
    author: post.author,
    author_initials: post.authorInitials,
    author_color: post.authorColor,
    author_bio: "Sharing practical AI, subscription, and digital growth guides from the SubscribAI editorial team.",
    author_image: null,
    author_social_links: {},
    category_name: post.category,
    cover_url: post.image,
    featured_image_alt: post.title,
    featured: Boolean(post.featured || sortIndex < 3),
    published: true,
    status: "Published",
    scheduled_at: null,
    meta_title: post.title,
    meta_description: post.excerpt,
    focus_keyword: post.tags[0] || null,
    secondary_keywords: post.tags.slice(1),
    canonical_url: null,
    robots_index: true,
    robots_follow: true,
    og_title: post.title,
    og_description: post.excerpt,
    og_image: post.image,
    twitter_title: post.title,
    twitter_description: post.excerpt,
    twitter_image: post.image,
    schema_type: "BlogPosting",
    faq_items: [],
    related_post_ids: [],
  };
}

async function loadDemoBlogs() {
  const sourcePath = resolve(process.cwd(), "data/blogs.ts");
  const source = readFileSync(sourcePath, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const tempPath = join(tmpdir(), `subscribai-demo-blogs-${Date.now()}.mjs`);
  writeFileSync(tempPath, compiled, "utf8");
  const module = await import(pathToFileURL(tempPath).href);
  return module.BLOGS;
}

async function main() {
  loadEnvFile(resolve(process.cwd(), ".env.local"));
  loadEnvFile(resolve(process.cwd(), ".env"));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  const blogs = await loadDemoBlogs();
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const slugs = blogs.map((post) => post.slug);
  const { data, error: readError } = await supabase
    .from("blog_posts")
    .select("slug")
    .in("slug", slugs);

  if (readError) throw readError;

  const existing = new Set((data ?? []).map((row) => row.slug));
  const missing = blogs
    .map((post, index) => demoPostToRow(post, index))
    .filter((post) => !existing.has(post.slug));

  if (missing.length === 0) {
    console.log("All demo blog posts already exist.");
    return;
  }

  const { error } = await supabase.from("blog_posts").insert(missing);
  if (error) throw error;

  console.log(`Inserted ${missing.length} demo blog post${missing.length === 1 ? "" : "s"}.`);
  missing.forEach((post) => console.log(`- ${post.slug}`));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
