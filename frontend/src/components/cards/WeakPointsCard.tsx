import { CardShell } from "../ui/CardShell";

export function WeakPointsCard({ weakPoints }: { weakPoints: string[] }) {
  return (
    <CardShell collapsible defaultOpen={false} title="Weak Points">
      <div className="p-4">
        {weakPoints.length === 0 ? (
          <p className="text-xs text-emerald-400">No significant weak points detected.</p>
        ) : (
          <ul>
            {weakPoints.map((point, i) => (
              <li key={i} className="flex items-start gap-2.5 py-2 border-b border-zinc-800/60 last:border-0">
                <span className="text-[11px] font-medium text-zinc-600 shrink-0 w-4 mt-0.5">{i + 1}.</span>
                <span className="text-xs text-zinc-300 leading-relaxed">{point}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </CardShell>
  );
}
