import SectionShell from "../SectionShell";
import FloatField from "../../FloatField";
import { loadSettings, asString } from "../_shared";

export const dynamic = "force-dynamic";
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
      subtitle="Customer-facing contact details and business info."
      returnTo="/admin/settings/general"
      saved={params.saved === "1"}
      error={params.error}
    >
      <div className="admin-form-stack">
        <FloatField
          id="business_name"
          name="setting:business_name"
          label="Business name"
          icon="fa-building"
          defaultValue={asString(s["business_name"])}
          hint="Shown in the footer, structured data, and email templates."
        />

        <div className="admin-row cols-2">
          <FloatField
            id="whatsapp_number"
            name="setting:whatsapp_number"
            label="WhatsApp number"
            icon="fa-brands fa-whatsapp"
            defaultValue={asString(s["whatsapp_number"])}
            hint={<>International format. Non-digits are stripped automatically before saving.</>}
          />

          <FloatField
            id="support_phone"
            name="setting:support_phone"
            label="Support phone (optional)"
            icon="fa-phone"
            defaultValue={asString(s["support_phone"])}
            hint="Non-WhatsApp support line. Shown on the contact page if set."
          />
        </div>

        <FloatField
          id="contact_email"
          name="setting:contact_email"
          label="Contact email"
          type="email"
          icon="fa-envelope"
          defaultValue={asString(s["contact_email"])}
          hint={<>Shown in the footer and used in <code>mailto:</code> links. Must be a valid address.</>}
        />

        <FloatField
          as="textarea"
          id="business_address"
          name="setting:business_address"
          label="Business address (optional)"
          icon="fa-location-dot"
          defaultValue={asString(s["business_address"])}
          rows={2}
          hint="Shown on the contact page + in structured data (Organization schema)."
        />
      </div>
    </SectionShell>
  );
}
