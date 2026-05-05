// frontend/src/components/cards/ExecutiveSummaryCard.tsx
import { useState } from "react";
import type { Insights, InsightItem } from "../../utils/insights";
import { CardShell } from "../ui/CardShell";
import { scoreColor, scoreBg } from "../../utils/scoreColors";

function overallLabel(n: number) {
  if (n >= 80) return "Excellent";
  if (n >= 65) return "Good";
  if (n >= 50) return "Fair";
  if (n >= 35) return "Poor";
  return "Critical";
}

function ImpactDot({ impact }: { impact: InsightItem["impact"] }) {
  return (
    <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${
      impact === "high" ? "bg-red-500" : impact === "medium" ? "bg-amber-500" : "bg-zinc-500"
    }`} />
  );
}

function ScorePill({ label, score, tooltip }: { label: string; score: number; tooltip: string }) {
  return (
    <div className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg border ${scoreBg(score)}`} title={tooltip}>
      <span className={`text-xl font-bold tabular-nums leading-none ${scoreColor(score)}`}>{score}</span>
      <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider text-center leading-tight">{label}</span>
    </div>
  );
}

function PerfPill({ score, view, hasBoth, onToggle }: {
  score: number;
  view: "mobile" | "desktop";
  hasBoth: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg border ${scoreBg(score)}`}>
      <span className={`text-xl font-bold tabular-nums leading-none ${scoreColor(score)}`}>{score}</span>
      {hasBoth ? (
        <button
          onClick={onToggle}
          className="flex items-center gap-0.5 mt-0.5 group"
          title={`Showing ${view} — click to switch`}
        >
          <span className={`text-[9px] font-semibold uppercase tracking-wider transition-colors ${view === "mobile" ? "text-zinc-300" : "text-zinc-600 group-hover:text-zinc-400"}`}>M</span>
          <span className="text-[9px] text-zinc-700 mx-0.5">/</span>
          <span className={`text-[9px] font-semibold uppercase tracking-wider transition-colors ${view === "desktop" ? "text-zinc-300" : "text-zinc-600 group-hover:text-zinc-400"}`}>D</span>
        </button>
      ) : (
        <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider">Perf</span>
      )}
    </div>
  );
}

export function ExecutiveSummaryCard({ insights }: { insights: Insights }) {
  const { overallScore, seoScore, perfScore, perfScoreMobile, perfScoreDesktop, uxScore, conversionScore, topIssues, quickWins, summarySentence } = insights;
  const [perfView, setPerfView] = useState<"mobile" | "desktop">("mobile");

  const hasBoth = perfScoreMobile >= 0 && perfScoreDesktop >= 0;
  const displayedPerfScore = !hasBoth
    ? perfScore
    : perfView === "mobile" ? perfScoreMobile : perfScoreDesktop;

  return (
    <CardShell>
      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-[0.2em] mb-1">Executive Summary</p>
            <p className="text-sm text-zinc-300 leading-relaxed max-w-xl">{summarySentence}</p>
          </div>
          {/* Overall score ring */}
          <div className="shrink-0 flex flex-col items-center gap-1">
            <div className={`w-16 h-16 rounded-full border-2 flex flex-col items-center justify-center ${
              overallScore >= 75 ? "border-emerald-500/40 bg-emerald-500/5"
              : overallScore >= 50 ? "border-amber-500/40 bg-amber-500/5"
              : "border-red-500/40 bg-red-500/5"
            }`}>
              <span className={`text-xl font-bold leading-none tabular-nums ${scoreColor(overallScore)}`}>{overallScore}</span>
              <span className="text-[9px] text-zinc-600 mt-0.5">/100</span>
            </div>
            <span className={`text-[10px] font-semibold ${scoreColor(overallScore)}`}>{overallLabel(overallScore)}</span>
          </div>
        </div>

        {/* Sub-scores */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          <ScorePill label="SEO"        score={seoScore}           tooltip="Proportion of SEO checks passing" />
          <PerfPill
            score={displayedPerfScore}
            view={perfView}
            hasBoth={hasBoth}
            onToggle={() => setPerfView((v) => v === "mobile" ? "desktop" : "mobile")}
          />
          <ScorePill label="UX"         score={uxScore}            tooltip="UX signals: CTA, trust, mobile, forms, etc." />
          <ScorePill label="Conversion" score={conversionScore}    tooltip="Clarity, trust, CTA strength, friction" />
        </div>

        {/* Top issues + Quick wins */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Top Issues */}
          <div className="rounded-lg bg-red-950/20 border border-red-900/30 p-3.5">
            <div className="flex items-center gap-2 mb-2.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-400 shrink-0">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">Top Issues</span>
            </div>
            {topIssues.length === 0 ? (
              <p className="text-xs text-zinc-500">No critical issues found.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {topIssues.map((item) => (
                  <div key={item.id} className="flex items-start gap-2">
                    <ImpactDot impact={item.impact} />
                    <div>
                      <p className="text-xs font-medium text-zinc-200">{item.title}</p>
                      <p className="text-[11px] text-zinc-500 leading-snug">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Wins */}
          <div className="rounded-lg bg-emerald-950/20 border border-emerald-900/30 p-3.5">
            <div className="flex items-center gap-2 mb-2.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400 shrink-0">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Quick Wins</span>
            </div>
            {quickWins.length === 0 ? (
              <p className="text-xs text-zinc-500">No quick wins detected.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {quickWins.map((item) => (
                  <div key={item.id} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 bg-emerald-500" />
                    <div>
                      <p className="text-xs font-medium text-zinc-200">{item.title}</p>
                      <p className="text-[11px] text-zinc-500 leading-snug">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </CardShell>
  );
}
