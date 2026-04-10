export function RecommendationsCard({ recommendations }: { recommendations: string[] }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Recommendations</p>
        {recommendations.length > 0 && (
          <span className="text-[11px] text-zinc-600">{recommendations.length} action{recommendations.length !== 1 ? "s" : ""}</span>
        )}
      </div>

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
  );
}
