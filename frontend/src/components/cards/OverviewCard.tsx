import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Overview, PageLoadHint } from "../../types/analysis";

const loadConfig: Record<PageLoadHint, { label: string; variant: "emerald" | "amber" | "rose" }> = {
  lightweight: { label: "Lightweight",  variant: "emerald" },
  medium:      { label: "Medium",       variant: "amber"   },
  heavy:       { label: "Heavy",        variant: "rose"    },
};

export function OverviewCard({ overview, url, fetchedAt }: {
  overview: Overview; url: string; fetchedAt: string;
}) {
  const load = loadConfig[overview.pageLoadHint];

  return (
    <div className="rounded-xl border border-white/8 bg-white/4 p-5">
      <div className="flex items-start gap-4">
        {/* Favicon or placeholder */}
        {overview.favicon ? (
          <img src={overview.favicon} alt="favicon"
            className="w-9 h-9 rounded-lg object-contain shrink-0 mt-0.5"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="w-9 h-9 rounded-lg bg-white/6 border border-white/8 flex items-center justify-center shrink-0 mt-0.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500">
              <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-slate-100 truncate leading-snug">
            {overview.title || <span className="text-slate-500 font-normal italic">No title</span>}
          </h2>
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="text-sm text-slate-500 hover:text-violet-400 transition-colors truncate block mt-0.5">
            {url}
          </a>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={load.variant}>{load.label}</Badge>
          {overview.language && (
            <Badge variant="slate">{overview.language.toUpperCase()}</Badge>
          )}
        </div>
      </div>

      {overview.description && (
        <>
          <Separator className="my-3.5" />
          <p className="text-sm text-slate-400 leading-relaxed">{overview.description}</p>
        </>
      )}

      <p className="text-xs text-slate-600 mt-3">
        Analyzed {new Date(fetchedAt).toLocaleString()}
      </p>
    </div>
  );
}
