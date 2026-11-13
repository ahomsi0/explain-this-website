import { CardShell } from "../ui/CardShell";

// Same ruled list as RecommendationsCard, without numbers: weak points are
// observations, not a sequence to work through.
export function WeakPointsCard({ weakPoints }: { weakPoints: string[] }) {
  return (
    <CardShell collapsible defaultOpen={false} title="Weak Points">
      <div className="px-5 py-2">
        {weakPoints.length === 0 ? (
          <p className="py-3 text-xs text-emerald-400">No significant weak points detected.</p>
        ) : (
          <ul>
            {weakPoints.map((point, i) => (
              <li key={i} className="border-b border-zinc-800 py-3 text-[13px] leading-relaxed text-zinc-200 last:border-b-0">
                {point}
              </li>
            ))}
          </ul>
        )}
      </div>
    </CardShell>
  );
}
