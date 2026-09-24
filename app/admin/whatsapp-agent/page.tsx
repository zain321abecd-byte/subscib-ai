import { requireAdmin } from "@/lib/admin-auth";
import WhatsAppAgentClient from "./WhatsAppAgentClient";

export const metadata = { title: "WhatsApp AI Agent" };
export const dynamic = "force-dynamic";

/**
 * WhatsApp AI Agent admin page — start/stop the automated agent, view live
 * conversations. Gated on `delivery:read`, same as the other WhatsApp screens.
 */
export default async function WhatsAppAgentPage() {
  await requireAdmin("delivery:read");

  return (
    <div>
      <WhatsAppAgentClient />
    </div>
  );
}
