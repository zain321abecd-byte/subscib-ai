import { getSupabaseServer } from "@/lib/supabase/server";
import { createFreebie, deleteFreebie, updateFreebie } from "./actions";
import DeleteSubmit from "./DeleteSubmit";
import type { FreebieRow } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

export default async function FreebiesAdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const params = await searchParams;
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase
    .from("freebies")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("title", { ascending: true });
  const freebies = (data ?? []) as FreebieRow[];

  return (
    <>
      <header className="admin-page-head">
        <div>
          <h1>Freebies</h1>
          <p>Lead magnets shown on /freebies. Customers request via WhatsApp.</p>
        </div>
      </header>

      {(params.created || params.updated || params.deleted) && (
        <div className="admin-card" style={{ background: "rgba(34,197,94,0.10)", borderColor: "rgba(34,197,94,0.30)", color: "#86efac", marginBottom: 14 }}>
          {params.created && "Freebie added."}
          {params.updated && "Freebie updated."}
          {params.deleted && "Freebie deleted."}
        </div>
      )}

      {error && (
        <div className="admin-card" style={{ background: "rgba(239,68,68,0.10)", borderColor: "rgba(239,68,68,0.30)", color: "#fca5a5", marginBottom: 14 }}>
          {error.message}
        </div>
      )}

      <form action={createFreebie} className="admin-card">
        <h3 style={{ fontFamily: "var(--font-heading)", fontSize: "1rem", color: "var(--text)", margin: "0 0 12px" }}>Add freebie</h3>
        <div className="admin-row cols-2">
          <div>
            <label className="admin-label">Slug</label>
            <input name="id" required className="admin-input" pattern="[a-z0-9][a-z0-9\-]*" placeholder="prompt-pack" />
          </div>
          <div>
            <label className="admin-label">Title</label>
            <input name="title" required className="admin-input" placeholder="The 50-Prompt Starter Pack" />
          </div>
        </div>
        <div>
          <label className="admin-label">Description</label>
          <textarea name="description" required className="admin-textarea" placeholder="Quick pitch — what's inside and why it's free." />
        </div>
        <div className="admin-row cols-3">
          <div>
            <label className="admin-label">FontAwesome icon</label>
            <input name="icon_class" className="admin-input" placeholder="fa-solid fa-bolt" />
          </div>
          <div>
            <label className="admin-label">File URL (optional)</label>
            <input name="file_url" type="url" className="admin-input" placeholder="https://..." />
          </div>
          <div>
            <label className="admin-label">Sort order</label>
            <input name="sort_order" type="number" defaultValue={0} className="admin-input" />
          </div>
        </div>
        <div>
          <label className="admin-label">WhatsApp message (pre-filled)</label>
          <input name="whatsapp_msg" className="admin-input" placeholder="Hi! I'd like the 50-Prompt Starter Pack." />
        </div>
        <label className="admin-checkbox-row">
          <input type="checkbox" name="active" defaultChecked />
          Active (shown on /freebies)
        </label>
        <div className="admin-form-actions">
          <button type="submit" className="admin-btn admin-btn-primary">Add freebie</button>
        </div>
      </form>

      <div style={{ marginTop: 22, display: "grid", gap: 14 }}>
        {freebies.length === 0 ? (
          <div className="admin-card admin-empty">
            <i className="fa-solid fa-gift"></i>
            <div>No freebies yet.</div>
          </div>
        ) : freebies.map((f) => (
          <details key={f.id} className="admin-card">
            <summary style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 12, listStyle: "none" }}>
              <i className={`fa-solid ${f.icon_class?.replace("fa-solid ", "") || "fa-gift"}`} style={{ color: "var(--brand-300)", fontSize: "1.1rem" }}></i>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: "var(--text)" }}>{f.title}</div>
                <div style={{ fontSize: "0.84rem", color: "var(--text-muted)" }}><code>{f.id}</code></div>
              </div>
              {!f.active && <span className="admin-pill admin-pill-pending">Hidden</span>}
              <i className="fa-solid fa-chevron-down" style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}></i>
            </summary>

            <form action={updateFreebie} className="admin-form" style={{ marginTop: 14 }}>
              <input type="hidden" name="__original_id" value={f.id} />
              <div className="admin-row cols-2">
                <div>
                  <label className="admin-label">Slug</label>
                  <input name="id" required className="admin-input" pattern="[a-z0-9][a-z0-9\-]*" defaultValue={f.id} />
                </div>
                <div>
                  <label className="admin-label">Title</label>
                  <input name="title" required className="admin-input" defaultValue={f.title} />
                </div>
              </div>
              <div>
                <label className="admin-label">Description</label>
                <textarea name="description" required className="admin-textarea" defaultValue={f.description} />
              </div>
              <div className="admin-row cols-3">
                <div>
                  <label className="admin-label">Icon</label>
                  <input name="icon_class" className="admin-input" defaultValue={f.icon_class ?? ""} />
                </div>
                <div>
                  <label className="admin-label">File URL</label>
                  <input name="file_url" type="url" className="admin-input" defaultValue={f.file_url ?? ""} />
                </div>
                <div>
                  <label className="admin-label">Sort order</label>
                  <input name="sort_order" type="number" className="admin-input" defaultValue={f.sort_order} />
                </div>
              </div>
              <div>
                <label className="admin-label">WhatsApp message</label>
                <input name="whatsapp_msg" className="admin-input" defaultValue={f.whatsapp_msg ?? ""} />
              </div>
              <label className="admin-checkbox-row">
                <input type="checkbox" name="active" defaultChecked={f.active} />
                Active
              </label>
              <div className="admin-form-actions">
                <button type="submit" className="admin-btn admin-btn-primary">Save</button>
              </div>
            </form>

            <form action={deleteFreebie} style={{ marginTop: 10 }}>
              <input type="hidden" name="id" value={f.id} />
              <DeleteSubmit label="Delete freebie" />
            </form>
          </details>
        ))}
      </div>
    </>
  );
}
