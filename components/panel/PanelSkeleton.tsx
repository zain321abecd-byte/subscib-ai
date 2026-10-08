function Bar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-[var(--surface-3)] ${className}`} />;
}

export default function PanelSkeleton({ admin = false }: { admin?: boolean }) {
  return (
    <div role="status" aria-live="polite" aria-label="Loading page" className="grid gap-5 overflow-hidden">
      <div className="flex items-start justify-between gap-4">
        <div className="grid flex-1 gap-2"><Bar className="h-8 max-w-[260px]" /><Bar className="h-4 max-w-[440px]" /></div>
        <Bar className="h-10 w-28 shrink-0 rounded-full" />
      </div>

      <div className="-mx-1 overflow-hidden py-1">
        <div className="panel-skeleton-chips flex w-max gap-2 px-1">
          {[92, 126, 104, 148, 112, 136, 98, 124].map((width, index) => (
            <Bar key={index} className="h-10 shrink-0 rounded-full" />
          )).map((item, index) => <div key={index} style={{ width: [92,126,104,148,112,136,98,124][index] }}>{item}</div>)}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="panel-card grid gap-3 p-4">
            <Bar className="h-3 w-24" /><Bar className="h-7 w-32" /><Bar className="h-3 w-3/4" />
          </div>
        ))}
      </div>

      <div className="panel-card overflow-hidden p-4">
        <div className="mb-4 flex items-center gap-3"><Bar className="h-11 flex-1" /><Bar className="h-11 w-28 rounded-full" /></div>
        <div className="grid gap-3">
          {Array.from({ length: admin ? 8 : 5 }, (_, index) => (
            <div key={index} className="grid grid-cols-[44px_1fr_100px] items-center gap-3 border-t border-[var(--border)] pt-3 first:border-0 first:pt-0">
              <Bar className="h-9 w-9 rounded-full" /><div className="grid gap-2"><Bar className="h-4 w-4/5" /><Bar className="h-3 w-2/5" /></div><Bar className="h-8 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
