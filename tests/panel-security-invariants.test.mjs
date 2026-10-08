import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const migration = read("supabase/29-panel-financial-atomicity.sql");
const orders = read("lib/panel/actions/orders.ts");
const admin = read("lib/panel/actions/admin.ts");
const topups = read("api/src/payments/panel-topup.service.ts");

test("order debit and creation use one database transaction", () => {
  assert.match(migration, /panel_place_order_atomic/);
  assert.match(migration, /insert into public\.panel_wallet_transactions[\s\S]*insert into public\.panel_orders/);
  assert.match(orders, /rpc\("panel_place_order_atomic"/);
});

test("refund status transition and wallet credit are serialized", () => {
  assert.match(migration, /where id = p_order_id for update/);
  assert.match(migration, /ord\.refunded_at is null/);
  assert.match(orders, /rpc\("panel_update_order_and_refund_atomic"/);
});

test("manual top-up approval is atomic and cannot approve PayFast", () => {
  assert.match(migration, /panel_review_manual_topup_atomic/);
  assert.match(migration, /req\.gateway = 'payfast'.*p_decision = 'approved'/s);
  assert.match(admin, /rpc\("panel_review_manual_topup_atomic"/);
});

test("PayFast callbacks lock the request and credit inside the same transaction", () => {
  assert.match(migration, /panel_settle_payfast_topup_atomic/);
  assert.match(migration, /where id = p_request_id for update/);
  assert.match(migration, /insert into public\.panel_wallet_transactions[\s\S]*update public\.panel_payment_requests/);
  assert.match(topups, /rpc\("panel_settle_payfast_topup_atomic"/);
});

test("financial RPCs are unavailable to browser database roles", () => {
  for (const fn of [
    "panel_place_order_atomic",
    "panel_update_order_and_refund_atomic",
    "panel_review_manual_topup_atomic",
    "panel_settle_payfast_topup_atomic",
  ]) {
    assert.match(migration, new RegExp(`revoke all on function public\\.${fn}`));
    assert.match(migration, new RegExp(`grant execute on function public\\.${fn}.*service_role`));
  }
});

test("provider mapping prevents duplicate concurrent imports", () => {
  assert.match(migration, /unique index[\s\S]*provider_id, provider_service_id/);
});
