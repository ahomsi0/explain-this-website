import type { CopyAnalysis } from "../../types/analysis";

function scoreColorClass(score: number) {
  return score >= 80 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-red-400";
}
function barColorClass(score: number) {
  return score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-red-500";
}

export function VagueLanguageCard({ copyAnalysis }: { copyAnalysis: CopyAnalysis }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Vague Language Detector</p>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
          copyAnalysis.label === "Sharp"   ? "text-emerald-400 bg-emerald-950 border-emerald-800" :
          copyAnalysis.label === "Mixed"   ? "text-amber-400 bg-amber-950 border-amber-800" :
                                             "text-red-400 bg-red-950 border-red-800"
        }`}>{copyAnalysis.label}</span>
      </div>

      {/* Score bar */}
      <div className="flex items-center gap-3 mb-4">
        <span className={`text-3xl font-bold leading-none ${scoreColorClass(copyAnalysis.score)}`}>
          {copyAnalysis.score}
        </span>
        <div className="flex-1">
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${barColorClass(copyAnalysis.score)}`}
                 style={{ width: `${copyAnalysis.score}%` }} />
          </div>
          <p className="text-[10px] text-zinc-500 mt-1">Specificity score /100</p>
        </div>
      </div>

      {/* Vague phrases */}
      {copyAnalysis.vaguePhrases.length > 0 && (
        <div className="border-t border-zinc-800 pt-3">
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-2">Flagged phrases</p>
          <div className="flex flex-col gap-2">
            {copyAnalysis.vaguePhrases.slice(0, 5).map((v, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[10px] font-mono font-semibold text-amber-400 bg-amber-950/40 px-1.5 py-0.5 rounded shrink-0">
                  &quot;{v.phrase}&quot;
                </span>
                <span className="text-[11px] text-zinc-500 leading-relaxed">{v.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Specificity hints */}
      {copyAnalysis.specificityHints.length > 0 && (
        <div className="border-t border-zinc-800 pt-3 mt-2">
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-1.5">What&apos;s working</p>
          {copyAnalysis.specificityHints.map((h, i) => (
            <div key={i} className="flex items-center gap-2 py-0.5">
              <span className="text-emerald-500 text-xs">&#10003;</span>
              <span className="text-[11px] text-zinc-400">{h}</span>
            </div>
          ))}
        </div>
      )}

      {copyAnalysis.vaguePhrases.length === 0 && (
        <p className="text-[11px] text-emerald-400/80 mt-1">No vague marketing language detected — copy is specific and clear.</p>
      )}
    </div>
  );
}
