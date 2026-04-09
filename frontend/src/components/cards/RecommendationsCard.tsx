export function RecommendationsCard({ recommendations }: { recommendations: string[] }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/4 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-200">Recommendations</h3>
        {recommendations.length > 0 && (
          <span className="text-xs text-slate-500">{recommendations.length} action{recommendations.length !== 1 ? "s" : ""}</span>
        )}
      </div>

      {recommendations.length === 0 ? (
        <p className="text-sm text-slate-500">No recommendations at this time.</p>
      ) : (
        <ol className="space-y-0">
          {recommendations.map((rec, i) => (
            <li key={i} className="flex items-start gap-3 py-3 border-b border-white/5 last:border-0">
              <span className="text-xs font-medium text-slate-600 w-4 shrink-0 mt-0.5">{i + 1}.</span>
              <span className="text-sm text-slate-300 leading-relaxed">{rec}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
