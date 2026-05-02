"use client";

import { useTransition } from "react";
import { getSupabaseBrowser } from "@/lib/supabase/browser";

export default function SignOutButton() {
  const [pending, start] = useTransition();

  function signOut() {
    start(async () => {
      try {
        await getSupabaseBrowser().auth.signOut();
      } finally {
        window.location.assign("/");
      }
    });
  }

  return (
    <button type="button" className="btn btn-outline" onClick={signOut} disabled={pending}>
      <i className="fa-solid fa-right-from-bracket"></i> {pending ? "Signing out…" : "Sign out"}
    </button>
  );
}
