import SectionShell from "../SectionShell";
import { dynamic, loadSettings, asString } from "../_shared";

export { dynamic };
export const metadata = { title: "Branding · Settings" };

export default async function BrandingSettings({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const [params, s] = await Promise.all([searchParams, loadSettings()]);

  return (
    <SectionShell
      title="Branding"
      subtitle="Headline and supporting copy shown at the top of the homepage."
      returnTo="/admin/settings/branding"
      saved={params.saved === "1"}
      error={params.error}
    >
      <div className="admin-form-stack">
        <div>
          <label className="admin-label" htmlFor="hero_headline">Hero headline</label>
          <input
            id="hero_headline"
            name="setting:hero_headline"
            className="admin-input"
            defaultValue={asString(s["hero_headline"])}
            placeholder="Premium AI tools,"
          />
          <p className="admin-help">First line of the homepage hero, before the typewriter animation.</p>
        </div>

        <div>
          <label className="admin-label" htmlFor="hero_subtext">Hero subtext</label>
          <textarea
            id="hero_subtext"
            name="setting:hero_subtext"
            className="admin-textarea"
            defaultValue={asString(s["hero_subtext"])}
            placeholder="Activated to your inbox in under 30 minutes…"
            rows={4}
          />
          <p className="admin-help">Long-form description under the headline.</p>
        </div>
      </div>
    </SectionShell>
  );
}
