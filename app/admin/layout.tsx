import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PortalAuthProvider } from "@/lib/portal-auth";
import { getAdminContext } from "@/lib/admin-auth";
import AdminShell from "./AdminShell";

export const metadata: Metadata = {
  title: { default: "Admin · SubscribAI", template: "%s · SubscribAI Admin" },
  robots: { index: false, follow: false },
};

// Pages reachable without a portal session (the gate must not bounce these).
const PUBLIC_ADMIN_PATHS = new Set(["/admin/login", "/admin/accept-invite", "/admin/diagnostics"]);

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get("x-pathname") || "/admin";

  // Login / accept-invite / diagnostics render without the gate or the chrome.
  if (PUBLIC_ADMIN_PATHS.has(pathname)) {
    return (
      <PortalAuthProvider>
        <AdminShell>{children}</AdminShell>
      </PortalAuthProvider>
    );
  }

  // Authoritative server-side gate — the middleware only checks the token's
  // presence, this hits the backend /portal/me to verify it's actually valid
  // and to resolve the effective permissions.
  const access = await getAdminContext();
  if (!access) {
    redirect("/admin/login?error=not_admin");
  }

  return (
    <PortalAuthProvider>
      <AdminShell
        role={access.role}
        permissions={access.effectivePermissions}
        me={{ id: access.userId, email: access.email, name: access.name, isSuper: access.isSuper }}
      >
        {children}
      </AdminShell>
    </PortalAuthProvider>
  );
}
