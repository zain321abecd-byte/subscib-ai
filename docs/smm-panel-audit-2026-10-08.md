# SubscribAI SMM panel audit — 2026-10-08

## Scope and safety

This review covers the `/panel` application, its NestJS payment/provider backend, and the shared shop authentication and PayFast paths. It is a source-code and local-build audit. No production record was created, edited, refunded, charged, or deleted; no credential is reproduced here; and no deployment was performed.

Evidence labels:

- **Confirmed** — directly demonstrated by source, local test/build output, or a public page.
- **Untested risk** — plausible but needs a staging database/gateway/provider to prove safely.
- **Implemented** — the workflow exists and its principal controls are visible in source.

## Competitor workflow baseline

Public pages were inspected without signing in.

| Capability | paksmmpanel.com | paksmmpanels.com | SubscribAI |
|---|---|---|---|
| Email/password account, reset, remember-me | Advertised on public sign-in | Advertised on public sign-in; Google sign-in also shown | Signup/login/verification implemented; password reset and OAuth are missing |
| Service catalog | Advertises 1,000+ services across major networks | Public Services navigation and broad SMM positioning | Provider catalog/import and customer catalog implemented |
| Wallet and local payments | JazzCash/Easypaisa advertised | JazzCash/Easypaisa advertised | PayFast automatic top-up implemented; manual payment schema/actions remain but current UI is online-only |
| Orders/status/refill/cancel | Instant-start, non-drop/refill-backed claims | API supports add/status; site warns about invalid/duplicate orders | Add/forward implemented; automatic provider polling, refill and provider cancellation are missing |
| Support | 24/7 support advertised | FAQ and ticket support advertised | Threaded tickets implemented; attachments/notifications/SLA tooling absent |
| Reseller API | Explicitly advertised | Public `/api_docs` documents services/add/status/balance | API key generation UI exists, but no reseller API endpoint exists |
| Tutorials/updates | Multiple public YouTube tutorials | Public Updates navigation | No panel-specific tutorial/update center |

