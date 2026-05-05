import { LogoMark } from "./Logo";
import { useEffect, useState } from "react";

type StepState = "pending" | "running" | "done";

type Step = {
  id: string;
  label: string;
  running: string;
  done: string;
};

const STEPS: Step[] = [
  { id: "tech",    label: "Tech stack",      running: "Detecting frameworks & trackers",       done: "Stack mapped" },
  { id: "seo",     label: "SEO",             running: "Auditing metadata & structure",         done: "SEO audited" },
  { id: "ux",      label: "UX signals",      running: "Reviewing CTAs & trust signals",        done: "UX reviewed" },
  { id: "trust",   label: "Trust",           running: "Scanning credibility cues",             done: "Trust scanned" },
  { id: "content", label: "Content",         running: "Scoring clarity & specificity",         done: "Content scored" },
  { id: "cwv",     label: "Core Web Vitals", running: "Running PageSpeed mobile + desktop",    done: "Vitals collected" },
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

  const R = 52;
  const circumference = 2 * Math.PI * R;

  return (
    <div className="min-h-screen bg-[#0a0a0b] flex flex-col">
      {/* Slim header */}
      <header className="flex items-center gap-2.5 px-5 h-10 border-b border-zinc-900">
        <LogoMark size={18} />
        <span className="text-[11px] font-medium text-zinc-500 hidden sm:block">Explain This Website</span>
        <span className="text-zinc-800 hidden sm:block">·</span>
        <span className="text-[11px] text-zinc-600 font-mono truncate">{hostname}</span>
      </header>

      {/* Main content — vertically centred */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-16">

        {/* Glow backdrop */}
        <div className="relative flex items-center justify-center mb-8">
          <div className="absolute w-48 h-48 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />

          {/* Ring */}
          <svg width="148" height="148" viewBox="0 0 120 120" className="-rotate-90">
            <circle cx="60" cy="60" r={R} fill="none" stroke="#18181b" strokeWidth="6" />
            <circle
              cx="60" cy="60" r={R}
              fill="none"
              stroke="url(#lg)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - progressPct / 100)}
              style={{ transition: "stroke-dashoffset 0.5s ease-out" }}
            />
            <defs>
              <linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#6d28d9" />
                <stop offset="100%" stopColor="#a78bfa" />
              </linearGradient>
            </defs>
          </svg>

          {/* Centre text */}
          <div className="absolute flex flex-col items-center justify-center">
            <span className="text-[2.6rem] font-bold tabular-nums text-zinc-100 leading-none">
              {Math.round(progressPct)}
            </span>
            <span className="text-[9px] font-semibold text-zinc-600 uppercase tracking-[0.22em] mt-0.5">%</span>
          </div>
        </div>

        {/* Domain + current step */}
        <h1 className="text-base font-semibold text-zinc-200 mb-1">
          Analyzing <span className="text-violet-400">{hostname}</span>
        </h1>

        <div className="h-5 flex items-center gap-2 text-[11px] text-zinc-500 mb-10">
          {activeStep ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse shrink-0" />
              <span>{activeStep.running}</span>
              <span className="text-zinc-700">·</span>
              <span className="tabular-nums text-zinc-600">{Math.floor(elapsed)}s</span>
            </>
          ) : (
            <span className="text-zinc-700">Preparing…</span>
          )}
        </div>

        {/* Step dots row */}
        <div className="flex items-center gap-3">
          {steps.map((step) => (
            <StepDot key={step.id} step={step} />
          ))}
        </div>

        <div className="mt-3 flex items-center gap-1.5 text-[10px] text-zinc-700">
          <span className="tabular-nums text-zinc-500 font-medium">{doneCount}</span>
          <span>of {STEPS.length} checks complete</span>
        </div>

        {elapsed > 45 && (
          <p className="mt-6 text-[11px] text-amber-400/70 max-w-xs text-center leading-relaxed">
            Taking longer than usual — PageSpeed can be slow under load.
          </p>
        )}
      </div>
    </div>
  );
}

function StepDot({ step }: { step: Step & { state: StepState } }) {
  const { state, label } = step;

  return (
    <div className="flex flex-col items-center gap-1.5 group relative">
      <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
        state === "done"    ? "bg-emerald-500 scale-100"
        : state === "running" ? "bg-violet-400 scale-125 shadow-[0_0_8px_2px_rgba(167,139,250,0.4)] animate-pulse"
        : "bg-zinc-800"
      }`} />
      <span className={`text-[9px] font-medium transition-colors ${
        state === "done"    ? "text-zinc-500"
        : state === "running" ? "text-violet-400"
        : "text-zinc-700"
      }`}>
        {state === "done" ? step.done.split(" ")[0] : label}
      </span>
    </div>
  );
}
