import { redirect } from "next/navigation";

export const metadata = { title: "Site settings" };

export default function SettingsIndex() {
  redirect("/admin/settings/general");
}
