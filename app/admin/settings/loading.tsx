/**
 * Loading skeleton shown while the newly-clicked settings section is
 * still fetching on the server. Next renders this instantly (no data
 * fetch) so navigation feels immediate — see SettingsNav.tsx for the
 * click-side treatment that turns the target tab orange the moment
 * you click it, before the new page mounts.
 */
export default function SettingsLoading() {
  return (
    <div className="settings-content" style={{ padding: "18px 0" }}>
      <div className="admin-card" style={{ padding: 22 }}>
        <div className="settings-skeleton-title" />
        <div className="settings-skeleton-subtitle" />
        <div className="admin-form-stack" style={{ marginTop: 24 }}>
          <div className="settings-skeleton-field" />
          <div className="settings-skeleton-field" />
          <div className="settings-skeleton-field" />
          <div className="settings-skeleton-field" />
        </div>
      </div>
    </div>
  );
}
