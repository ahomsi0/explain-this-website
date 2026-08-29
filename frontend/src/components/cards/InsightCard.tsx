import type { IntentSummary } from "../../types/analysis";
import { CardShell } from "../ui/CardShell";
import { CardHeader } from "../ui/CardHeader";

export function InsightCard({
  intent,
  biggestOpportunity,
  competitorInsight,
}: {
  intent: IntentSummary;
  biggestOpportunity: string;
  competitorInsight: string;
}) {
  const categoryLabel = intent.category.charAt(0).toUpperCase() + intent.category.slice(1);

  return (
    <CardShell>
      <CardHeader title="Site Intent" />
      <div className="p-5 flex flex-col gap-4">
        {/* Intent */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-md border border-violet-800 text-violet-300 bg-violet-950">
              {categoryLabel}
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
          <p className="text-xs text-zinc-300 leading-relaxed">{competitorInsight}</p>
        </div>
      </div>
    </CardShell>
  );
}
