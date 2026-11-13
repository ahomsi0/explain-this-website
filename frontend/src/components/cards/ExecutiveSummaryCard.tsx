// frontend/src/components/cards/ExecutiveSummaryCard.tsx
import { useState } from "react";
import type { Insights, InsightItem } from "../../utils/insights";
import type { FirstImpression } from "../../types/analysis";
import { CardShell } from "../ui/CardShell";
import { scoreColor, scoreFill, scoreLabel } from "../../utils/scoreColors";

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

const IMPACT_TAG: Record<InsightItem["impact"], { tag: string; color: string }> = {
  high:   { tag: "HIGH", color: "text-red-400" },
  medium: { tag: "MED",  color: "text-amber-400" },
  low:    { tag: "LOW",  color: "text-zinc-500" },
};

/**
 * Top issues and quick wins as plain ruled lists: a mono impact tag, the
 * issue, and why it matters. No tinted panels, icons or bullets, so the two
 * columns read as part of the report instead of as two alert boxes.
 */
function InsightList({ title, items, empty }: { title: string; items: InsightItem[]; empty: string }) {
  return (
    <div>
      <p className="flex items-baseline justify-between border-b border-zinc-800 pb-2 text-xs font-medium text-zinc-400">
        {title}
        <span className="tabular-nums text-zinc-500">{items.length}</span>
      </p>
      {items.length === 0 ? (
        <p className="pt-3 text-xs text-zinc-500">{empty}</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id} className="grid grid-cols-[38px_1fr] items-baseline gap-x-3 border-b border-zinc-800 py-2.5 last:border-b-0">
              <span className={`font-mono text-[11px] tracking-[0.08em] ${IMPACT_TAG[item.impact].color}`}>
                {IMPACT_TAG[item.impact].tag}
              </span>
              <div>
                <p className="text-[13px] font-medium text-zinc-100">{item.title}</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-zinc-400">{item.description}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * A thin rule filled to the score. It is the only place score colour is
 * spent on these stats, and unlike a ring outline it carries the value:
 * you can compare four scores by line length before reading a number.
 */
function Meter({ value, unavailable }: { value: number; unavailable?: boolean }) {
  return (
    <div className="score-track h-[3px] w-full overflow-hidden rounded-full" aria-hidden="true">
      {!unavailable && (
        <div
          className={`h-full rounded-full ${scoreFill(value)}`}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      )}
    </div>
  );
}

function ScoreStat({ label, score, tooltip, scoreKey, expScore, unavailable, isOpen, onToggle, viewToggle, suffix, meterValue, explanation }: {
  label: string;
  score: number;
  tooltip: string;
  scoreKey?: ScoreKey;
  expScore?: number;   // override score used for explanation (e.g. -1 when perf unavailable)
  /** Unit shown after the number when the score is not out of 100, e.g. "/ 10". */
  suffix?: string;
  /** Meter fill out of 100 when `score` is on another scale. */
  meterValue?: number;
  /** Popover text supplied by the caller instead of looked up by `scoreKey`. */
  explanation?: { means: string; next?: string };
  unavailable?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
  /** Optional M/D text toggle shown in the label row */
  viewToggle?: { active: "mobile" | "desktop"; onSwitch: () => void };
}) {
  const exp: { means: string; next?: string } | null =
    explanation ?? (scoreKey ? SCORE_EXPLANATIONS[scoreKey]?.(expScore ?? score) : null);
  const displayScore = unavailable ? "N/A" : score;

  return (
    <div className="relative">
      {/* Backdrop — sits behind popover (z-20) but above page (z-10), catches outside clicks */}
      {isOpen && exp && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => onToggle?.()}
          aria-hidden="true"
        />
      )}
      <div title={tooltip}>
        <Meter value={meterValue ?? score} unavailable={unavailable} />
        <span className="mt-2.5 text-xs font-medium text-zinc-400 leading-tight flex items-center gap-1">
          {viewToggle ? (
            <>
              <button type="button" onClick={(e) => { e.stopPropagation(); if (viewToggle.active !== "mobile") viewToggle.onSwitch(); }}
                className={`transition-colors ${viewToggle.active === "mobile" ? "text-zinc-200 underline underline-offset-2" : "text-zinc-600 hover:text-zinc-400"}`}>
                Mobile
              </button>
              <span className="text-zinc-700">/</span>
              <button type="button" onClick={(e) => { e.stopPropagation(); if (viewToggle.active !== "desktop") viewToggle.onSwitch(); }}
                className={`transition-colors ${viewToggle.active === "desktop" ? "text-zinc-200 underline underline-offset-2" : "text-zinc-600 hover:text-zinc-400"}`}>
                Desktop
              </button>
            </>
          ) : label}
          {exp && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onToggle?.(); }}
              aria-label={`${label} score explanation`}
              aria-expanded={isOpen}
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
        <p className={`mt-1.5 flex items-baseline gap-1 text-2xl font-semibold tabular-nums leading-none tracking-tight ${unavailable ? "text-zinc-500" : "text-zinc-100"}`}>
          {displayScore}
          {suffix && !unavailable && <span className="text-xs font-normal tracking-normal text-zinc-500">{suffix}</span>}
        </p>
      </div>
      {isOpen && exp && (
        <div className="absolute z-20 top-full left-1/2 -translate-x-1/2 mt-2 w-60
                        rounded-xl bg-zinc-900 border border-zinc-700 shadow-2xl p-3.5 text-left">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
            What this means
          </p>
          <p className={`text-[11px] text-zinc-300 leading-snug ${exp.next ? "mb-2.5" : ""}`}>{exp.means}</p>
          {exp.next && (
            <>
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                What to do next
              </p>
              <p className="text-[11px] text-zinc-300 leading-snug">{exp.next}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function ExecutiveSummaryCard({ insights, firstImpression }: { insights: Insights; firstImpression?: FirstImpression }) {
  const { overallScore, seoScore, perfScore, perfScoreMobile, perfScoreDesktop, perfUnavailable, uxScore, conversionScore, topIssues, quickWins, summarySentence } = insights;
  const [openKey, setOpenKey] = useState<ScoreKey | "impression" | null>(null);
  const [perfView, setPerfView] = useState<"mobile" | "desktop">("mobile");

  const hasBothPerf = perfScoreMobile >= 0 && perfScoreDesktop >= 0;
  const displayedPerfScore = hasBothPerf
    ? (perfView === "mobile" ? perfScoreMobile : perfScoreDesktop)
    : perfScore;

  function toggle(key: ScoreKey | "impression") {
    setOpenKey((prev) => (prev === key ? null : key));
  }

  // First impression used to live only in the header strip, which phones do
  // not show and which is absent from every tab but Overview. Older saved
  // reports may not have it, so the grid is four or five columns wide.
  const hasImpression = typeof firstImpression?.score === "number";
  const headerGrid = hasImpression ? "sm:grid-cols-3 lg:grid-cols-5" : "sm:grid-cols-4";
  const summarySpan = hasImpression ? "sm:col-span-2 lg:col-span-4" : "sm:col-span-3";
  const statsGrid = hasImpression ? "sm:grid-cols-3 lg:grid-cols-5" : "sm:grid-cols-4";

  return (
    <CardShell variant="primary">
      <div className="p-5">
        {/* Header row */}
        {/* Same columns as the sub-scores, so the overall stat sits exactly
            above the last one. */}
        <div className={`grid grid-cols-1 ${headerGrid} gap-x-5 gap-y-5 mb-6`}>
          <div className={summarySpan}>
            <p className="text-[11px] font-semibold text-violet-400 uppercase tracking-[0.2em] mb-1">Executive Summary</p>
            <p className="text-sm text-zinc-300 leading-relaxed max-w-xl">{summarySentence}</p>
          </div>
          {/* Overall score: the same stat as the four below, one size up. */}
          <div>
            <Meter value={overallScore} />
            <p className="mt-2.5 text-xs font-medium text-zinc-400">Overall score</p>
            <p className="mt-1.5 flex items-baseline gap-1.5">
              <span className="text-4xl font-semibold tabular-nums leading-none tracking-tight text-zinc-100">{overallScore}</span>
              <span className="text-sm text-zinc-500">/ 100</span>
            </p>
            <p className={`mt-2 text-xs font-semibold whitespace-nowrap ${scoreColor(overallScore)}`}>{scoreLabel(overallScore)}</p>
          </div>
        </div>

        {/* Sub-scores */}
        <div className={`grid grid-cols-2 ${statsGrid} gap-x-5 gap-y-5 mb-6`}>
          <ScoreStat label="SEO"         score={seoScore}        tooltip="Proportion of SEO checks passing"            scoreKey="seo"         isOpen={openKey === "seo"}         onToggle={() => toggle("seo")} />
          <ScoreStat
            label="Performance"
            score={displayedPerfScore}
            tooltip={hasBothPerf ? `Mobile: ${perfScoreMobile} · Desktop: ${perfScoreDesktop}` : "PageSpeed mobile performance score"}
            scoreKey="performance"
            isOpen={openKey === "performance"}
            onToggle={() => toggle("performance")}
            expScore={perfUnavailable ? -1 : displayedPerfScore}
            unavailable={perfUnavailable}
            viewToggle={hasBothPerf ? { active: perfView, onSwitch: () => setPerfView(v => v === "mobile" ? "desktop" : "mobile") } : undefined}
          />
          <ScoreStat label="UX"          score={uxScore}         tooltip="UX signals: CTA, trust, mobile, forms, etc." scoreKey="ux"          isOpen={openKey === "ux"}          onToggle={() => toggle("ux")} />
          <ScoreStat label="Conversion"  score={conversionScore} tooltip="Clarity, trust, CTA strength, friction"      scoreKey="conversion"  isOpen={openKey === "conversion"}  onToggle={() => toggle("conversion")} />
          {hasImpression && (
            <ScoreStat
              label="First impression"
              score={firstImpression!.score}
              suffix="/ 10"
              meterValue={firstImpression!.score * 10}
              tooltip="How the page lands in the first few seconds"
              explanation={{ means: [firstImpression!.label, firstImpression!.explanation].filter(Boolean).join(". ") }}
              isOpen={openKey === "impression"}
              onToggle={() => toggle("impression")}
            />
          )}
        </div>

        {/* Top issues + Quick wins */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-6">
          <InsightList title="Top issues" items={topIssues} empty="No critical issues found." />
          <InsightList title="Quick wins" items={quickWins} empty="No quick wins detected." />
        </div>
      </div>
    </CardShell>
  );
}
