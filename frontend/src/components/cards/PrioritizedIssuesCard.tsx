import type { PrioritizedIssue } from "../../types/analysis";
import { CardShell } from "../ui/CardShell";
import { CardHeader } from "../ui/CardHeader";

const impactColor: Record<string, string> = {
  "SEO":                  "text-blue-400   bg-blue-950  border-blue-800",
  "SEO + Trust":          "text-blue-400   bg-blue-950  border-blue-800",
  "SEO + Clarity":        "text-blue-400   bg-blue-950  border-blue-800",
  "Conversion":           "text-violet-400 bg-violet-950 border-violet-800",
  "Conversion + Trust":   "text-violet-400 bg-violet-950 border-violet-800",
  "Performance":          "text-amber-400  bg-amber-950 border-amber-800",
  "Accessibility + SEO":  "text-orange-400 bg-orange-950 border-orange-800",
  "Trust":                "text-emerald-400 bg-emerald-950 border-emerald-800",
  "Trust + Conversion":   "text-emerald-400 bg-emerald-950 border-emerald-800",
  "Reach":                "text-zinc-400   bg-zinc-800  border-zinc-700",
};

function fallbackColor(impact: string) {
  if (impact.toLowerCase().includes("seo"))         return "text-blue-400   bg-blue-950  border-blue-800";
  if (impact.toLowerCase().includes("conversion"))  return "text-violet-400 bg-violet-950 border-violet-800";
  if (impact.toLowerCase().includes("performance")) return "text-amber-400  bg-amber-950 border-amber-800";
  if (impact.toLowerCase().includes("trust"))       return "text-emerald-400 bg-emerald-950 border-emerald-800";
  return "text-zinc-400 bg-zinc-800 border-zinc-700";
}

export function PrioritizedIssuesCard({ issues }: { issues: PrioritizedIssue[] }) {
  if (issues.length === 0) return null;

  return (
    <CardShell>
      <CardHeader title="Prioritized Issues" badge={issues.length} badgeColor="amber" />
      <div className="p-4">
        <div className="flex flex-col gap-3">
          {issues.map((item) => {
            const colorClass = impactColor[item.impact] ?? fallbackColor(item.impact);
            return (
              <div key={item.rank} className="flex items-start gap-3">
                <span className="text-[11px] font-bold text-zinc-600 w-4 shrink-0 pt-0.5">#{item.rank}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-xs font-medium text-zinc-200">{item.issue}</span>
                    <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded border ${colorClass}`}>
                      {item.impact}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-500 leading-relaxed">{item.why}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </CardShell>
  );
}
