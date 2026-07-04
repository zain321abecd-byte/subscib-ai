import SectionShell from "../SectionShell";
import FloatField from "../../FloatField";
import { loadSettings, asString } from "../_shared";

export const dynamic = "force-dynamic";
export const metadata = { title: "Content · Settings" };

export default async function ContentSettings({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const [params, s] = await Promise.all([searchParams, loadSettings()]);

  return (
    <SectionShell
      title="Homepage &amp; footer content"
      subtitle="Marketing copy shown on the homepage hero + footer. Edits appear on the site immediately after saving."
      returnTo="/admin/settings/content"
      saved={params.saved === "1"}
      error={params.error}
    >
      <div className="admin-form-stack">
        <FloatField
          id="hero_headline"
          name="setting:hero_headline"
          label="Hero headline"
          icon="fa-heading"
          defaultValue={asString(s["hero_headline"])}
          hint="First line of the homepage hero. Keep punchy — 4–6 words works best."
        />

        <FloatField
          as="textarea"
          id="hero_subtext"
          name="setting:hero_subtext"
          label="Hero subtext"
          icon="fa-align-left"
          defaultValue={asString(s["hero_subtext"])}
          rows={2}
          hint="Supporting sentence under the hero headline."
        />

        <FloatField
          as="textarea"
          id="footer_text"
          name="setting:footer_text"
          label="Footer tagline"
          icon="fa-align-left"
          defaultValue={asString(s["footer_text"])}
          rows={2}
          hint="Shown under the logo in the site footer. Leave blank to use the default."
        />
      </div>
    </SectionShell>
  );
}
