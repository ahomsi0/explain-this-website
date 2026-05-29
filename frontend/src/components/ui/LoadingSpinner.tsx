import { LogoMark } from "./Logo";
import { useEffect, useState } from "react";

type StepState = "pending" | "running" | "done";

type Step = {
  id: string;
  label: string;
};

const STEPS: Step[] = [
  { id: "tech",    label: "Tech stack"      },
  { id: "seo",     label: "SEO audit"       },
  { id: "ux",      label: "UX signals"      },
  { id: "trust",   label: "Trust signals"   },
  { id: "content", label: "Content quality" },
  { id: "cwv",     label: "Core Web Vitals" },
];

// Plausible per-step log lines that stream into the right pane.
const STEP_LOGS: Record<string, string[]> = {
  tech: [
    "fetching response headers",
    "parsing meta tags",
    "detecting framework",
    "detecting bundler & runtime",
    "scanning analytics + trackers",
  ],
  seo: [
    "checking <title> tag",
    "checking meta description",
    "validating Open Graph",
    "scanning heading hierarchy",
    "validating canonical URL",
  ],
  ux: [
    "scanning for CTAs",
    "checking form structure",
    "detecting social proof",
    "checking contact info",
    "checking mobile viewport",
  ],
  trust: [
    "scanning trust badges",
    "detecting testimonials",
    "checking review schema",
    "scanning customer logos",
  ],
  content: [
    "extracting body text",
    "scoring clarity",
    "detecting vague language",
    "checking specificity",
  ],
  cwv: [
    "requesting PageSpeed (mobile)",
    "requesting PageSpeed (desktop)",
    "collecting LCP / CLS / INP",
    "parsing lighthouse report",
  ],
};

const SEQUENTIAL_STEPS = ["tech", "seo", "ux", "trust", "content", "cwv"] as const;
const WARMUP_S = 1.5;
const STEP_DURATION_S = 2.4;

