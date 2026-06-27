import type { Metadata } from "next";
import { AuthProvider } from "@/lib/auth";
import AdminShell from "./AdminShell";

export const metadata: Metadata = {
  title: { default: "Admin · SubscribAI", template: "%s · SubscribAI Admin" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AdminShell>{children}</AdminShell>
    </AuthProvider>
  );
}
