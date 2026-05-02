import { useState } from "react";
import type { Overview, PageLoadHint, AIDetection } from "../../types/analysis";

const loadLabel: Record<PageLoadHint, { text: string; cls: string }> = {
  lightweight: { text: "Lightweight", cls: "text-emerald-400 bg-emerald-950 border-emerald-900" },
  medium:      { text: "Medium",      cls: "text-amber-400  bg-amber-950  border-amber-900"  },
  heavy:       { text: "Heavy",       cls: "text-red-400    bg-red-950    border-red-900"    },
};

function screenshotUrl(url: string) {
  return `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url`;
}

export function OverviewCard({ overview, url, fetchedAt, aiDetection }: {
  overview: Overview; url: string; fetchedAt: string; aiDetection?: AIDetection;
}) {
  const load = loadLabel[overview.pageLoadHint];
  const [screenshotState, setScreenshotState] = useState<"loading" | "loaded" | "failed">("loading");
  const [lightboxOpen, setLightboxOpen] = useState(false);

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
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors truncate block mt-0.5">
            {url}
          </a>
        </div>

        {/* Small screenshot thumbnail — click to enlarge */}
        {screenshotState !== "failed" && (
          <button
            onClick={() => screenshotState === "loaded" && setLightboxOpen(true)}
            className={`shrink-0 w-24 h-16 rounded border border-zinc-700 overflow-hidden bg-zinc-800 transition-all ${screenshotState === "loaded" ? "hover:border-violet-500/60 hover:ring-1 hover:ring-violet-500/30 cursor-zoom-in" : "cursor-default"}`}
          >
            {screenshotState === "loading" && <div className="w-full h-full animate-pulse bg-zinc-800" />}
            <img
              src={screenshotUrl(url)}
              alt=""
              className={`w-full h-full object-cover object-top ${screenshotState === "loaded" ? "block" : "hidden"}`}
              onLoad={() => setScreenshotState("loaded")}
              onError={() => setScreenshotState("failed")}
            />
          </button>
        )}
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
        {aiDetection?.isAIBuilt && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded border border-violet-800 text-violet-400 bg-violet-950 flex items-center gap-1">
            <span className="text-[10px] font-semibold uppercase">AI</span>
            <span>{aiDetection.builder ? `Built with ${aiDetection.builder}` : "AI-assisted"}</span>
            {aiDetection.confidence === "medium" && <span className="text-violet-600">?</span>}
          </span>
        )}
      </div>

      {overview.description && (
        <p className="mt-3 text-xs text-zinc-400 leading-relaxed border-t border-zinc-800 pt-3">
          {overview.description}
        </p>
      )}

      <p className="mt-3 text-[11px] text-zinc-500">
        {new Date(fetchedAt).toLocaleString()}
      </p>

      {/* Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <div className="relative max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightboxOpen(false)}
              className="absolute -top-9 right-0 text-zinc-400 hover:text-zinc-100 text-xs flex items-center gap-1.5 transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              Close
            </button>
            <img
              src={screenshotUrl(url)}
              alt="Page screenshot"
              className="w-full rounded-lg border border-zinc-700 shadow-2xl"
            />
            <p className="mt-2 text-center text-[11px] text-zinc-600">{url}</p>
          </div>
        </div>
      )}
    </div>
  );
}
