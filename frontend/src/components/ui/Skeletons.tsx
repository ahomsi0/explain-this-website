// Skeleton primitives: pulsing placeholder blocks that mirror the shape of
// upcoming content so pages feel like they fill in rather than pop.

import type { CSSProperties } from "react";

export function Skeleton({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return <div aria-hidden="true" style={style} className={`animate-pulse rounded bg-zinc-800/80 ${className}`} />;
}

/** Mimics the ResultDashboard chrome while a shared report is fetched. */
export function ReportSkeleton() {
  return (
    <div className="flex-1">
      {/* Metric strip */}
      <div className="border-b border-zinc-800 bg-zinc-900/30 px-4 py-3 flex gap-3 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-28 shrink-0 rounded-lg" style={{ opacity: 1 - i * 0.08 }} />
        ))}
      </div>

      <div className="flex min-h-[55vh]">
        {/* Sidebar */}
        <div className="hidden md:flex w-56 shrink-0 border-r border-zinc-800 p-4 flex-col gap-2.5">
          <p className="text-[10px] uppercase tracking-wider text-zinc-700 px-1 mb-1">Sections</p>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-7 rounded-md" style={{ width: `${88 - i * 4}%` }} />
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 p-5 sm:p-6">
          <Skeleton className="h-6 w-52" />
          <Skeleton className="mt-3 h-4 w-80 max-w-full" />
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Skeleton className="h-44 rounded-xl" />
            <Skeleton className="h-44 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Usage & API keys modal: three stat tiles + activity chart + lines. */
export function AccountSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2">
        <Skeleton className="h-[74px] rounded-lg" />
        <Skeleton className="h-[74px] rounded-lg" />
        <Skeleton className="h-[74px] rounded-lg" />
      </div>
      <div>
        <Skeleton className="h-3.5 w-36" />
        <Skeleton className="mt-3 h-32 rounded-lg" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

/** Admin dashboard: analytics cards + user table rows. */
export function AdminSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-9 w-full" />
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-11 w-full" style={{ opacity: 1 - i * 0.09 }} />
        ))}
      </div>
    </div>
  );
}

/** Generic stacked rows (history lists). */
export function RowSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-14 w-full rounded-lg" style={{ opacity: 1 - i * 0.09 }} />
      ))}
    </div>
  );
}
