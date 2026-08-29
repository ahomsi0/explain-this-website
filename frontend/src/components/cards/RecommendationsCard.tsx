import { CardShell } from "../ui/CardShell";

export function RecommendationsCard({ recommendations }: { recommendations: string[] }) {
  return (
    <CardShell collapsible defaultOpen={false} title="Recommendations">
      <div className="p-5">
        {recommendations.length === 0 ? (
          <p className="text-xs text-zinc-600">No recommendations at this time.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-2.5 rounded-lg bg-violet-950/15 border border-violet-900/25 px-3 py-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0 mt-1.5" />
                <span className="text-xs text-zinc-300 leading-relaxed">{rec}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </CardShell>
  );
}
