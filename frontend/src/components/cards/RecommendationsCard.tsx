import { CardShell } from "../ui/CardShell";

// A plain numbered list with hairlines between rows, the same pattern as the
// findings and issue lists. The order is the order to work through them in,
// so the number carries meaning where a bullet in a tinted box did not.
export function RecommendationsCard({ recommendations }: { recommendations: string[] }) {
  return (
    <CardShell collapsible defaultOpen={false} title="Recommendations">
      <div className="px-5 py-2">
        {recommendations.length === 0 ? (
          <p className="py-3 text-xs text-zinc-500">No recommendations at this time.</p>
        ) : (
          <ol>
            {recommendations.map((rec, i) => (
              <li key={i} className="grid grid-cols-[28px_1fr] items-baseline gap-x-3 border-b border-zinc-800 py-3 last:border-b-0">
                <span className="font-mono text-[11px] tabular-nums tracking-[0.06em] text-zinc-500" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-[13px] leading-relaxed text-zinc-200">{rec}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </CardShell>
  );
}
