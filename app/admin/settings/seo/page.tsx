import SectionShell from "../SectionShell";
import { dynamic, loadSettings, asString } from "../_shared";

export { dynamic };
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
        {/* Meta basics */}
        <div>
          <label className="admin-label" htmlFor="seo_site_title">Site title</label>
          <input
            id="seo_site_title"
            name="setting:seo_site_title"
            className="admin-input"
            defaultValue={asString(s["seo_site_title"])}
            placeholder="SubscribAI — Premium AI Subscriptions"
          />
          <p className="admin-help">
            Default <code>&lt;title&gt;</code>. Individual pages (products, blog) get more specific titles automatically.
          </p>
        </div>

        <div>
          <label className="admin-label" htmlFor="seo_default_description">Default description</label>
          <textarea
            id="seo_default_description"
            name="setting:seo_default_description"
            className="admin-textarea"
            defaultValue={asString(s["seo_default_description"])}
            placeholder="Premium AI subscriptions delivered in minutes…"
            rows={3}
          />
          <p className="admin-help">Shown by Google as the snippet. 150–160 chars is ideal.</p>
        </div>

        <div>
          <label className="admin-label" htmlFor="seo_default_keywords">Default keywords</label>
          <input
            id="seo_default_keywords"
            name="setting:seo_default_keywords"
            className="admin-input"
            defaultValue={asString(s["seo_default_keywords"])}
            placeholder="AI subscriptions, ChatGPT Plus, Claude Pro"
          />
          <p className="admin-help">Comma-separated. Low impact for Google today, still useful for some engines.</p>
        </div>

        {/* OG / social */}
        <div className="admin-row cols-2">
          <div>
            <label className="admin-label" htmlFor="seo_og_image">Default OG image URL</label>
            <input
              id="seo_og_image"
              name="setting:seo_og_image"
              type="url"
              className="admin-input"
              defaultValue={asString(s["seo_og_image"])}
              placeholder="https://res.cloudinary.com/…"
            />
            <p className="admin-help">Shown on WhatsApp / Twitter / Facebook link previews. 1200×630 ideal.</p>
          </div>
          <div>
            <label className="admin-label" htmlFor="seo_twitter_handle">Twitter handle</label>
            <input
              id="seo_twitter_handle"
              name="setting:seo_twitter_handle"
              className="admin-input"
              defaultValue={asString(s["seo_twitter_handle"])}
              placeholder="@subscribai"
            />
            <p className="admin-help">Used as <code>twitter:creator</code> on shared posts.</p>
          </div>
        </div>

        {/* Verification + analytics */}
        <div className="admin-row cols-2">
          <div>
            <label className="admin-label" htmlFor="seo_google_verification">Search Console verification</label>
            <input
              id="seo_google_verification"
              name="setting:seo_google_verification"
              className="admin-input"
              defaultValue={asString(s["seo_google_verification"])}
              placeholder="abc123…"
            />
            <p className="admin-help">From Google Search Console → HTML tag method → just the <code>content</code> value.</p>
          </div>
          <div>
            <label className="admin-label" htmlFor="seo_google_analytics">Google Analytics 4 ID</label>
            <input
              id="seo_google_analytics"
              name="setting:seo_google_analytics"
              className="admin-input"
              defaultValue={asString(s["seo_google_analytics"])}
              placeholder="G-XXXXXXXXXX"
            />
            <p className="admin-help">Auto-injects gtag.js site-wide when set.</p>
          </div>
        </div>

        <div>
          <label className="admin-label" htmlFor="seo_facebook_pixel">Facebook Pixel ID</label>
          <input
            id="seo_facebook_pixel"
            name="setting:seo_facebook_pixel"
            className="admin-input"
            defaultValue={asString(s["seo_facebook_pixel"])}
            placeholder="1234567890"
          />
          <p className="admin-help">For Meta ads attribution. Leave empty if you don&rsquo;t use it.</p>
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
