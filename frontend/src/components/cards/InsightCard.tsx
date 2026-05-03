import type { IntentSummary } from "../../types/analysis";
import { CardShell } from "../ui/CardShell";
import { CardHeader } from "../ui/CardHeader";

const categoryIcon: Record<string, string> = {
  ecommerce:  "EC",
  saas:       "SA",
  portfolio:  "PF",
  blog:       "BL",
  landing:    "LD",
  service:    "SV",
  corporate:  "CO",
  general:    "GN",
};

export function InsightCard({
  intent,
  biggestOpportunity,
  competitorInsight,
}: {
  intent: IntentSummary;
  biggestOpportunity: string;
  competitorInsight: string;
}) {
  const icon = categoryIcon[intent.category] ?? "GN";

  return (
    <CardShell>
      <CardHeader title="Site Intent" />
      <div className="p-4 flex flex-col gap-4">
        {/* Intent */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border border-zinc-700 text-zinc-300 bg-zinc-800">
              {icon}
            </span>
            <span className="text-sm font-semibold text-zinc-100">{intent.label}</span>
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed">{intent.description}</p>
        </div>

        <div className="h-px bg-zinc-800" />

        {/* Biggest opportunity */}
        <div className="flex flex-col gap-1.5">
          <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Biggest Missed Opportunity</p>
          <p className="text-xs text-zinc-400 leading-relaxed">{biggestOpportunity}</p>
        </div>

        <div className="h-px bg-zinc-800" />

        {/* Competitor insight */}
        <div className="flex flex-col gap-1.5">
          <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Market Positioning</p>
          <p className="text-xs text-zinc-500 leading-relaxed italic">{competitorInsight}</p>
        </div>
      </div>
    </CardShell>
  );
}
