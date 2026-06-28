import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthProvider } from "@/lib/auth";
import { getAdminContext } from "@/lib/admin-auth";
import AdminShell from "./AdminShell";

export const metadata: Metadata = {
  title: { default: "Admin · SubscribAI", template: "%s · SubscribAI Admin" },
  robots: { index: false, follow: false },
};

// Pages reachable without a back-office session (the gate must not bounce these).
const PUBLIC_ADMIN_PATHS = new Set(["/admin/login", "/admin/diagnostics"]);

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = (await headers()).get("x-pathname") || "/admin";

  // Login / diagnostics render without the gate or the chrome.
  if (PUBLIC_ADMIN_PATHS.has(pathname)) {
    return (
      <AuthProvider>
        <AdminShell>{children}</AdminShell>
      </AuthProvider>
    );
  }

  // Authoritative server-side gate. Middleware already redirects non-admins,
  // but enforcing again here means the portal can never render for a customer
  // even if middleware is bypassed.
  const access = await getAdminContext();
  if (!access) {
    redirect("/admin/login?error=not_admin");
  }

  return (
    <AuthProvider>
      <AdminShell role={access.role} permissions={access.effectivePermissions}>
        {children}
      </AdminShell>
    </AuthProvider>
  );
}
