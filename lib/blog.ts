import { getSupabaseServer } from "@/lib/supabase/server";
import type { BlogPostRow } from "@/lib/supabase/types";

export type Post = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readMins: number;
  tag: "Guide" | "Compare" | "Automation" | "News";
  author: string;
  authorInitials: string;
  authorColor: string;
  featured?: boolean;
  /** Markdown-style body — newlines split into paragraphs at render time */
  body: string;
};

export const POSTS: Post[] = [
  {
    slug: "ai-for-pakistani-businesses",
    title: "AI for Pakistani businesses: where to start without burning rupees",
    excerpt: "A practical playbook for picking your first AI tool — what it should do for you in week one, and which to skip until later.",
    date: "Apr 22, 2026",
    readMins: 8,
    tag: "Guide",
    author: "Ali Raza",
    authorInitials: "AR",
    authorColor: "var(--brand-soft)",
    featured: true,
    body: `If you're a small business in Pakistan looking at AI for the first time, the catalog is overwhelming. There are sixty tools that could in theory help you, and another two hundred influencers telling you which one to buy. This guide cuts through that.

## Start with the boring problems

The biggest mistake first-time AI buyers make is picking the most exciting tool. Don't. Start with the boring task that eats your week — usually one of these:

- Writing the same proposal email twenty times a month
- Captioning Instagram posts you've already created
- Translating between English and Urdu for marketing copy
- Summarizing long PDFs your suppliers send

ChatGPT Plus or Claude Pro will solve all four of these. That's where to start. Eighteen dollars a month, paid in PKR via JazzCash. By week two you've already saved more time than the subscription cost.

## What to skip in week one

Image generation, video, voice cloning, automation packs. Not because they're bad — they're great — but because their value depends on a workflow you haven't built yet. Buy them in month two when you actually have a use case in front of you.

## The one rule for measuring ROI

Every Sunday, ask yourself: did this tool save me an hour this week? If yes for three weeks in a row, keep paying. If no, cancel and try a different one. AI subscriptions in Pakistan are cheap enough that you can afford to experiment, but not so cheap that you should pay for tools you don't use.

## When you're ready to add more

Once your writing is on autopilot, add Canva Pro for visuals. Then add an automation pack to glue everything together. Then a course to learn the patterns properly. The order matters: each one builds on the last.`,
  },
  {
    slug: "chatgpt-vs-claude",
    title: "ChatGPT Plus vs Claude Pro: which $20 to spend",
    excerpt: "Side-by-side on writing, code, vision, file uploads, and Pakistan-specific quirks like Urdu support.",
    date: "Apr 14, 2026",
    readMins: 6,
    tag: "Compare",
    author: "Sara Hashmi",
    authorInitials: "SH",
    authorColor: "var(--accent-soft)",
    body: `If you can only afford one premium AI subscription this month, here's how to pick.

## Pick ChatGPT Plus if…

You want the most polished consumer product. The voice mode is excellent. The image generator built into the chat is convenient. The custom GPTs ecosystem means you can find a pre-built tool for almost any niche. Plus the broad public familiarity means tutorials and templates are everywhere.

## Pick Claude Pro if…

You write or code for a living. Claude is noticeably better at long-form prose, has a better sense of nuance in instructions, and tends to push back when you're wrong instead of agreeing with everything. The longer context window means you can paste big PDFs and codebases without trimming.

## Pakistan-specific notes

Both handle Urdu reasonably well, but Claude tends to be more accurate on idioms. ChatGPT has stronger image generation. Both can be paid for via local SubscribAI checkout in PKR — no forex hassle.

## My honest recommendation

If you're hesitant, start with ChatGPT Plus. It's a friendlier first experience. Switch to Claude Pro after a month if you find yourself doing more serious writing or code work. Many of our customers eventually subscribe to both — the combined ~$37/month covers most knowledge work.`,
  },
  {
    slug: "make-com-flows",
    title: "5 Make.com flows every freelancer should set up",
    excerpt: "Lead capture, client onboarding, invoice nudges, content recycling, weekly metrics — built once, runs forever.",
    date: "Apr 02, 2026",
    readMins: 9,
    tag: "Automation",
    author: "Usman Khan",
    authorInitials: "UK",
    authorColor: "var(--info-soft)",
    body: `Freelancers waste hours a week on tasks that should automate themselves. Here are the five flows I've built for every freelancer I've consulted with — and they always pay back the investment within a month.

## 1. Lead capture → CRM

Any contact form on your site or DM on Instagram should end up in one place. Wire your form provider into a Notion database via webhook, with fields for name, email, project description, source, and date. Tag automatically based on keywords.

## 2. Client onboarding

When a deal closes, fire a flow that creates a Notion project page, generates a Google Drive folder with template subfolders, sends a calendar invite for kickoff, and emails the client a welcome message with the brief link. Saves about thirty minutes per new client.

## 3. Invoice nudges

Set up a daily cron that checks invoices marked "sent" but not "paid" and emails reminders at 7, 14, and 21 days overdue. Stops you having awkward "did you receive the invoice" conversations.

## 4. Content recycling

When you publish a blog post or LinkedIn article, queue it back into your content database with a "republish in 90 days" date. Each Monday, pull the queue and draft three social posts based on the original. You've doubled your content output.

## 5. Weekly metrics email

Every Friday, pull totals from your time tracker, invoicing tool, and CRM, format them into a one-page email, and send to yourself. Forces a weekly review without you having to remember to do one.

All five are in the SubscribAI Automation Starter Pack — pre-built, ready to import, just plug in your accounts.`,
  },
  {
    slug: "midjourney-prompts-pk",
    title: "Midjourney prompts that actually look Pakistani",
    excerpt: "How to nudge the model toward authentic local visuals — clothing, cities, light, and color palettes.",
    date: "Mar 25, 2026",
    readMins: 5,
    tag: "Guide",
    author: "Sara Hashmi",
    authorInitials: "SH",
    authorColor: "var(--accent-soft)",
    body: `Default Midjourney outputs trend Western. With the right prompt structure, you can get visuals that genuinely feel like Pakistan — useful for marketing, content, and editorial work.

## The structure that works

A good Pakistan-themed Midjourney prompt has four parts: subject, location specifics, lighting, and visual reference. Skip any one and the output drifts back to generic.

## Location specifics

Naming a city is rarely enough. Add a neighborhood (Anarkali, Saddar, Defence) and a specific feature (rickshaw stand, food street, monsoon-soaked alley). The model has more training data on these than you'd expect.

## Lighting

Pakistan's golden hour is famously distinctive — soft, diffused, dust-tinted. "Late afternoon Lahore light, low sun, atmospheric haze" pushes the model in the right direction. Avoid "studio lighting" or "even lighting" if you want a sense of place.

## Color palettes

Saturated reds and golds for festivals, muted earth tones for everyday street scenes, deep greens for the northern areas. Calling out specific palettes ("warm spice tones, terracotta, gold accents") helps a lot.

## Visual references

Add a few comparable artists or styles ("inspired by South Asian photojournalism") rather than naming Pakistani artists directly — model coverage of named local artists is patchy. The full Midjourney Mastery course in our shop walks through fifty proven prompt patterns.`,
  },
  {
    slug: "best-ai-tools-for-students",
    title: "Best AI tools for students in Pakistan (and how to actually pay for them)",
    excerpt: "A no-nonsense list of which AI subscriptions are worth your stipend money — and how to subscribe from Pakistan without a foreign card.",
    date: "Apr 28, 2026",
    readMins: 7,
    tag: "Guide",
    author: "Sara Hashmi",
    authorInitials: "SH",
    authorColor: "var(--accent-soft)",
    body: `If you&rsquo;re a student in Pakistan, AI tools can save you days of work — research, writing, design, problem-solving. The catch: most charge in dollars, on cards your bank may not let you use. Here&rsquo;s a tight starter pack and how to actually get them.

## The shortlist for students

You don&rsquo;t need ten subscriptions. Pick one or two from this list based on what you actually study.

- **ChatGPT Plus or Claude Pro** — for everything text-based. Essays, summarising readings, fixing your code, explaining things you missed in class. Pick Claude if you write a lot or do programming; pick ChatGPT if you want a friendlier all-rounder.
- **Perplexity Pro** — when your work needs cited sources. Better than a vanilla LLM for research papers.
- **Notion AI** — if you already use Notion for notes. The summarise and rewrite features pay for themselves the night before exams.
- **Canva Pro** — if you do any visual work (presentations, posters, society events). Saves hours of fiddling with slide layouts.

That&rsquo;s a $20&ndash;$40 stack a month. Way less than the time it saves.

## What to skip in your first month

Image AI (Midjourney, Leonardo) is gorgeous but rarely critical for coursework. Voice AI (ElevenLabs) is fun but specialised. Automation packs (Make.com / Zapier) are powerful but the learning curve doesn&rsquo;t pay off until you have a regular workflow to automate. Add these later when you have a clear use case.

## How to pay from Pakistan

The standard route — international credit card — fails for most local debit cards and many credit cards. Even when it works, you&rsquo;re paying forex on top of the subscription price.

Local AI resellers (like SubscribAI) solve this by handling the international payment on your behalf, then taking PKR from you via JazzCash, Easypaisa, or any local card. End result: same subscription, same login, paid in rupees, no forex hassle.

## Tips that actually save money

- **Buy yearly when you&rsquo;re sure.** Most tools give a meaningful discount on yearly plans. SubscribAI&rsquo;s Growth bundle is 20% cheaper if you commit for a year.
- **Pool with classmates.** Many AI tools allow shared access on team plans. Three people splitting a Growth bundle pay roughly $20 each.
- **Cancel between exams.** If you only need ChatGPT during finals, subscribe for one month and cancel. Local resellers don&rsquo;t auto-charge — you confirm renewals manually.

## One last thing

Don&rsquo;t pay sketchy sellers on Discord or Facebook for cracked accounts. They get banned, you lose access, and there&rsquo;s no one to complain to. Buy from a reseller that has a real WhatsApp number, replacement guarantees, and a public refund policy. The savings aren&rsquo;t worth the headache.`,
  },
  {
    slug: "subscribai-jazzcash-launch",
    title: "We're now live with JazzCash and Easypaisa",
    excerpt: "After three months of integration testing, you can pay locally without a single international transaction.",
    date: "Mar 12, 2026",
    readMins: 3,
    tag: "News",
    author: "SubscribAI Team",
    authorInitials: "SA",
    authorColor: "var(--warning-soft)",
    body: `Three months ago we got tired of customers asking why every checkout still required a credit card. So we built local payment in.

Starting today, you can pay for any subscription on SubscribAI directly with JazzCash, Easypaisa, or any local debit/credit card. The processor is SahulatPay, which is locally licensed and properly handles the bank-side reconciliation we couldn't manage on our own.

## What changes for you

- No more international card declines
- No more forex fees on top of the subscription price
- No more "let me try a different card" after every checkout
- Wallet payments are activated within minutes when approved in the app

## What stays the same

- Same catalog of premium AI tools
- Same activation timelines (under thirty minutes for most)
- Same WhatsApp support
- Same replacement guarantees on every subscription

If you're an existing customer with active subscriptions, your renewals will switch over automatically next billing cycle. Nothing to do on your end.

If anything goes sideways during checkout, message us on WhatsApp — we monitor it during all working hours.`,
  },
];

