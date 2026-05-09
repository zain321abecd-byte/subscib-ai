import SectionShell from "../SectionShell";
import FloatField from "../../FloatField";
import { dynamic, loadSettings, asString } from "../_shared";

export { dynamic };
export const metadata = { title: "General · Settings" };

export default async function GeneralSettings({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const [params, s] = await Promise.all([searchParams, loadSettings()]);

  return (
    <SectionShell
      title="General"
      subtitle="Customer-facing contact details."
      returnTo="/admin/settings/general"
      saved={params.saved === "1"}
      error={params.error}
    >
      <div className="admin-form-stack">
        <FloatField
          id="whatsapp_number"
          name="setting:whatsapp_number"
          label="WhatsApp number"
          icon="fa-brands fa-whatsapp"
          defaultValue={asString(s["whatsapp_number"])}
          hint={<>International format, no <code>+</code> or spaces. Used for every WhatsApp link across the site.</>}
        />

        <FloatField
          id="contact_email"
          name="setting:contact_email"
          label="Contact email"
          type="email"
          icon="fa-envelope"
          defaultValue={asString(s["contact_email"])}
          hint={<>Shown in the footer and used in <code>mailto:</code> links.</>}
        />
      </div>
    </SectionShell>
  );
}
