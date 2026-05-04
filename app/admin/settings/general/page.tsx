import SectionShell from "../SectionShell";
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
        <div>
          <label className="admin-label" htmlFor="whatsapp_number">WhatsApp number</label>
          <input
            id="whatsapp_number"
            name="setting:whatsapp_number"
            className="admin-input"
            defaultValue={asString(s["whatsapp_number"])}
            placeholder="923331234567"
          />
          <p className="admin-help">International format, no <code>+</code> or spaces. Used for every WhatsApp link across the site.</p>
        </div>

        <div>
          <label className="admin-label" htmlFor="contact_email">Contact email</label>
          <input
            id="contact_email"
            name="setting:contact_email"
            type="email"
            className="admin-input"
            defaultValue={asString(s["contact_email"])}
            placeholder="contact@yourcompany.com"
          />
          <p className="admin-help">Shown in the footer and used in <code>mailto:</code> links.</p>
        </div>
      </div>
    </SectionShell>
  );
}
