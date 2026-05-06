// frontend/src/components/cards/ExecutiveSummaryCard.tsx
import { useState } from "react";
import type { Insights, InsightItem } from "../../utils/insights";
import { CardShell } from "../ui/CardShell";
import { scoreColor, scoreBg } from "../../utils/scoreColors";

type ScoreKey = "seo" | "performance" | "ux" | "conversion";

const SCORE_EXPLANATIONS: Record<ScoreKey, (score: number) => { means: string; next: string }> = {
  seo: (s) => ({
    means: s >= 75
      ? "Your SEO fundamentals are solid. Most technical checks are passing."
      : s >= 50
      ? "Your SEO setup is partial. Several important checks are failing or flagged."
      : "Your SEO has critical gaps that are likely hurting your search visibility.",
    next: s >= 75
      ? "Focus on content quality and earning backlinks — technical SEO is covered."
      : s >= 50
      ? "Fix the failing checks in the SEO Audit tab, starting with title and meta description."
      : "Open the SEO Audit tab and work through every red item before anything else.",
  }),
  performance: (s) => ({
    means: s < 0
      ? "Performance data is unavailable — PageSpeed could not be reached for this site."
      : s >= 75
      ? "Pages load quickly. Users get a good experience across devices."
      : s >= 50
      ? "Load times are acceptable on desktop but likely slow on mobile."
      : "Slow page load is actively costing you visitors and rankings.",
    next: s < 0
      ? "Try re-running the analysis when the site is accessible to Google PageSpeed."
      : s >= 75
      ? "Monitor Core Web Vitals in Google Search Console to maintain this."
      : s >= 50
      ? "Optimize images (convert to WebP) and defer non-critical JavaScript."
      : "Prioritize reducing LCP — compress images and eliminate render-blocking scripts.",
  }),
  ux: (s) => ({
    means: s >= 75
      ? "Key UX signals are in place — visitors have what they need to engage."
      : s >= 50
      ? "Some UX elements are missing. Visitors may feel uncertain about next steps."
      : "Critical UX signals are absent. Visitors are likely confused or distrustful.",
    next: s >= 75
      ? "Run user testing to find friction that metrics can't catch."
      : s >= 50
      ? "Add missing elements — focus on trust signals and a clear CTA first."
      : "Add a CTA and trust signals immediately. These have the highest ROI.",
  }),
  conversion: (s) => ({
    means: s >= 65
      ? "The page communicates its value clearly and removes most friction."
      : s >= 45
      ? "The conversion path exists but has gaps in clarity or trust."
      : "Significant barriers are preventing visitors from converting.",
    next: s >= 65
      ? "A/B test your CTA copy and headline to squeeze out more conversions."
      : s >= 45
      ? "Review the Conversion tab — focus on clarity score and CTA strength first."
      : "Open the Conversion tab and address every red item. Start with the value proposition.",
  }),
};

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

