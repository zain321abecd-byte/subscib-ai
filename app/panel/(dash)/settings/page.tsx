import type { Metadata } from "next";
import { requirePanelUser } from "@/lib/panel/auth";
import { PageHeader } from "@/components/panel/ui";
import { ApiKeyPanel, ProfileForm } from "./SettingsForms";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function PanelSettingsPage() {
  const user = await requirePanelUser();

  return (
    <>
      <PageHeader title="Settings" subtitle="Your account and API access." />

      <div className="grid max-w-2xl gap-5">
        <ProfileForm initialName={user.name ?? ""} email={user.email} />
        <ApiKeyPanel hasKey={Boolean(user.profile.api_key)} />

        <div className="panel-card p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">
            Account
          </h2>
          <dl className="mt-3 grid gap-2.5 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--text-muted)]">Panel role</dt>
              <dd className="font-medium text-[var(--text)]">
                {user.isAdmin ? "Administrator" : "Customer"}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--text-muted)]">Panel member since</dt>
              <dd className="font-medium text-[var(--text)]">
                {new Date(user.profile.created_at).toLocaleDateString(undefined, {
                  day: "numeric", month: "long", year: "numeric",
                })}
              </dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-[var(--text-muted)]">
            This is the same account you use on subscribai.com. Changing your password or email is
            handled on the shop side — do it there and it applies here too.
          </p>
        </div>
      </div>
    </>
  );
}
