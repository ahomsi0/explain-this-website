import { CardShell } from "../ui/CardShell";
import { CardHeader } from "../ui/CardHeader";

export function RecommendationsCard({ recommendations }: { recommendations: string[] }) {
  return (
    <CardShell collapsible defaultOpen={false} title="Recommendations">
      <CardHeader title="Recommendations" badge={recommendations.length} badgeColor="violet" />
      <div className="p-4">
        {recommendations.length === 0 ? (
          <p className="text-xs text-zinc-600">No recommendations at this time.</p>
        ) : (
          <ol>
            {recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2.5 py-2 border-b border-zinc-800/60 last:border-0">
                <span className="text-[11px] font-medium text-zinc-600 shrink-0 w-4 mt-0.5">{i + 1}.</span>
                <span className="text-xs text-zinc-300 leading-relaxed">{rec}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </CardShell>
  );
}