function ScorePill({ label, score, tooltip, scoreKey }: {
  label: string;
  score: number;
  tooltip: string;
  scoreKey?: ScoreKey;
}) {
  const [open, setOpen] = useState(false);
  const exp = scoreKey ? SCORE_EXPLANATIONS[scoreKey]?.(score) : null;

  return (
    <div className="relative">
      <div className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg border ${scoreBg(score)}`} title={tooltip}>
        <span className={`text-xl font-bold tabular-nums leading-none ${scoreColor(score)}`}>{score}</span>
        <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider text-center leading-tight flex items-center gap-0.5">
          {label}
          {exp && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
              aria-label={`${label} score explanation`}
              aria-expanded={open}
              className="text-zinc-600 hover:text-zinc-400 transition-colors leading-none"
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
            </button>
          )}
        </span>
      </div>
      {open && exp && (
        <div className="absolute z-20 top-full left-1/2 -translate-x-1/2 mt-2 w-60
                        rounded-xl bg-zinc-900 border border-zinc-700 shadow-2xl p-3.5 text-left">
          <button
            type="button"
            className="fixed inset-0 z-[-1]"
            onClick={() => setOpen(false)}
            aria-label="Close explanation"
            tabIndex={-1}
          />
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
            What this means
          </p>
          <p className="text-[11px] text-zinc-300 leading-snug mb-2.5">{exp.means}</p>
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
            What to do next
          </p>
          <p className="text-[11px] text-zinc-300 leading-snug">{exp.next}</p>
        </div>
      )}
    </div>
  );
}

function PerfPill({ score, view, hasBoth, onToggle, scoreKey, perfUnavailable }: {
  score: number;
  view: "mobile" | "desktop";
  hasBoth: boolean;
  onToggle: () => void;
  scoreKey?: ScoreKey;
  perfUnavailable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const scoreForExp = perfUnavailable ? -1 : score;
  const exp = scoreKey ? SCORE_EXPLANATIONS[scoreKey]?.(scoreForExp) : null;

  return (
    <div className="relative">
      <div className={`flex flex-col items-center gap-0.5 px-3 py-2.5 rounded-lg border ${scoreBg(score)}`}>
        <span className={`text-xl font-bold tabular-nums leading-none ${scoreColor(score)}`}>{score}</span>
        <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-0.5">
          Performance
          {exp && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
              aria-label="Performance score explanation"
              aria-expanded={open}
              className="text-zinc-600 hover:text-zinc-400 transition-colors leading-none"
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
            </button>
          )}
        </span>
        {hasBoth && (
          <div className="flex items-center gap-1 mt-0.5">
            <button onClick={() => view !== "mobile" && onToggle()} title="Mobile score" className="p-0.5 transition-all">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={view === "mobile" ? { color: "white", filter: "drop-shadow(0 0 4px rgba(255,255,255,0.8))" } : { color: "#52525b" }}>
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
              </svg>
            </button>
            <button onClick={() => view !== "desktop" && onToggle()} title="Desktop score" className="p-0.5 transition-all">
              <svg width="11" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                style={view === "desktop" ? { color: "white", filter: "drop-shadow(0 0 4px rgba(255,255,255,0.8))" } : { color: "#52525b" }}>
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
            </button>
          </div>
        )}
      </div>
      {open && exp && (
        <div className="absolute z-20 top-full left-1/2 -translate-x-1/2 mt-2 w-60
                        rounded-xl bg-zinc-900 border border-zinc-700 shadow-2xl p-3.5 text-left">
          <button
            type="button"
            className="fixed inset-0 z-[-1]"
            onClick={() => setOpen(false)}
            aria-label="Close explanation"
            tabIndex={-1}
          />
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
            What this means
          </p>
          <p className="text-[11px] text-zinc-300 leading-snug mb-2.5">{exp.means}</p>
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
            What to do next
          </p>
          <p className="text-[11px] text-zinc-300 leading-snug">{exp.next}</p>
        </div>
      )}
    </div>
  );
}

export function ExecutiveSummaryCard({ insights }: { insights: Insights }) {
  const { overallScore, seoScore, perfScore, perfScoreMobile, perfScoreDesktop, perfUnavailable, uxScore, conversionScore, topIssues, quickWins, summarySentence } = insights;
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
          <ScorePill label="SEO"        score={seoScore}        tooltip="Proportion of SEO checks passing"         scoreKey="seo" />
          <PerfPill
            score={displayedPerfScore}
            view={perfView}
            hasBoth={hasBoth}
            onToggle={() => setPerfView((v) => v === "mobile" ? "desktop" : "mobile")}
            scoreKey="performance"
            perfUnavailable={perfUnavailable}
          />
          <ScorePill label="UX"         score={uxScore}         tooltip="UX signals: CTA, trust, mobile, forms, etc." scoreKey="ux" />
          <ScorePill label="Conversion" score={conversionScore} tooltip="Clarity, trust, CTA strength, friction"    scoreKey="conversion" />
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
