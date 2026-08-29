import { CardShell } from "../ui/CardShell";

export function WeakPointsCard({ weakPoints }: { weakPoints: string[] }) {
  return (
    <CardShell collapsible defaultOpen={false} title="Weak Points">
      <div className="p-5">
        {weakPoints.length === 0 ? (
          <p className="text-xs text-emerald-400">No significant weak points detected.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {weakPoints.map((point, i) => (
              <div key={i} className="flex items-start gap-2.5 rounded-lg bg-red-950/15 border border-red-900/25 px-3 py-2.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 mt-1.5" />
                <span className="text-xs text-zinc-300 leading-relaxed">{point}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </CardShell>
  );
}
