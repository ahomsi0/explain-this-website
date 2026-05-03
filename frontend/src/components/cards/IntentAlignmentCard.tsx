import type { IntentAlignment } from "../../types/analysis";

export function IntentAlignmentCard({ intentAlignment }: { intentAlignment: IntentAlignment }) {
  if (intentAlignment.checks.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-2">Search Intent Alignment</p>
        <p className="text-xs text-zinc-500">No intent keywords detected in title or meta description.</p>
      </div>
    );
  }

  const scoreColor = intentAlignment.score >= 80 ? "text-emerald-400"
    : intentAlignment.score >= 50 ? "text-amber-400" : "text-red-400";

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Search Intent Alignment</p>
        <span className={`text-lg font-bold ${scoreColor}`}>
          {intentAlignment.score}<span className="text-xs text-zinc-600 font-medium">/100</span>
        </span>
      </div>

      <div className="flex flex-col gap-0">
        {intentAlignment.checks.map((c, i) => (
          <div key={i} className="flex items-start gap-3 py-2.5 border-b border-zinc-800 last:border-b-0">
            <span className={`text-sm mt-0.5 shrink-0 ${c.found ? "text-emerald-400" : "text-red-400"}`}>
              {c.found ? "✓" : "✗"}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-zinc-300">{c.claim}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">{c.signal}</p>
            </div>
          </div>
        ))}
      </div>

      {intentAlignment.score < 60 && (
        <p className="mt-3 text-[11px] text-amber-500/80 border-t border-zinc-800 pt-3">
          Your title/meta promises content that isn't clearly present on the page. This can hurt rankings and increase bounce rate.
        </p>
      )}
    </div>
  );
}
