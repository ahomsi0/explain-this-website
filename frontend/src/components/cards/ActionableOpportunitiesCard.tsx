import type { PrioritizedIssue } from "../../types/analysis";

// Map impact category to a colored badge style (matches the rest of the dashboard).
function impactBadge(impact: string): string {
  const lower = impact.toLowerCase();
  if (lower.includes("performance"))   return "bg-amber-950 text-amber-400 border-amber-800";
  if (lower.includes("seo"))           return "bg-blue-950 text-blue-400 border-blue-800";
  if (lower.includes("conversion"))    return "bg-violet-950 text-violet-400 border-violet-800";
  if (lower.includes("trust"))         return "bg-emerald-950 text-emerald-400 border-emerald-800";
  if (lower.includes("accessibility")) return "bg-orange-950 text-orange-400 border-orange-800";
  return "bg-zinc-800 text-zinc-300 border-zinc-700";
}

// Severity dot color based on rank (lower rank = more urgent).
function severityDot(rank: number): string {
  if (rank <= 2) return "bg-red-500";
  if (rank <= 5) return "bg-amber-500";
  return "bg-zinc-600";
}

// Short version of impact label for the badge (e.g. "SEO + Trust" → "SEO").
function shortImpact(impact: string): string {
  if (impact.includes("+")) return impact.split("+")[0].trim();
  return impact;
}

export function ActionableOpportunitiesCard({ issues }: { issues: PrioritizedIssue[] }) {
  if (issues.length === 0) return null;

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Actionable Opportunities</p>
        <span className="text-[11px] text-zinc-600">
          {issues.length} ranked by impact
        </span>
      </div>

      <div className="flex flex-col">
        {issues.map((item) => (
          <div
            key={item.rank}
            className="flex items-center gap-3 py-2.5 border-b border-zinc-800/60 last:border-0"
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${severityDot(item.rank)}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-zinc-200 truncate">{item.issue}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5 leading-relaxed line-clamp-2">{item.why}</p>
            </div>
            <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded border ${impactBadge(item.impact)}`}>
              {shortImpact(item.impact)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