Public references: [Pak SMM Panel](https://paksmmpanel.com/), [Pak SMM Panels](https://paksmmpanels.com/), [Pak SMM Panels API docs](https://paksmmpanels.com/api_docs), [Pak SMM Panel terms](https://www.paksmmpanel.com/term).

## Findings

### Critical and high priority

#### F-01 — Financial operations were split across multiple transactions

- **State:** Confirmed defect; fixed locally, migration not applied.
- **Severity:** Critical.
- **Evidence:** `lib/panel/actions/orders.ts` previously inserted a debit and then inserted the order; `lib/panel/actions/admin.ts` credited a manual top-up before changing the request; `api/src/payments/panel-topup.service.ts` claimed a request before inserting its credit; order refunds credited before setting `refunded_at`.
- **Impact:** A process crash, network ambiguity, or concurrent retry could create a debit without an order, an approved request without credit, or duplicate credits/refunds. This is direct monetary loss/reconciliation risk.
- **Fix:** `supabase/29-panel-financial-atomicity.sql` adds service-role-only transactional RPCs with row locks. The three application call sites now use them. Apply the migration in staging before deploying application code.
- **Validation:** `tests/panel-security-invariants.test.mjs` asserts all four atomic call paths, row locks, and browser-role revocation. A real concurrency test still requires an isolated staging PostgreSQL database.

#### F-02 — Shop PayFast initiation and settlement did not bind the gateway amount to the stored order

- **State:** Confirmed defect; fixed locally, not deployed.
- **Severity:** Critical.
- **Evidence:** `api/src/payments/payments.controller.ts:16-25` exposes `POST /payments/init`; `api/src/payments/payments.service.ts:90-126` accepts basket ID and amount from the caller; `api/src/payments/payments.service.ts:340-381` marks the matching shop order paid without comparing `transaction_amount` or the initiated amount with `orders.subtotal_pkr`.
- **Impact:** A caller may initiate a lower-value PayFast transaction for a known basket/order number and a valid gateway success can mark the full order paid. It also enables unauthenticated gateway-token abuse.
- **Fix:** `api/src/payments/payments.service.ts` now requires a pending server-side order/top-up, compares the requested amount, currency and customer identity before token creation, and rechecks PayFast's reported amount before a paid transition. A dedicated payment-attempt table and initiation rate limiting remain recommended defense-in-depth work.

#### F-03 — Reseller API is advertised in-product but does not exist

- **State:** Confirmed broken/missing feature.
- **Severity:** High.
- **Evidence:** `lib/panel/actions/admin.ts:518-532` generates `panel_profiles.api_key`; `app/panel/(dash)/settings/SettingsForms.tsx` exposes it. Repository-wide route inspection found no `/api/v2` controller/route for services, add, status, or balance.
- **Impact:** Customers receive an API key that cannot call anything, creating support load and materially underperforming both competitors.
- **Proposed fix:** Add a rate-limited `/api/v2` compatibility controller supporting `services`, `add`, `status`, and `balance`; store only a keyed hash of API keys; scope every query to the key owner; reuse the atomic order RPC; add idempotency keys and request logs.

#### F-04 — Provider orders are not synchronized after submission

- **State:** Confirmed partial implementation.
- **Severity:** High.
- **Evidence:** `lib/panel/actions/orders.ts:165-240` implements manual provider submission and explicitly says an automatic poller is not implemented. There is no panel worker for provider `status`, `refill`, or `cancel`.
- **Impact:** Customer order statuses, remains, partial refunds, refill eligibility, and cancellations become stale/manual. “Status is always current” and automatic-refund claims in `app/panel/page.tsx` are not met.
- **Proposed fix:** Add a Railway scheduled worker that batches provider status calls, maps provider states, records history, applies proportional partial refunds atomically, and retries with backoff/dead-letter visibility. Add refill/cancel actions only when the provider supports them.

#### F-05 — Partial orders have no proportional refund logic

- **State:** Confirmed missing feature.
- **Severity:** High.
- **Evidence:** `lib/panel/actions/orders.ts` refunds only `cancelled` and `failed`; `panel_orders` stores `remains` and supports `partial` in `supabase/27-panel-smm.sql:192-210`, but no code calculates or credits the unfulfilled portion.
- **Impact:** Customers may be charged for undelivered quantity, causing disputes and violating the panel’s public automatic-refund promise.
- **Proposed fix:** In the provider sync transaction, calculate `round(original_charge * remains / quantity, 2)`, cap it to unreimbursed charge, record a linked refund ledger entry, and store `refunded_amount` rather than only a timestamp.

#### F-06 — Thirty-second payment auto-cancellation is operationally unsafe

- **State:** Confirmed risky behavior, partially mitigated by late-success reconciliation.
- **Severity:** High.
- **Evidence:** `api/src/payments/panel-topup.service.ts:21-56`, `lib/panel/payfast-timeout.ts`, and `lib/panel/actions/payfast.ts:78-100` reject a pending checkout after 30 seconds. The callback code accepts a later verified success, but the UI tells customers it was cancelled first.
- **Impact:** Real bank/mobile-wallet payments commonly take longer than 30 seconds. Customers see false cancellation, retry, and may pay twice.
- **Proposed fix:** Use `expired` rather than `rejected`, set a gateway-appropriate 10–30 minute display timeout, keep reconciliation open for the provider’s full callback window, and prevent duplicate active attempts for the same customer/amount.

### Medium priority

#### F-07 — Provider-service uniqueness was application-only

- **State:** Confirmed defect; fixed locally, migration not applied.
- **Severity:** Medium.
- **Evidence:** `api/src/public/provider-catalog.service.ts:71-79` checks existing rows before insert, but `supabase/27-panel-smm.sql` had no unique constraint on `(provider_id, provider_service_id)`.
- **Impact:** Concurrent imports can create duplicate customer-visible services and inconsistent repricing.
- **Fix:** `supabase/29-panel-financial-atomicity.sql` adds a partial unique index. Before applying, staging must check and merge any existing duplicates.

#### F-08 — Provider service-list endpoint is public and can trigger upstream calls

- **State:** Confirmed exposure.
- **Severity:** Medium.
- **Evidence:** `api/src/public/public.controller.ts:23-27` exposes `GET /panel-provider-services/:providerId` without a guard; `api/src/public/provider-catalog.service.ts:16-43` uses the stored provider key upstream.
- **Impact:** Attackers can enumerate wholesale catalog/rates and cause repeated upstream requests (cache reduces but does not remove abuse).
- **Proposed fix:** Apply `InternalOrAdminGuard`, or expose a deliberately sanitized, cached public catalog separate from admin provider data. Add rate limiting.

#### F-09 — Provider currency conversion is hard-coded

- **State:** Confirmed defect.
- **Severity:** Medium.
- **Evidence:** `api/src/public/provider-catalog.service.ts:112-123` and `lib/panel/actions/admin.ts:347-358` multiply USD provider rates by `280`, while the application already has an FX service.
- **Impact:** Margin erodes or prices become uncompetitive whenever USD/PKR changes; “automatic USD pricing” is not actually automatic.
- **Proposed fix:** Store the FX rate used on every import/reprice, source it from the existing cached FX service with a configurable fallback, and show rate age in admin.

#### F-10 — API keys are stored in plaintext

- **State:** Confirmed security weakness.
- **Severity:** Medium.
- **Evidence:** `supabase/27-panel-smm.sql:45` defines `panel_profiles.api_key text unique`; `lib/panel/actions/admin.ts:520-528` stores the complete generated value.
- **Impact:** A database read leak immediately compromises every reseller account; keys cannot be safely audited by prefix.
- **Proposed fix:** Store `key_prefix` plus an HMAC-SHA-256 digest, reveal the key once, support revoke/rotate timestamps, and never query by raw key.

#### F-11 — Password recovery and social sign-in are absent

- **State:** Confirmed missing competitor-parity features.
- **Severity:** Medium.
- **Evidence:** `api/src/auth/auth.controller.ts` contains signup, verify, login and me only. Panel login offers no forgot-password flow. paksmmpanel.com shows reset; paksmmpanels.com shows reset and Google sign-in.
- **Impact:** Locked-out users require manual support; lower signup conversion.
- **Proposed fix:** Add one-time, hashed, expiring reset tokens, generic responses to prevent account enumeration, session invalidation after reset, and optionally Google OAuth tied to the same `public.users` identity.

#### F-12 — Authentication has no session revocation/versioning

- **State:** Untested risk supported by design.
- **Severity:** Medium.
- **Evidence:** `api/src/auth/auth.service.ts:42-49` signs stateless JWTs; `api/src/auth/auth.guard.ts:23-36` re-reads the user but does not compare a token/session version. `lib/panel/auth.ts` stores the JWT in an HTTP-only cookie.
- **Impact:** A stolen token remains valid until expiry even after password change; panel “sign out” only deletes the current browser cookie.
- **Proposed fix:** Add `session_version` or a sessions table, rotate refresh/access tokens, revoke all sessions after password/security changes, and set an explicit cookie name/domain policy.

#### F-13 — Ticket creation and message insertion are not atomic; errors are ignored

- **State:** Confirmed defect.
- **Severity:** Medium.
- **Evidence:** `lib/panel/actions/admin.ts:440-462` inserts a ticket, then inserts its first message without checking that error. Reply insertion and status update at `465-492` are also separate and the insert error is ignored.
- **Impact:** Empty tickets, missing replies, or misleading “answered” state can occur.
- **Proposed fix:** Add transactional ticket-create/reply RPCs and return explicit failures. Add email/in-app notification and optional attachment scanning later.

#### F-14 — Provider submission is not idempotent under concurrent admin clicks

- **State:** Confirmed race.
- **Severity:** Medium.
- **Evidence:** `lib/panel/actions/orders.ts:165-240` checks `provider_order_id`, calls the upstream provider, then writes the ID. Two simultaneous calls can both pass the check and place two paid upstream orders.
- **Impact:** Duplicate delivery and direct provider-balance loss.
- **Proposed fix:** Atomically claim the order with a `submitting` state/idempotency token before the network call; retry reconciliation by a client reference if supported; never resubmit an ambiguous timeout automatically.

#### F-15 — Manual top-up references are not unique

- **State:** Confirmed risk.
- **Severity:** Medium.
- **Evidence:** `panel_payment_requests.reference` has no unique/indexed constraint in `supabase/27-panel-smm.sql:231-251`; `requestTopUp` accepts arbitrary reference in `lib/panel/actions/admin.ts:26-46`.
- **Impact:** The same bank receipt can be submitted and approved multiple times.
- **Proposed fix:** Normalize references and enforce a uniqueness rule per method (with an admin-reviewed exception path), retain receipt evidence, and show duplicates before approval.

### Implemented / lower priority observations

#### F-16 — Core authorization is generally server-scoped

- **State:** Implemented.
- **Severity:** Informational.
- **Evidence:** `lib/panel/auth.ts` validates the HTTP-only panel token via `/auth/me`; actions re-check the user/admin; customer queries explicitly filter by `user_id`; panel tables have RLS enabled and browser roles have no policies in `supabase/27-panel-smm.sql:362-383`.
- **Impact:** Good baseline, but the service-role architecture makes every missed filter high impact.
- **Recommendation:** Keep action-level authorization tests and progressively move customer operations into narrowly scoped database functions.

#### F-17 — Wallet overdraft prevention is correctly serialized

- **State:** Implemented; strengthened locally.
- **Severity:** Informational.
- **Evidence:** `supabase/27-panel-smm.sql:306-346` locks the wallet row `FOR UPDATE`, rejects negative balances, and stamps `balance_after` in the same trigger transaction.
- **Impact:** Concurrent deductions cannot both spend the same funds.
- **Remaining test:** Execute two simultaneous order RPC calls against a staging wallet whose balance covers only one; assert one order/debit succeeds and one fails.

#### F-18 — Customer/admin UI is responsive but large tables remain horizontal-scroll experiences

- **State:** Partially implemented.
- **Severity:** Low.
- **Evidence:** `components/panel/Sidebar.tsx:76-139` has a mobile drawer and fixed desktop sidebar; `app/panel/(dash)/layout.tsx:31-83` preserves a mobile header; `app/panel.css:388-424` adds mobile breakpoints, but `.panel-data-table` keeps a 620px minimum width.
- **Impact:** Operational tables work but require sideways scrolling and dense admin actions are difficult on phones.
- **Proposed fix:** Render mobile card rows for orders/payments/services, keep tables for desktop, and test 320/360/390/768/1024px viewports with keyboard navigation.

#### F-19 — SEO controls correctly keep the private panel out of search

- **State:** Implemented.
- **Severity:** Informational.
- **Evidence:** `app/panel/layout.tsx:9-24` emits `noindex,nofollow`; `app/sitemap.ts` excludes panel URLs; `app/robots.ts` allows crawling so Google can see the noindex directive.
- **Impact:** Prevents private/low-value dashboard pages polluting search while retaining public shop/blog indexing.
- **Recommendation:** Add a canonical and structured FAQ/service data only to the public `/panel` landing page if it should rank; keep authenticated routes noindex.

#### F-20 — Automated test coverage was absent

- **State:** Confirmed gap; first local invariant suite added.
- **Severity:** High for financial software.
- **Evidence:** Root and `api/package.json` originally had no test script/framework. `tests/panel-security-invariants.test.mjs` now protects the atomic wiring, but it is not a substitute for database integration tests.
- **Impact:** Regressions in money, authorization, provider and responsive workflows can reach production unnoticed.
- **Proposed fix:** Add isolated Supabase/PostgreSQL integration tests, Nest HTTP tests, Playwright user/admin journeys, and a staging PayFast replay suite in CI.

## Capability disposition

- **Implemented:** shared shop/panel identity; verified-email login; separate HTTP-only panel session; customer dashboard; categorized service catalog; server-priced order form; wallet ledger; manual and PayFast top-ups; provider catalog/import/balance test/order submission; customer/admin orders; tickets; users/providers/services/payments/reports admin pages; public landing; noindex panel SEO; desktop/mobile navigation.
- **Partial:** automatic refunds (terminal full refund only); provider lifecycle (submit only); payment reconciliation (panel stronger than shop); API key (generation only); responsive tables; activity/history (schema exists, limited operational use); manual payment fraud controls.
- **Missing:** functional reseller API; provider status worker; refill/cancel provider actions; partial refunds; password reset; OAuth; ticket attachments/notifications; audit-log coverage; rate-limit coverage for payment/provider public endpoints; end-to-end/integration tests.
- **Broken/high-risk:** non-atomic money paths before migration; shop PayFast amount binding; concurrent provider submission; 30-second false cancellations; plaintext reseller keys; hard-coded FX.

## Prioritized remediation plan

1. **Before the next release:** stage and apply `29-panel-financial-atomicity.sql`; run the financial integration matrix; deploy application code only after RPCs exist. Fix shop PayFast server-side amount binding and rate-limit initiation.
2. **Next:** add provider submission claiming and background status synchronization, including proportional partial refunds and refill/cancel support.
3. **Then:** implement the reseller `/api/v2` contract with hashed keys, scopes, rate limits, idempotency and logs.
4. **Then:** replace 30-second cancellation semantics, unique manual receipts, atomic tickets, and add password recovery/session revocation.
5. **Quality:** establish CI gates (typecheck, lint, unit, DB integration, Playwright mobile/desktop, accessibility and secret scan).

## Test plan and current results

| Test | Current result |
|---|---|
| API TypeScript typecheck | Passed locally |
| API production build | Passed locally |
| Next.js production build | Passed locally (existing edge-runtime/static-generation warning only) |
| Git whitespace/error check | Passed (line-ending warnings only) |
| Financial invariant suite | 6/6 passed with `npm run test:panel-security` |
| Real concurrent wallet deductions | **Not run** — requires isolated staging DB; source trigger/RPC inspection supports expected serialization |
| Real duplicate PayFast callback replay | **Not run** — requires staging PayFast keys and DB; atomic settlement RPC added |
| Real refund race | **Not run** — requires isolated staging DB; order row lock and atomic refund added |
| Production authorization/data mutation | Deliberately not run |

Recommended staging matrix:

1. Credit a disposable wallet with 100. Fire two 75-unit order RPCs simultaneously. Assert exactly one order, one debit, balance 25.
2. Replay the same verified PayFast paid callback 20 times concurrently. Assert one approved request, one linked credit, exact balance delta once.
3. Submit `cancelled` and `failed` updates for one order concurrently. Assert one refund and one `refunded_at`.
4. Attempt every customer action with no cookie, another customer's identifiers, a suspended account, a normal account against admin actions, and an admin account. Assert deny/404 as appropriate.
5. Force a transaction rollback after each statement in every RPC and assert no partial ledger/request/order state.

## Rollout and rollback guidance

1. Back up the four panel finance tables and check for duplicate `(provider_id, provider_service_id)` rows before applying the migration.
2. Apply the migration to staging. Do not deploy the application first: the updated app expects the new RPCs.
3. Run the staging matrix above, compare wallet balances to ledger sums, and reconcile PayFast attempts.
4. Deploy API/web only after validation. Monitor RPC errors, duplicate-callback results, provider submissions and ledger/request linkage.
5. Rollback application code first if errors appear. The new functions/index are additive and can remain safely. If the index must be removed, use `drop index concurrently panel_services_provider_service_unique`; revoke/drop RPCs only after all application instances have rolled back. Never reverse wallet effects with direct balance updates—use compensating ledger entries with an audit reason.
