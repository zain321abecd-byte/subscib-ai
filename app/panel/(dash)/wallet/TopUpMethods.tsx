import PayFastForm from "./PayFastForm";

/**
 * One clear payment path. Manual transfer claims are intentionally omitted so
 * customers cannot create unverified custom top-up requests.
 */
export default function TopUpMethods({
  currency,
  defaultMobile,
}: {
  currency: string;
  defaultMobile: string;
}) {
  return (
    <div className="min-w-0 grid gap-3">
      <div className="flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5">
        <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-full bg-orange-500 text-sm text-white">↗</span>
        <div>
          <p className="text-sm font-bold text-[var(--text)]">Pay online</p>
          <p className="text-xs text-[var(--text-muted)]">Secure automatic wallet credit through PayFast</p>
        </div>
      </div>
      <PayFastForm currency={currency} defaultMobile={defaultMobile} />
    </div>
  );
}
