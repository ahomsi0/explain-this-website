import type { IntentSummary } from "../../types/analysis";

const categoryIcon: Record<string, string> = {
  ecommerce:  "🛒",
  saas:       "⚡",
  portfolio:  "🎨",
  blog:       "✍️",
  landing:    "🎯",
  service:    "🤝",
  corporate:  "🏢",
  general:    "🌐",
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
  const icon = categoryIcon[intent.category] ?? "🌐";

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 flex flex-col gap-4">
      <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Site Intelligence</p>

      {/* Intent */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <span className="text-base leading-none">{icon}</span>
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
  );
}
