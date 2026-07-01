/**
 * Bootstrap the very first portal superadmin.
 *
 * The portal has no self-signup. Before the invite UI is useful, one
 * account has to exist with `is_superadmin = true` so it can invite
 * everyone else. Run this once against a fresh install.
 *
 *   cd api
 *   npx ts-node --transpile-only scripts/bootstrap-portal-superadmin.ts \
 *       --email you@subscribai.com \
 *       --name  "You"                 (optional) \
 *       --password 'someStrongOne'
 *
 * If the email already exists we upgrade that row (promote to
 * superadmin, set password, mark active) instead of erroring — that way
 * a mis-run doesn't wedge you.
 *
 * Env required: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (loads .env).
 */
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import * as bcrypt from "bcryptjs";

function arg(name: string): string | undefined {
  const flag = `--${name}`;
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

async function main() {
  const email = (arg("email") || "").trim().toLowerCase();
  const password = arg("password") || "";
  const name = arg("name") || null;

  if (!email || !password) {
    console.error("Usage: bootstrap-portal-superadmin --email you@example.com --password 'secret' [--name 'You']");
    process.exit(2);
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(2);
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in the environment (or api/.env).");
    process.exit(2);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const hash = await bcrypt.hash(password, 12);
  const now = new Date().toISOString();

  const existing = await supabase.from("portal_users").select("id").eq("email", email).maybeSingle();
  if (existing.error) {
    console.error("Lookup failed:", existing.error.message);
    process.exit(1);
  }

  if (existing.data?.id) {
    const { error } = await supabase
      .from("portal_users")
      .update({
        password_hash: hash,
        status: "active",
        is_superadmin: true,
        invite_token: null,
        invite_accepted_at: now,
        ...(name ? { name } : {}),
      })
      .eq("id", existing.data.id);
    if (error) {
      console.error("Update failed:", error.message);
      process.exit(1);
    }
    console.log(`Upgraded existing portal user ${email} to active superadmin.`);
  } else {
    const { error } = await supabase.from("portal_users").insert({
      email,
      name,
      password_hash: hash,
      status: "active",
      is_superadmin: true,
      invite_accepted_at: now,
    });
    if (error) {
      console.error("Insert failed:", error.message);
      process.exit(1);
    }
    console.log(`Created portal superadmin ${email}.`);
  }

  console.log("You can now log in at /admin/login with the email + password you just set.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
