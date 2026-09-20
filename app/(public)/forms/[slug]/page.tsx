import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSupabaseAdmin, hasServiceRole } from "@/lib/supabase/admin";
import { absoluteUrl } from "@/lib/site-url";
import { priceLabel, productTypeLabel, type ProductFormRow } from "@/lib/product-forms";
import RequestFormClient from "./RequestFormClient";

export const dynamic = "force-dynamic";

/**
 * Read the form server-side with the service role. product_forms is admin-only
 * under RLS on purpose: the anon key must not be able to enumerate forms, and
 * the customer only ever needs the one they were linked to.
 */
async function loadForm(slug: string): Promise<ProductFormRow | null> {
  if (!hasServiceRole()) return null;
  const { data, error } = await getSupabaseAdmin()
    .from("product_forms")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  if (error || !data) return null;
  return data as ProductFormRow;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const form = await loadForm(slug);
  if (!form) return { title: "Form not found", robots: { index: false, follow: false } };

  return {
    title: `${form.name} — request form`,
    description: `Request ${form.product_name} from SubscribAI. Enter your name, phone, and email and we'll confirm your order.`,
    alternates: { canonical: absoluteUrl(`/forms/${form.slug}`) },
    // These links are handed out directly; they shouldn't compete with the
    // catalog in search results.
    robots: { index: false, follow: false },
  };
}

export default async function ProductRequestFormPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const form = await loadForm(slug);
  if (!form) notFound();

  return (
    <main className="v2-container" style={{ maxWidth: 620, padding: "48px 20px 72px" }}>
      <header style={{ marginBottom: 24 }}>
        <p
          style={{
            margin: "0 0 6px",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontSize: "0.72rem",
            fontWeight: 700,
            color: "var(--brand-600, #4884FF)",
          }}
        >
          {productTypeLabel(form.product_type)} request
        </p>
        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.9rem", margin: "0 0 8px" }}>
          {form.name}
        </h1>
        {form.intro && (
          <p style={{ color: "var(--text-soft, var(--text-muted))", margin: 0, lineHeight: 1.6 }}>
            {form.intro}
          </p>
        )}
      </header>

      {/* Product summary — shown, never editable, never submitted. The server
          re-reads all of this from the database when the request comes in. */}
      <section
        aria-label="Product details"
        style={{
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: "16px 18px",
          marginBottom: 20,
          background: "var(--surface, rgba(255,255,255,0.03))",
        }}
      >
        <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: "10px 18px", margin: 0, fontSize: "0.92rem" }}>
          <dt style={{ color: "var(--text-muted)" }}>Product</dt>
          <dd style={{ margin: 0, fontWeight: 600 }}>{form.product_name}</dd>

          {form.renewal_note && (
            <>
              <dt style={{ color: "var(--text-muted)" }}>Renewal</dt>
              <dd style={{ margin: 0 }}>{form.renewal_note}</dd>
            </>
          )}

          <dt style={{ color: "var(--text-muted)" }}>Price</dt>
          <dd style={{ margin: 0, fontWeight: 600 }}>
            {priceLabel(form.price, form.currency, form.plan_duration)}
          </dd>
        </dl>
      </section>

      <RequestFormClient slug={form.slug} productName={form.product_name} />
    </main>
  );
}
