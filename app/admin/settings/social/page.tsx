import SectionShell from "../SectionShell";
import FloatField from "../../FloatField";
import { loadSettings, asString } from "../_shared";

export const dynamic = "force-dynamic";
export const metadata = { title: "Social · Settings" };

const SOCIALS: { key: string; label: string; placeholder: string; icon: string }[] = [
  { key: "social_instagram", label: "Instagram", placeholder: "https://instagram.com/your-handle", icon: "fa-instagram" },
  { key: "social_facebook",  label: "Facebook",  placeholder: "https://facebook.com/your-page",   icon: "fa-facebook" },
  { key: "social_tiktok",    label: "TikTok",    placeholder: "https://tiktok.com/@your-handle",  icon: "fa-tiktok" },
  { key: "social_youtube",   label: "YouTube",   placeholder: "https://youtube.com/@your-channel", icon: "fa-youtube" },
];

export default async function SocialSettings({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const [params, s] = await Promise.all([searchParams, loadSettings()]);

  return (
    <SectionShell
      title="Social"
      subtitle="Leave a field blank to hide that icon from the footer."
      returnTo="/admin/settings/social"
      saved={params.saved === "1"}
      error={params.error}
    >
      <div className="admin-form-stack">
        {SOCIALS.map((sn) => (
          <FloatField
            key={sn.key}
            id={sn.key}
            name={`setting:${sn.key}`}
            type="url"
            label={sn.label}
            icon={`fa-brands ${sn.icon}`}
            defaultValue={asString(s[sn.key])}
          />
        ))}
      </div>
    </SectionShell>
  );
}
