import { requireAdmin } from "@/lib/admin-auth";
import { getEmailLogs } from "./actions";
import EmailLogsClient from "./EmailLogsClient";

export const metadata = { title: "Email logs" };
export const dynamic = "force-dynamic";

/** Delivery log + live SMTP check. Retry needs emails:send. */
export default async function EmailLogsPage() {
  const me = await requireAdmin("emails:read");
  const logs = await getEmailLogs();

  return (
    <div style={{ padding: "24px 28px" }}>
      <EmailLogsClient
        initialLogs={logs}
        canSend={me.isSuper || me.effectivePermissions.includes("emails:send")}
      />
    </div>
  );
}
