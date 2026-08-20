import type { AuditComparison as AuditComparisonData, AuditComparisonSnapshot } from "../../services/authApi";

function delta(after: number | undefined, before: number | undefined) {
  if (after === undefined || before === undefined) return "—";
  const value = after - before;
  return value > 0 ? `+${value}` : String(value);
}

function deltaClass(after: number | undefined, before: number | undefined, lowerIsBetter = false) {
  if (after === undefined || before === undefined || after === before) return "text-zinc-500";
  const improved = lowerIsBetter ? after < before : after > before;
  return improved ? "text-emerald-400" : "text-red-400";
}

function Metric({ label, before, after, lowerIsBetter = false }: {
  label: string;
  before?: number;
  after?: number;
  lowerIsBetter?: boolean;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
      <p className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</p>
      <div className="mt-2 flex items-baseline justify-between gap-2">
        <span className="text-lg font-semibold text-zinc-200">{before ?? "—"}</span>
        <span className="text-xs text-zinc-600">→</span>
        <span className="text-lg font-semibold text-zinc-100">{after ?? "—"}</span>
        <span className={`text-xs font-semibold ${deltaClass(after, before, lowerIsBetter)}`}>
          {delta(after, before)}
        </span>
      </div>
    </div>
  );
}

function snapshotLabel(snapshot: AuditComparisonSnapshot) {
  try {
    return new URL(snapshot.url).hostname;
  } catch {
    return snapshot.url;
  }
}

export function AuditComparison({ comparison, onClose }: {
  comparison: AuditComparisonData;
  onClose: () => void;
}) {
  const { before, after } = comparison;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-800 px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-400">Audit comparison</p>
            <h2 className="mt-1 text-base font-semibold text-zinc-100">How this site changed over time</h2>
            <p className="mt-1 text-xs text-zinc-500">Metrics show the older audit on the left and the newer audit on the right.</p>
          </div>
          <button onClick={onClose} aria-label="Close comparison" className="text-xl leading-none text-zinc-500 hover:text-zinc-200">×</button>
        </div>

        <div className="grid grid-cols-2 gap-3 px-5 py-4">
          {[{ label: "Before", snapshot: before }, { label: "After", snapshot: after }].map(({ label, snapshot }) => (
            <div key={label} className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
              <p className="mt-1 truncate text-sm font-medium text-zinc-200">{snapshot.title || snapshotLabel(snapshot)}</p>
              <p className="mt-1 text-[11px] text-zinc-600">{new Date(snapshot.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-2 px-5 pb-5 sm:grid-cols-2">
          <Metric label="SEO score" before={before.seoScore} after={after.seoScore} />
          <Metric label="UX score" before={before.uxScore} after={after.uxScore} />
          <Metric label="Conversion score" before={before.conversionScore} after={after.conversionScore} />
          <Metric label="Performance score" before={before.performanceScore} after={after.performanceScore} />
          <Metric label="Priority issues" before={before.priorityIssueCount} after={after.priorityIssueCount} lowerIsBetter />
          <Metric label="Broken links" before={before.brokenLinkCount} after={after.brokenLinkCount} lowerIsBetter />
          <Metric label="Security failures" before={before.securityFailureCount} after={after.securityFailureCount} lowerIsBetter />
        </div>
      </div>
    </div>
  );
}
