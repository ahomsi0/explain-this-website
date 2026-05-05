import type { CopyAnalysis } from "../../types/analysis";
import { CardShell } from "../ui/CardShell";
import { CardHeader } from "../ui/CardHeader";
import { scoreColor } from "../../utils/scoreColors";

function barColorClass(score: number) {
  return score >= 75 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-red-500";
}

export function VagueLanguageCard({ copyAnalysis }: { copyAnalysis: CopyAnalysis }) {
  const vaguePhrases = copyAnalysis.vaguePhrases ?? [];
  const specificityHints = copyAnalysis.specificityHints ?? [];
  return (
    <CardShell>
      <CardHeader
        title="Vague Language"
        badge={copyAnalysis.label}
        badgeColor={
          copyAnalysis.label === "Sharp" ? "green"
          : copyAnalysis.label === "Mixed" ? "amber"
          : "red"
        }
      />
      <div className="p-4">
        {/* Score bar */}
        <div className="flex items-center gap-3 mb-4">
          <span className={`text-3xl font-bold leading-none ${scoreColor(copyAnalysis.score)}`}>
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
        {vaguePhrases.length > 0 && (
          <div className="border-t border-zinc-800 pt-3">
            <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-2">Flagged phrases</p>
            <div className="flex flex-col gap-2">
              {vaguePhrases.slice(0, 5).map((v, i) => (
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
        {specificityHints.length > 0 && (
          <div className="mt-4 pt-4 border-t border-zinc-800">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              Suggested Alternatives
            </p>
            <div className="flex flex-col gap-1.5">
              {specificityHints.map((hint, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                  <span className="text-xs text-zinc-400">{hint}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {vaguePhrases.length === 0 && (
          <p className="text-[11px] text-emerald-400/80 mt-1">No vague marketing language detected — copy is specific and clear.</p>
        )}
      </div>
    </CardShell>
  );
}
