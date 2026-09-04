import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getTemplates } from "../actions";
import TemplatesClient from "./TemplatesClient";

export const metadata = { title: "Message templates" };
export const dynamic = "force-dynamic";

/**
 * Template CRUD. Reading needs `delivery:read` (so anyone who can send can
 * see the wording); creating / editing / deleting needs `delivery:templates`,
 * which the client hides and every action re-checks.
 */
export default async function DeliveryTemplatesPage() {
  const me = await requireAdmin("delivery:read");

  const [templates, productsRes] = await Promise.all([
    getTemplates({ includeInactive: true }),
    getSupabaseAdmin().from("products").select("id, name").order("name", { ascending: true }),
  ]);

  return (
    <div style={{ padding: "24px 28px" }}>
      <TemplatesClient
        initialTemplates={templates}
        products={(productsRes.data as Array<{ id: string; name: string }> | null) ?? []}
        canManage={me.isSuper || me.effectivePermissions.includes("delivery:templates")}
      />
    </div>
  );
}
