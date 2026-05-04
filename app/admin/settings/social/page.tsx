import SectionShell from "../SectionShell";
import { dynamic, loadSettings, asString } from "../_shared";

export { dynamic };
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
          <div key={sn.key}>
            <label className="admin-label" htmlFor={sn.key}>
              <i className={`fa-brands ${sn.icon}`} style={{ marginRight: 6, color: "var(--text-muted)" }}></i>
              {sn.label}
            </label>
            <input
              id={sn.key}
              name={`setting:${sn.key}`}
              type="url"
              className="admin-input"
              defaultValue={asString(s[sn.key])}
              placeholder={sn.placeholder}
            />
          </div>
        ))}
      </div>
    </SectionShell>
  );
}
