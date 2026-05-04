import SettingsNav from "./SettingsNav";

export const metadata = { title: "Settings" };

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="admin-page-head">
        <div>
          <h1>Site settings</h1>
          <p>Global configuration. Changes apply to the public site within seconds.</p>
        </div>
      </header>

      <SettingsNav />
      <div className="settings-content">{children}</div>
    </>
  );
}
