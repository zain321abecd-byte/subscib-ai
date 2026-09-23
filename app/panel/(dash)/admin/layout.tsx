import { requirePanelAdmin } from "@/lib/panel/auth";

export const dynamic = "force-dynamic";

/**
 * Every /panel/admin page sits behind this.
 *
 * The sidebar only shows the admin links to admins and each action re-checks
 * the role itself — this makes a non-admin who types the URL bounce before any
 * admin query runs, rather than relying on the pages to be careful.
 */
export default async function PanelAdminLayout({ children }: { children: React.ReactNode }) {
  await requirePanelAdmin();
  return <>{children}</>;
}
