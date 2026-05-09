import SectionShell from "../SectionShell";
import FloatField from "../../FloatField";
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
        <FloatField
          id="hero_headline"
          name="setting:hero_headline"
          label="Hero headline"
          icon="fa-heading"
          defaultValue={asString(s["hero_headline"])}
          hint="First line of the homepage hero, before the typewriter animation."
        />

        <FloatField
          as="textarea"
          id="hero_subtext"
          name="setting:hero_subtext"
          label="Hero subtext"
          icon="fa-align-left"
          defaultValue={asString(s["hero_subtext"])}
          rows={4}
          hint="Long-form description under the headline."
        />
      </div>
    </SectionShell>
  );
}
