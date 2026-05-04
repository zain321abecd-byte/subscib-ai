import SectionShell from "../SectionShell";
import StyledSelectField from "../../StyledSelectField";
import { dynamic, loadSettings, asString } from "../_shared";

export { dynamic };
export const metadata = { title: "Currency · Settings" };

const CURRENCY_MODES = [
  { value: "auto",        label: "Auto — local currency by region" },
  { value: "always_pkr",  label: "Always PKR (with USD as side note)" },
  { value: "always_usd",  label: "Always USD" },
  { value: "dual",        label: "Dual — show both side-by-side" },
];

export default async function CurrencySettings({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const [params, s] = await Promise.all([searchParams, loadSettings()]);

  return (
    <SectionShell
      title="Currency &amp; FX"
      subtitle="How prices are displayed across the site."
      returnTo="/admin/settings/currency"
      saved={params.saved === "1"}
      error={params.error}
    >
      <div className="admin-form-stack">
        <div>
          <label className="admin-label">Display mode</label>
          <StyledSelectField
            name="setting:currency_mode"
            defaultValue={asString(s["currency_mode"]) || "auto"}
            options={CURRENCY_MODES}
            ariaLabel="Currency mode"
          />
          <p className="admin-help">
            <strong>Auto</strong> shows PKR for Pakistani visitors and USD for everyone else (recommended).
            <strong> Always</strong> modes force one currency for everyone.
          </p>
        </div>

        <div>
          <label className="admin-label" htmlFor="fx_rate_pkr_per_usd">FX rate override (PKR per USD)</label>
          <input
            id="fx_rate_pkr_per_usd"
            name="setting:fx_rate_pkr_per_usd"
            type="number"
            step="0.01"
            min="0"
            className="admin-input"
            defaultValue={asString(s["fx_rate_pkr_per_usd"])}
            placeholder="Leave empty to use the live rate"
          />
          <p className="admin-help">Empty / 0 → use the live rate from open.er-api.com (refreshed every 24h on the server).</p>
        </div>

        <div className="settings-bool-row">
          <input type="hidden" name="setting:currency_switcher" value="false" />
          <label className="admin-toggle">
            <input
              type="checkbox"
              name="setting:currency_switcher"
              value="true"
              defaultChecked={asString(s["currency_switcher"]) !== "false"}
            />
            <span className="admin-toggle-slider" aria-hidden />
            <span>
              <strong>Show currency switcher in header</strong>
              <small>Lets visitors flip USD ↔ PKR manually. Hidden when display mode isn&rsquo;t &ldquo;auto&rdquo;.</small>
            </span>
          </label>
        </div>
      </div>
    </SectionShell>
  );
}
