import SectionShell from "../SectionShell";
import FloatField from "../../FloatField";
import { loadSettings, asString } from "../_shared";

export const dynamic = "force-dynamic";
export const metadata = { title: "SEO · Settings" };

export default async function SeoSettings({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const [params, s] = await Promise.all([searchParams, loadSettings()]);

  return (
    <SectionShell
      title="SEO &amp; tracking"
      subtitle="Default page metadata + analytics. Picked up automatically by every public page."
      returnTo="/admin/settings/seo"
      saved={params.saved === "1"}
      error={params.error}
    >
      <div className="admin-form-stack">
        <FloatField
          id="seo_site_title"
          name="setting:seo_site_title"
          label="Site title"
          icon="fa-globe"
          defaultValue={asString(s["seo_site_title"])}
          hint={<>Default <code>&lt;title&gt;</code>. Individual pages (products, blog) get more specific titles automatically.</>}
        />

        <FloatField
          as="textarea"
          id="seo_default_description"
          name="setting:seo_default_description"
          label="Default description"
          icon="fa-align-left"
          defaultValue={asString(s["seo_default_description"])}
          rows={3}
          hint="Shown by Google as the snippet. 150–160 chars is ideal."
        />

        <FloatField
          id="seo_default_keywords"
          name="setting:seo_default_keywords"
          label="Default keywords"
          icon="fa-tags"
          defaultValue={asString(s["seo_default_keywords"])}
          hint="Comma-separated. Low impact for Google today, still useful for some engines."
        />

        <div className="admin-row cols-2">
          <FloatField
            id="seo_og_image"
            name="setting:seo_og_image"
            type="url"
            label="Default OG image URL"
            icon="fa-image"
            defaultValue={asString(s["seo_og_image"])}
            hint="Shown on WhatsApp / Twitter / Facebook link previews. 1200×630 ideal."
          />
          <FloatField
            id="seo_twitter_handle"
            name="setting:seo_twitter_handle"
            label="Twitter handle"
            icon="fa-brands fa-x-twitter"
            defaultValue={asString(s["seo_twitter_handle"])}
            hint={<>Used as <code>twitter:creator</code> on shared posts.</>}
          />
        </div>

        <div className="admin-row cols-2">
          <FloatField
            id="google_site_verification"
            name="setting:google_site_verification"
            label="Search Console verification"
            icon="fa-shield-halved"
            defaultValue={asString(s["google_site_verification"] || s["seo_google_verification"])}
            hint={<>From Google Search Console → HTML tag method → just the <code>content</code> value. Only the token — never the full <code>&lt;meta&gt;</code> tag.</>}
          />
          <FloatField
            id="google_analytics_id"
            name="setting:google_analytics_id"
            label="Google Analytics 4 ID"
            icon="fa-chart-line"
            defaultValue={asString(s["google_analytics_id"] || s["seo_google_analytics"])}
            hint={<>e.g. <code>G-XXXXXXXXXX</code>. Auto-injects gtag.js site-wide when set.</>}
          />
        </div>

        <div className="admin-row cols-2">
          <FloatField
            id="google_tag_manager_id"
            name="setting:google_tag_manager_id"
            label="Google Tag Manager ID"
            icon="fa-cubes"
            defaultValue={asString(s["google_tag_manager_id"])}
            hint={<>e.g. <code>GTM-XXXXXXX</code>. Container script + noscript fallback injected automatically.</>}
          />
          <FloatField
            id="meta_pixel_id"
            name="setting:meta_pixel_id"
            label="Meta / Facebook Pixel ID"
            icon="fa-brands fa-facebook"
            defaultValue={asString(s["meta_pixel_id"] || s["seo_facebook_pixel"])}
            hint="For Meta ads attribution. Only the numeric ID — no script."
          />
        </div>

        {/* Indexing toggle */}
        <div className="settings-bool-row">
          <input type="hidden" name="setting:seo_index_site" value="false" />
          <label className="admin-toggle">
            <input
              type="checkbox"
              name="setting:seo_index_site"
              value="true"
              defaultChecked={asString(s["seo_index_site"]) !== "false"}
            />
            <span className="admin-toggle-slider" aria-hidden />
            <span>
              <strong>Allow search engines to index this site</strong>
              <small>When off, every page gets a noindex tag. Useful for staging.</small>
            </span>
          </label>
        </div>
      </div>
    </SectionShell>
  );
}
