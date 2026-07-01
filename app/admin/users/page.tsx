import { requireAdmin, getPortalToken } from "@/lib/admin-auth";
import TeamClient, { type PortalGroupDto, type PortalUserDto } from "./TeamClient";

export const metadata = { title: "Team · Admin" };
export const dynamic = "force-dynamic";

async function backendFetch<T>(path: string, token: string): Promise<T> {
  const base = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");
  if (!base) throw new Error("NEXT_PUBLIC_API_URL is not set.");
  const res = await fetch(`${base}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || `GET ${path} → ${res.status}`);
  }
  return (await res.json()) as T;
}

export default async function TeamPage() {
  // Gate: users:read is the "can see the team page" permission.
  const me = await requireAdmin("users:read");
  const token = (await getPortalToken()) as string;

  const [{ users }, { groups }, catalog] = await Promise.all([
    backendFetch<{ users: PortalUserDto[] }>("/admin/portal-users", token),
    backendFetch<{ groups: PortalGroupDto[] }>("/admin/portal-groups", token),
    backendFetch<{ permissions: string[]; groups: Array<{ label: string; keys: string[] }> }>(
      "/admin/portal-groups/catalog",
      token,
    ),
  ]);

  return (
    <div style={{ padding: "24px 28px" }}>
      <TeamClient
        me={{ id: me.userId, email: me.email, isSuper: me.isSuper }}
        initialUsers={users}
        initialGroups={groups}
        catalog={catalog}
      />
    </div>
  );
}
