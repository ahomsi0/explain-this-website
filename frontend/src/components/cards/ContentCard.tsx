import type { ContentStats } from "../../types/analysis";

const levelColor = {
  simple:   "text-emerald-400 bg-emerald-950 border-emerald-900",
  moderate: "text-amber-400 bg-amber-950 border-amber-900",
  advanced: "text-red-400 bg-red-950 border-red-900",
};

export function ContentCard({ contentStats }: { contentStats: ContentStats }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-[11px] font-medium text-zinc-600 uppercase tracking-wider mb-4">Content Analysis</p>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex flex-col gap-1 flex-1">
          <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider">Reading Level</span>
          <span className={`self-start text-xs font-semibold px-2 py-0.5 rounded border capitalize ${levelColor[contentStats.readingLevel]}`}>
            {contentStats.readingLevel}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider">Avg Sentence</span>
          <span className="text-xl font-semibold text-zinc-100 leading-none">
            {contentStats.avgSentenceLen}<span className="text-xs font-normal text-zinc-600 ml-1">words</span>
          </span>
        </div>
      </div>

      {contentStats.topKeywords.length > 0 && (
        <div>
          <p className="text-[10px] font-medium text-zinc-700 uppercase tracking-wider mb-2">Top Keywords</p>
          <div className="flex flex-wrap gap-1.5">
            {contentStats.topKeywords.map((kw) => (
              <span key={kw} className="text-[11px] text-zinc-400 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded">
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
