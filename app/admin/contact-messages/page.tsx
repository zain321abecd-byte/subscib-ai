import { requireAdmin } from "@/lib/admin-auth";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { ContactMessageRow } from "@/lib/supabase/types";
import ContactMessagesClient from "./ContactMessagesClient";

export const metadata = { title: "Contact Messages · Admin" };
export const dynamic = "force-dynamic";

export default async function ContactMessagesPage() {
  await requireAdmin();

  const { data, error } = await getSupabaseAdmin()
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(300);

  const messages = ((data ?? []) as ContactMessageRow[]).map((row) => ({
    ...row,
    status: row.status || "unread",
  }));

  return (
    <>
      <header className="admin-page-head">
        <div>
          <h1>Contact Messages</h1>
          <p>Read customer messages submitted from the contact page.</p>
        </div>
      </header>

      {error && (
        <div className="admin-card" style={{ background: "rgba(239,68,68,0.10)", borderColor: "rgba(239,68,68,0.30)", color: "#fca5a5", marginBottom: 14 }}>
          {error.message}
        </div>
      )}

      <ContactMessagesClient messages={error ? [] : messages} />
    </>
  );
}
