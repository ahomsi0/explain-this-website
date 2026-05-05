import { LogoMark } from "./Logo";
import { useEffect, useState } from "react";

type StepState = "pending" | "running" | "done";

type Step = {
  id: string;
  label: string;
  sublabel: string;
  running: string;
  done: string;
};

const STEPS: Step[] = [
  { id: "tech",    label: "Tech stack & analytics",   sublabel: "Frameworks · trackers · tooling",      running: "Detecting frameworks and third-party tools", done: "Detection complete" },
  { id: "seo",     label: "SEO basics & metadata",    sublabel: "Title · meta · structure · indexing",   running: "Checking metadata, structure, and indexing",  done: "Audit complete" },
  { id: "ux",      label: "UX & conversion signals",  sublabel: "CTAs · trust · friction · clarity",     running: "Reviewing CTAs, trust, and conversion flow", done: "Signals analyzed" },
  { id: "trust",   label: "Trust & engagement",       sublabel: "Reviews · badges · social proof",       running: "Scanning credibility and reassurance cues",   done: "Trust review complete" },
  { id: "content", label: "Content quality",          sublabel: "Specificity · clarity · intent",        running: "Scoring clarity, specificity, and intent",   done: "Quality reviewed" },
  { id: "cwv",     label: "Core Web Vitals",          sublabel: "LCP · CLS · TBT · FCP (mobile+desktop)",running: "Processing mobile + desktop",                 done: "Vitals collected" },
];

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
    if (id === "cwv") return elapsedSteps >= idx ? "running" : "pending";
    if (elapsedSteps >= idx + 1) return "done";
    if (elapsedSteps >= idx) return "running";
    return "pending";
  };

  const steps = STEPS.map((s) => ({ ...s, state: stepState(s.id) }));
  const doneCount = steps.filter((s) => s.state === "done").length;
  const activeStep = steps.find((s) => s.state === "running");

  const baseRamp = Math.min(10, elapsed * 5);
  const stepBased = 10 + (doneCount / STEPS.length) * 85;
  const progressPct = elapsed < WARMUP_S ? baseRamp : Math.min(95, stepBased);

  const hostname = (() => {
    try { return new URL(url).hostname; } catch { return url; }
  })();

  const circumference = 2 * Math.PI * 54;

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-zinc-800/60 bg-zinc-950/90 backdrop-blur-sm">
        <div className="px-5 h-11 flex items-center gap-3">
          <LogoMark size={20} />
          <span className="text-xs font-medium text-zinc-400 hidden sm:block">Explain This Website</span>
          <div className="h-3.5 w-px bg-zinc-800 hidden sm:block" />
          <span className="text-xs text-zinc-500 truncate font-mono">{hostname}</span>
        </div>
      </header>

      {/* Hero */}
      <div className="flex flex-col items-center pt-14 pb-10 px-4">
        {/* Ring */}
        <div className="relative w-36 h-36">
          <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
            <circle cx="60" cy="60" r="54" fill="none" stroke="#18181b" strokeWidth="7" />
            <circle
              cx="60" cy="60" r="54"
              fill="none"
              stroke="url(#spin-grad)"
              strokeWidth="7"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progressPct / 100)}
              style={{ transition: "stroke-dashoffset 0.5s ease-out" }}
            />
            <defs>
              <linearGradient id="spin-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#7c3aed" />
                <stop offset="100%" stopColor="#a78bfa" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-zinc-100 tabular-nums leading-none">
              {Math.round(progressPct)}%
            </span>
            <span className="text-[9px] font-semibold text-zinc-600 uppercase tracking-[0.2em] mt-1">Analysis</span>
          </div>
        </div>

        {/* Status */}
        <h1 className="mt-5 text-lg font-semibold text-zinc-100">
          Analyzing <span className="text-violet-400">{hostname}</span>
        </h1>
        <div className="mt-2 flex items-center gap-2 text-xs text-zinc-500">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse shrink-0" />
          <span>{activeStep ? activeStep.running : "Preparing analysis"}</span>
          <span className="text-zinc-700">·</span>
          <span className="tabular-nums">{Math.floor(elapsed)}s elapsed</span>
        </div>

        {elapsed > 45 && (
          <p className="mt-4 text-xs text-amber-400/80 max-w-sm text-center leading-relaxed">
            Taking longer than usual — large pages and PageSpeed under load can slow the final stage.
          </p>
        )}
      </div>

      {/* Step grid */}
      <div className="flex-1 px-4 pb-12">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-[0.18em]">What we're analyzing</p>
            <p className="text-[10px] text-zinc-600 tabular-nums">
              <span className="text-zinc-400 font-medium">{doneCount}</span> of {STEPS.length} steps complete
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {steps.map((step) => (
              <StepCard key={step.id} step={step} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepCard({ step }: { step: Step & { state: StepState } }) {
  const { state } = step;

  return (
    <div className={`rounded-xl border p-3.5 transition-all duration-300 ${
      state === "done"
        ? "border-emerald-500/20 bg-emerald-500/[0.05]"
        : state === "running"
        ? "border-violet-500/25 bg-violet-500/[0.07]"
        : "border-zinc-800/70 bg-zinc-900/30"
    }`}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
          state === "done"
            ? "bg-emerald-500/15 text-emerald-400"
            : state === "running"
            ? "bg-violet-500/15 text-violet-400"
            : "bg-zinc-800 text-zinc-600"
        }`}>
          {state === "done" ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : state === "running" ? (
            <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-current opacity-30" />
          )}
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-semibold leading-snug ${
            state === "done" ? "text-zinc-200"
            : state === "running" ? "text-violet-200"
            : "text-zinc-500"
          }`}>
            {step.label}
          </p>
          <p className={`mt-0.5 text-[10px] leading-snug ${
            state === "done" ? "text-emerald-400/80"
            : state === "running" ? "text-zinc-400"
            : "text-zinc-600"
          }`}>
            {state === "done" ? step.done : state === "running" ? step.sublabel : step.sublabel}
          </p>
        </div>
      </div>
    </div>
  );
}
