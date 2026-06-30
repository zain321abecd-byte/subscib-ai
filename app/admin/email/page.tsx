import { requireAdmin } from "@/lib/admin-auth";
import { getAudienceCounts, getEmailStatus } from "./actions";
import EmailClient from "./EmailClient";

export const metadata = { title: "Emails" };
export const dynamic = "force-dynamic";

export default async function AdminEmailPage() {
  const me = await requireAdmin("emails:read");
  const [status, counts] = await Promise.all([getEmailStatus(), getAudienceCounts()]);
  const canSend = me.role === "superadmin" || me.effectivePermissions.includes("emails:send");

  return <EmailClient status={status} counts={counts} canSend={canSend} />;
}