// Deterministic "fake" durations to fill in done rows.
function fakeDuration(idx: number) {
  const ms = 800 + (idx * 137) % 700;
  return `${(ms / 1000).toFixed(1)}s`;
}

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

  const steps = STEPS.map((s) => ({
    ...s,
    state: stepState(s.id),
    idx: SEQUENTIAL_STEPS.indexOf(s.id as typeof SEQUENTIAL_STEPS[number]),
  }));
  const doneCount = steps.filter((s) => s.state === "done").length;
  const activeStep = steps.find((s) => s.state === "running");

  const hostname = (() => {
    try { return new URL(url).hostname; } catch { return url; }
  })();

  // Right-pane terminal stream — how much of the active step's log to reveal.
  let activeElapsedInStep = 0;
  if (activeStep && activeStep.idx >= 0) {
    activeElapsedInStep = (elapsed - WARMUP_S) - activeStep.idx * STEP_DURATION_S;
  }
  const activeLines = activeStep ? STEP_LOGS[activeStep.id] ?? [] : [];
  const activeProgress = activeLines.length > 0
    ? Math.min(1, activeElapsedInStep / STEP_DURATION_S)
    : 0;
  const visibleLineCount = activeLines.length > 0
    ? Math.min(activeLines.length, Math.max(1, Math.ceil(activeProgress * activeLines.length) + 1))
    : 0;

  // Total progress (0 → 1) across all 6 steps — monotonic so the bar never
  // jumps back when a step completes and the next begins.
  const totalProgress = Math.min(
    1,
    (doneCount + (activeStep ? activeProgress : 0)) / STEPS.length
  );

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 py-8">

      {/* Brand strip — small anchor above the card */}
      <div className="w-full max-w-[900px] mb-4 flex items-center gap-2.5 px-1">
        <LogoMark size={20} />
        <span className="text-[12px] font-semibold text-zinc-300">Explain This Website</span>
        <span className="text-zinc-800">·</span>
        <span className="text-[11px] text-zinc-600 font-mono truncate">{hostname}</span>
      </div>

      {/* ── Hybrid card: split pane + pipeline rail + terminal stream ── */}
      <section
        className="w-full max-w-[900px] rounded-lg border border-violet-500/40 bg-zinc-950 overflow-hidden"
        style={{ boxShadow: "0 0 0 1px rgba(124,58,237,0.15), 0 8px 40px -8px rgba(124,58,237,0.25)" }}
      >
        {/* Top status strip */}
        <div className="px-6 py-3 border-b border-zinc-900 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse shrink-0" />
            <span className="text-zinc-400">Analyzing</span>
            <span className="text-zinc-100 font-medium truncate">{hostname}</span>
          </div>
          <div className="font-mono text-[11px] text-zinc-500 shrink-0">
            <span className="tabular-nums">{elapsed.toFixed(1)}s</span>
            <span className="text-zinc-700 mx-2">·</span>
            <span>{doneCount} of {STEPS.length} done</span>
          </div>
        </div>

        <div className="flex h-[380px]">

          {/* Left rail — pipeline cards */}
          <div className="w-[240px] border-r border-zinc-900 px-3 py-4 space-y-1.5 shrink-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-zinc-600 px-2 mb-2">checks</p>
            {steps.map((s) => {
              if (s.state === "done") {
                return (
                  <div key={s.id} className="flex items-center gap-2.5 px-2.5 py-2 rounded border border-emerald-900/40 bg-emerald-950/15">
                    <span className="text-emerald-400 shrink-0">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </span>
                    <span className="text-xs text-zinc-300 flex-1 truncate">{s.label}</span>
                    <span className="font-mono text-[10px] text-zinc-500">{fakeDuration(s.idx)}</span>
                  </div>
                );
              }
              if (s.state === "running") {
                return (
                  <div key={s.id} className="flex items-center gap-2.5 px-2.5 py-2 rounded border border-violet-500/40 bg-violet-500/[0.08] shadow-[inset_3px_0_0_#7c3aed]">
                    <svg width="11" height="11" viewBox="0 0 24 24" className="animate-spin text-violet-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                    </svg>
                    <span className="text-xs text-zinc-100 font-medium flex-1 truncate">{s.label}</span>
                    <span className="font-mono text-[10px] text-violet-300">running</span>
                  </div>
                );
              }
              return (
                <div key={s.id} className="flex items-center gap-2.5 px-2.5 py-2 rounded border border-zinc-800 bg-zinc-900/30 opacity-60">
                  <span className="w-2.5 h-2.5 rounded-full border border-zinc-700 shrink-0" />
                  <span className="text-xs text-zinc-500 flex-1 truncate">{s.label}</span>
                  <span className="font-mono text-[10px] text-zinc-700">pending</span>
                </div>
              );
            })}
          </div>

          {/* Right pane — terminal stream of the currently running check */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="px-5 py-3 border-b border-zinc-900 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.22em] text-zinc-500">
              <span className="text-violet-300 truncate">› {activeStep?.label ?? "preparing"}</span>
              <span className="h-px flex-1 bg-zinc-900" />
              <span className="shrink-0">step {activeStep ? activeStep.idx + 1 : 0} of {STEPS.length}</span>
            </div>

            <div className="flex-1 px-5 py-4 font-mono text-[12.5px] leading-[1.75] overflow-hidden">
              {activeStep && visibleLineCount > 0 ? (
                activeLines.slice(0, visibleLineCount).map((line, i) => {
                  const isCurrent = i === visibleLineCount - 1 && visibleLineCount < activeLines.length;
                  return (
                    <div
                      key={`${activeStep.id}-${i}`}
                      className={`fade-up ${isCurrent ? "text-zinc-300" : "text-zinc-500"}`}
                    >
                      <span className={isCurrent ? "text-violet-400" : "text-emerald-400"}>
                        {isCurrent ? "[▸]" : "[✓]"}
                      </span>{" "}
                      {line}
                      {isCurrent && <span className="text-violet-400 ml-1 animate-pulse">▌</span>}
                    </div>
                  );
                })
              ) : (
                <div className="text-zinc-600">Preparing&hellip;</div>
              )}
            </div>

            {/* Progress + footer */}
            <div className="px-5 py-2.5 border-t border-zinc-900">
              <div className="h-[2px] rounded-full bg-zinc-900 overflow-hidden mb-2">
                <div
                  className="h-full bg-violet-500/80 transition-[width] duration-300 ease-linear"
                  style={{ width: `${totalProgress * 100}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-500">
                <span><span className="text-violet-400">●</span> live</span>
                <span className="tabular-nums">
                  {activeStep ? activeStep.label.toLowerCase() : "warming up"}
                  {" · "}
                  {Math.max(0, activeElapsedInStep).toFixed(1)}s
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {elapsed > 45 && (
        <p className="mt-6 text-[11px] text-amber-400/70 max-w-xs text-center leading-relaxed">
          Taking longer than usual — PageSpeed can be slow under load.
        </p>
      )}
    </div>
  );
}
