import type { Overview, PageLoadHint } from "../../types/analysis";

const loadLabel: Record<PageLoadHint, { text: string; cls: string }> = {
  lightweight: { text: "Lightweight", cls: "text-emerald-400 bg-emerald-950 border-emerald-900" },
  medium:      { text: "Medium",      cls: "text-amber-400  bg-amber-950  border-amber-900"  },
  heavy:       { text: "Heavy",       cls: "text-red-400    bg-red-950    border-red-900"    },
};

export function OverviewCard({ overview, url, fetchedAt }: {
  overview: Overview; url: string; fetchedAt: string;
}) {
  const load = loadLabel[overview.pageLoadHint];

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-3">Overview</p>

      <div className="flex items-start gap-3">
        {overview.favicon ? (
          <img src={overview.favicon} alt="" className="w-8 h-8 rounded object-contain shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
        ) : (
          <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600">
              <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-zinc-100 leading-snug truncate">
            {overview.title || <span className="text-zinc-600 font-normal">No title</span>}
          </p>
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors truncate block mt-0.5">
            {url}
          </a>
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3 flex-wrap">
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded border ${load.cls}`}>
          {load.text}
        </span>
        {overview.language && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded border border-zinc-800 text-zinc-500 bg-zinc-900">
            {overview.language.toUpperCase()}
          </span>
        )}
      </div>

      {overview.description && (
        <p className="mt-3 text-xs text-zinc-500 leading-relaxed border-t border-zinc-800 pt-3">
          {overview.description}
        </p>
      )}

      <p className="mt-3 text-[11px] text-zinc-700">
        {new Date(fetchedAt).toLocaleString()}
      </p>
    </div>
  );
}
