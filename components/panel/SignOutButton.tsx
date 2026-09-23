"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { panelSignOut } from "@/lib/panel/actions/admin";

/**
 * Ends the panel session only.
 *
 * The shop's own session lives in localStorage under a different key and is
 * left alone — signing out of the panel shouldn't empty someone's cart.
 */
export default function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await panelSignOut();
    router.push("/panel/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={busy}
      className="panel-btn panel-btn-ghost !px-3 !py-2 text-sm"
    >
      {busy ? "…" : "Sign out"}
    </button>
  );
}
