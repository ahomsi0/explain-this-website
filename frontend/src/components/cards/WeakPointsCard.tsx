export function WeakPointsCard({ weakPoints }: { weakPoints: string[] }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/4 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-200">Weak Points</h3>
        {weakPoints.length > 0 && (
          <span className="text-xs text-slate-500">{weakPoints.length} issue{weakPoints.length !== 1 ? "s" : ""}</span>
        )}
      </div>

      {weakPoints.length === 0 ? (
        <p className="text-sm text-emerald-400">No significant weak points detected.</p>
      ) : (
        <ul className="space-y-0">
          {weakPoints.map((point, i) => (
            <li key={i} className="flex items-start gap-3 py-3 border-b border-white/5 last:border-0">
              <span className="text-xs font-medium text-slate-600 w-4 shrink-0 mt-0.5">{i + 1}.</span>
              <span className="text-sm text-slate-300 leading-relaxed">{point}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
