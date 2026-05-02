import { useEffect, useState } from "react";

type StepState = "pending" | "running" | "done";

type Step = {
  id: string;
  label: string;
  running: string;   // subtitle while in progress
  done: string;      // subtitle when complete
};

// Steps are ordered by execution flow. Sequential checks run first (fast),
// then Core Web Vitals last because PageSpeed is the longest-running call.
const STEPS: Step[] = [
  { id: "tech",    label: "Tech stack & analytics",  running: "Detecting frameworks & SDKs",  done: "Detection complete" },
  { id: "seo",     label: "SEO basics & metadata",   running: "Running 13 audit checks",      done: "Audit complete" },
  { id: "ux",      label: "UX & conversion signals", running: "Analyzing layout & CTAs",      done: "Signals analyzed" },
  { id: "trust",   label: "Trust & engagement",      running: "Detecting trust markers",      done: "Trust review complete" },
  { id: "content", label: "Content quality",         running: "Reading & scoring text",       done: "Quality reviewed" },
  { id: "cwv",     label: "Core Web Vitals",         running: "Processing mobile + desktop",  done: "Mobile + desktop scored" },
];

// All 6 steps progress in order. The first 5 fast checks each take ~2.4s.
// CWV is the final step and stays "running" indefinitely until PageSpeed
// responds (at which point the component unmounts entirely).
const SEQUENTIAL_STEPS = ["tech", "seo", "ux", "trust", "content", "cwv"] as const;
const WARMUP_S = 1.5;
const STEP_DURATION_S = 2.4;

export function LoadingSpinner({ url }: { url: string; serverSignaled?: boolean }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setElapsed((e) => e + 0.1), 100);
    return () => clearInterval(t);
  }, []);

  const stepState = (id: string): StepState => {
    if (elapsed < WARMUP_S) return "pending";
    const idx = SEQUENTIAL_STEPS.indexOf(id as typeof SEQUENTIAL_STEPS[number]);
    if (idx === -1) return "pending";
    const elapsedSteps = (elapsed - WARMUP_S) / STEP_DURATION_S;
    // CWV is the last step — once it starts running it stays running
    // (no "done" transition because the component unmounts when results arrive).
    if (id === "cwv") {
      return elapsedSteps >= idx ? "running" : "pending";
    }
    if (elapsedSteps >= idx + 1) return "done";
    if (elapsedSteps >= idx) return "running";
    return "pending";
  };

  const states = STEPS.map((s) => ({ ...s, state: stepState(s.id) }));
  const doneCount = states.filter((s) => s.state === "done").length;
  // Active step = the currently running step (highlighted with violet border).
  const activeId = states.find((s) => s.state === "running")?.id;

  // Progress %: 5% baseline once mounted, then ramps with step completion to 95%.
  // We never show 100% — that only happens when the result arrives and this unmounts.
  const baseRamp = Math.min(8, elapsed * 4); // 0 → 8% over first 2 seconds
  const stepBased = 8 + (doneCount / STEPS.length) * 87; // 8% → 95%
  const stepProgressPct = elapsed < WARMUP_S ? baseRamp : Math.min(95, stepBased);

  const hostname = (() => {
    try { return new URL(url).hostname; } catch { return url; }
  })();

  // Phase label is driven by which step is currently running, mirroring the grid
  // hierarchy. Sequential phase → CWV phase as soon as the CWV box turns on.
  const cwvRunning = states.find((s) => s.id === "cwv")?.state === "running";
  const phase = elapsed < WARMUP_S
    ? "Connecting to backend"
    : cwvRunning
    ? "Waiting on PageSpeed results"
    : "Analyzing site & contacting Lighthouse";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 sm:px-6 bg-zinc-950">
      <div className="w-full max-w-3xl flex flex-col items-center gap-8 sm:gap-10">

        {/* Progress ring */}
        <div className="relative w-36 h-36 sm:w-40 sm:h-40">
          <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
            <circle cx="80" cy="80" r="68" fill="none" stroke="#27272a" strokeWidth="6" />
            <circle
              cx="80" cy="80" r="68" fill="none"
              stroke="#a78bfa" strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 68}`}
              strokeDashoffset={`${2 * Math.PI * 68 * (1 - stepProgressPct / 100)}`}
              style={{ transition: "stroke-dashoffset 0.4s ease-out" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl sm:text-4xl font-bold text-zinc-100 tabular-nums">{Math.round(stepProgressPct)}%</span>
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mt-1">Analysis</span>
          </div>
        </div>

        {/* URL + sub-line */}
        <div className="text-center">
          <p className="text-base sm:text-lg font-semibold text-zinc-100">Analyzing {hostname}…</p>
          <div className="flex items-center justify-center gap-1.5 mt-1.5 text-xs text-zinc-500">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse" />
            <span>{phase}</span>
            <span className="text-zinc-700">·</span>
            <span className="tabular-nums">{Math.floor(elapsed)}s elapsed</span>
          </div>
        </div>

        {/* Steps grid */}
        <div className="w-full">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] sm:text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">What we're analyzing</p>
            <p className="text-[11px] text-zinc-600">
              <span className="text-zinc-300 font-medium">{doneCount}</span> of {STEPS.length} steps complete
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {states.map((s) => (
              <StepCard key={s.id} step={s} state={s.state} active={s.id === activeId} />
            ))}
          </div>
        </div>

        {elapsed > 60 && (
          <p className="text-[11px] text-amber-400 text-center max-w-sm">
            Taking longer than usual — large sites and PageSpeed under load can stretch this past a minute. Hang tight.
          </p>
        )}
      </div>
    </div>
  );
}

function StepCard({ step, state, active }: { step: Step; state: StepState; active: boolean }) {
  const cardBase = "rounded-xl px-4 py-3 flex items-center gap-3 transition-colors";
  const cardStyle =
    state === "pending"
      ? "border border-zinc-800/60 bg-zinc-900/30"
      : active
      ? "border border-violet-500/40 bg-zinc-900/60"
      : "border border-zinc-800 bg-zinc-900/60";

  return (
    <div className={`${cardBase} ${cardStyle}`}>
      <StepIcon state={state} />
      <div className="flex-1 min-w-0">
        <p className={`text-xs sm:text-[13px] font-semibold ${state === "pending" ? "text-zinc-500" : active ? "text-violet-300" : "text-zinc-100"}`}>
          {step.label}
        </p>
        <p className={`text-[11px] mt-0.5 truncate ${state === "pending" ? "text-zinc-700" : "text-zinc-500"}`}>
          {state === "pending" ? "Pending" : state === "done" ? step.done : step.running}
        </p>
      </div>
    </div>
  );
}

function StepIcon({ state }: { state: StepState }) {
  const wrap = "w-9 h-9 rounded-full shrink-0 flex items-center justify-center";

  if (state === "done") {
    return (
      <div className={`${wrap} bg-violet-500/10 border border-violet-500/30`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    );
  }
  if (state === "running") {
    return (
      <div className={`${wrap} bg-violet-500/10 border border-violet-500/30`}>
        <span className="w-2 h-2 rounded-full bg-violet-400 animate-pulse" />
      </div>
    );
  }
  return (
    <div className={`${wrap} bg-zinc-800/60 border border-zinc-700/40`}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2h12M6 22h12M6 2v3a6 6 0 0 0 12 0V2M6 22v-3a6 6 0 0 1 12 0v3" />
      </svg>
    </div>
  );
}
