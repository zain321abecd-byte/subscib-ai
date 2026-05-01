import { getSupabaseServer } from "@/lib/supabase/server";
import { saveSettings } from "./actions";
import StyledSelectField from "../StyledSelectField";
import type { SiteSettingRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

// Settings we know about. The DB can hold extras, but we render a curated
// set so admins aren't faced with a key-value soup.
const KNOWN_SETTINGS: { key: string; label: string; help?: string; type?: "text" | "textarea" | "url" }[] = [
  { key: "whatsapp_number",  label: "WhatsApp number", help: "International format, no + or spaces. Used for all WhatsApp links across the site." },
  { key: "contact_email",    label: "Contact email" },
  { key: "hero_headline",    label: "Hero headline" },
  { key: "hero_subtext",     label: "Hero subtext", type: "textarea" },
  { key: "social_instagram", label: "Instagram URL", type: "url" },
  { key: "social_facebook",  label: "Facebook URL", type: "url" },
  { key: "social_tiktok",    label: "TikTok URL", type: "url" },
  { key: "social_youtube",   label: "YouTube URL", type: "url" },
];

const CURRENCY_MODES = [
  { value: "auto",        label: "Auto (PKR for Pakistan, USD elsewhere)" },
  { value: "always_pkr",  label: "Always PKR (with USD as side note)" },
  { value: "always_usd",  label: "Always USD" },
  { value: "dual",        label: "Dual (USD primary, PKR side note)" },
];

function asString(v: unknown): string {
  if (typeof v === "string") return v;
  if (v == null) return "";
  return String(v);
}

export default async function SettingsAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.from("site_settings").select("*");
  const rows = (data ?? []) as SiteSettingRow[];
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  return (
    <>
      <header className="admin-page-head">
        <div>
          <h1>Site settings</h1>
          <p>Global config that powers the public site. Changes go live immediately.</p>
        </div>
      </header>

      {params.saved && (
        <div className="admin-card" style={{ background: "rgba(34,197,94,0.10)", borderColor: "rgba(34,197,94,0.30)", color: "#86efac", marginBottom: 14 }}>
          Settings saved.
        </div>
      )}

      {error && (
        <div className="admin-card" style={{ background: "rgba(239,68,68,0.10)", borderColor: "rgba(239,68,68,0.30)", color: "#fca5a5", marginBottom: 14 }}>
          {error.message}
        </div>
      )}

      <form action={saveSettings} className="admin-form admin-form-narrow">
        <section className="admin-card">
          <header className="admin-section-head">
            <h3>Contact</h3>
            <p>Customer-facing contact details used across the site.</p>
          </header>
          <div className="admin-form-stack">
            {KNOWN_SETTINGS.filter((s) => s.key.startsWith("whatsapp_") || s.key.startsWith("contact_")).map((s) => (
              <div key={s.key}>
                <label className="admin-label" htmlFor={s.key}>{s.label}</label>
                {s.type === "textarea" ? (
                  <textarea id={s.key} name={`setting:${s.key}`} className="admin-textarea" defaultValue={asString(byKey[s.key])} />
                ) : (
                  <input id={s.key} name={`setting:${s.key}`} type={s.type ?? "text"} className="admin-input" defaultValue={asString(byKey[s.key])} />
                )}
                {s.help && <p className="admin-help">{s.help}</p>}
              </div>
            ))}
          </div>
        </section>

        <section className="admin-card">
          <header className="admin-section-head">
            <h3>Homepage hero</h3>
            <p>Headline and supporting text shown at the top of the homepage.</p>
          </header>
          <div className="admin-form-stack">
            {KNOWN_SETTINGS.filter((s) => s.key.startsWith("hero_")).map((s) => (
              <div key={s.key}>
                <label className="admin-label" htmlFor={s.key}>{s.label}</label>
                {s.type === "textarea" ? (
                  <textarea id={s.key} name={`setting:${s.key}`} className="admin-textarea" defaultValue={asString(byKey[s.key])} />
                ) : (
                  <input id={s.key} name={`setting:${s.key}`} type={s.type ?? "text"} className="admin-input" defaultValue={asString(byKey[s.key])} />
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="admin-card">
          <header className="admin-section-head">
            <h3>Currency &amp; region</h3>
            <p>Decide how prices are shown based on where the visitor is.</p>
          </header>
          <div className="admin-form-stack">
            <div>
              <label className="admin-label">Display mode</label>
              <StyledSelectField
                name="setting:currency_mode"
                defaultValue={asString(byKey["currency_mode"]) || "auto"}
                options={CURRENCY_MODES}
                ariaLabel="Currency mode"
              />
              <p className="admin-help">
                In <strong>Auto</strong> mode (recommended), Pakistani visitors see PKR and everyone else sees USD. The header shows a small switcher so users can override.
              </p>
            </div>
            <div className="admin-row cols-2">
              <div>
                <label className="admin-label" htmlFor="fx_rate_pkr_per_usd">FX rate override (PKR per USD)</label>
                <input
                  id="fx_rate_pkr_per_usd"
                  name="setting:fx_rate_pkr_per_usd"
                  type="number"
                  step="0.01"
                  min="0"
                  className="admin-input"
                  defaultValue={asString(byKey["fx_rate_pkr_per_usd"])}
                  placeholder="Leave empty to use the live rate"
                />
                <p className="admin-help">Empty / 0 → use live rate from open.er-api.com.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="admin-card">
          <header className="admin-section-head">
            <h3>Social</h3>
            <p>Leave any blank to hide that icon from the footer.</p>
          </header>
          <div className="admin-row cols-2">
            {KNOWN_SETTINGS.filter((s) => s.key.startsWith("social_")).map((s) => (
              <div key={s.key}>
                <label className="admin-label" htmlFor={s.key}>{s.label}</label>
                <input id={s.key} name={`setting:${s.key}`} type={s.type ?? "url"} className="admin-input" defaultValue={asString(byKey[s.key])} placeholder="https://…" />
              </div>
            ))}
          </div>
        </section>

        <div className="admin-form-actions admin-form-actions-sticky">
          <button type="submit" className="admin-btn admin-btn-primary">Save settings</button>
        </div>
      </form>
    </>
  );
}
