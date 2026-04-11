import { useEffect, useState } from "react";

const STAGES = [
  { label: "Fetching page",                  pct: 8  },
  { label: "Scanning page structure",        pct: 20 },
  { label: "Checking SEO signals",           pct: 34 },
  { label: "Detecting technologies",         pct: 48 },
  { label: "Evaluating UX & conversion",     pct: 62 },
  { label: "Measuring trust signals",        pct: 74 },
  { label: "Building site intelligence",     pct: 84 },
  { label: "Prioritizing issues",            pct: 92 },
  { label: "Finalizing report",              pct: 98 },
];

const STAGE_DURATION = 900; // ms per stage

export function LoadingSpinner({ url }: { url: string }) {
  const [stageIdx, setStageIdx] = useState(0);
  const [displayPct, setDisplayPct] = useState(0);

  // Advance through stages
  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    STAGES.forEach((_, i) => {
      timers.push(setTimeout(() => setStageIdx(i), i * STAGE_DURATION));
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  // Smoothly animate the progress percentage
  useEffect(() => {
    const target = STAGES[stageIdx]?.pct ?? 98;
    if (displayPct >= target) return;
    const step = Math.max(1, Math.ceil((target - displayPct) / 12));
    const t = setTimeout(() => setDisplayPct((p) => Math.min(p + step, target)), 30);
    return () => clearTimeout(t);
  }, [stageIdx, displayPct]);

  const hostname = (() => {
    try { return new URL(url).hostname; } catch { return url; }
  })();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-6">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">

        {/* Progress ring + percentage */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="26" fill="none" stroke="#27272a" strokeWidth="4" />
              <circle
                cx="32" cy="32" r="26" fill="none"
                stroke="#7c3aed" strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 26}`}
                strokeDashoffset={`${2 * Math.PI * 26 * (1 - displayPct / 100)}`}
                style={{ transition: "stroke-dashoffset 0.3s ease" }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-zinc-200">
              {displayPct}%
            </span>
          </div>

          <div className="text-center">
            <p className="text-sm font-semibold text-zinc-200">Analyzing</p>
            <p className="text-xs text-zinc-600 mt-0.5 max-w-xs truncate">{hostname}</p>
          </div>
        </div>

        {/* Stage list — fixed width so items-center on parent can truly center it */}
        <div className="flex flex-col gap-2 w-56">
          {STAGES.map((stage, i) => {
            const done    = i < stageIdx;
            const current = i === stageIdx;
            return (
              <div key={stage.label} className="flex items-center gap-3">
                {/* Icon */}
                <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                  done    ? "bg-emerald-500/20 border border-emerald-600"
                  : current ? "bg-violet-500/20 border border-violet-500"
                  : "bg-zinc-800/60 border border-zinc-700/50"
                }`}>
                  {done ? (
                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : current ? (
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                  ) : (
                    <div className="w-1 h-1 rounded-full bg-zinc-600" />
                  )}
                </div>

                {/* Label */}
                <span className={`text-xs transition-colors duration-300 ${
                  done    ? "text-zinc-600"
                  : current ? "text-zinc-200 font-medium"
                  : "text-zinc-700"
                }`}>
                  {stage.label}
                  {current && <span className="ml-1 animate-pulse text-zinc-500">...</span>}
                </span>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
