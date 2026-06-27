"use client";

import { useTransition } from "react";
import { useAuth } from "@/lib/auth";

export default function SignOutButton() {
  const [pending, start] = useTransition();
  const { logout } = useAuth();

  function signOut() {
    start(async () => {
      try {
        logout();
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