export function findPost(slug: string): Post | undefined {
  return POSTS.find((p) => p.slug === slug);
}

// Backwards-compat alias: STATIC_POSTS is what the static array represents now.
export const STATIC_POSTS = POSTS;

// ─────────────────────────────────────────────────────────────────────────────
// DB-backed getters with static fallback
// ─────────────────────────────────────────────────────────────────────────────
function rowToPost(row: BlogPostRow): Post {
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    body: row.body,
    date: row.date,
    readMins: row.read_mins,
    tag: row.tag as Post["tag"],
    author: row.author,
    authorInitials: row.author_initials,
    authorColor: row.author_color,
    featured: row.featured,
  };
}

function supabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export async function getAllPosts(): Promise<Post[]> {
  if (!supabaseConfigured()) return STATIC_POSTS;
  try {
    const supabase = await getSupabaseServer();
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("published", true)
      .order("date", { ascending: false });
    if (error || !data || data.length === 0) return STATIC_POSTS;
    return (data as BlogPostRow[]).map(rowToPost);
  } catch {
    return STATIC_POSTS;
  }
}

export async function getPost(slug: string): Promise<Post | undefined> {
  if (!supabaseConfigured()) return STATIC_POSTS.find((p) => p.slug === slug);
  try {
    const supabase = await getSupabaseServer();
    const { data, error } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("slug", slug)
      .eq("published", true)
      .maybeSingle();
    if (error || !data) return STATIC_POSTS.find((p) => p.slug === slug);
    return rowToPost(data as BlogPostRow);
  } catch {
    return STATIC_POSTS.find((p) => p.slug === slug);
  }
}
