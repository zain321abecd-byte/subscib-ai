import { saveSettings } from "./actions";

// Reusable wrapper for each settings sub-section. Shows a status banner from
// query params, renders the children inside a <form>, and adds the standard
// Save button + a hidden return-to so the action redirects here on success.
export default function SectionShell({
  title,
  subtitle,
  returnTo,
  saved,
  error,
  children,
}: {
  title: string;
  subtitle?: string;
  returnTo: string;
  saved?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="settings-section">
      <header className="settings-section-head">
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </header>

      {saved && (
        <div className="admin-card settings-banner settings-banner-ok">
          <i className="fa-solid fa-circle-check"></i> Settings saved.
        </div>
      )}
      {error && (
        <div className="admin-card settings-banner settings-banner-err">
          <i className="fa-solid fa-circle-exclamation"></i> {error}
        </div>
      )}

      <form action={saveSettings} className="admin-form">
        <input type="hidden" name="__return_to" value={returnTo} />
        {children}
        <div className="admin-form-actions admin-form-actions-sticky">
          <button type="submit" className="admin-btn admin-btn-primary">
            <i className="fa-solid fa-floppy-disk"></i> Save
          </button>
        </div>
      </form>
    </section>
  );
}
