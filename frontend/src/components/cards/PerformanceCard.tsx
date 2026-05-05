import { useState } from "react";
import type { PerformanceResult, StrategyData, CoreWebVital, CWVRating } from "../../types/analysis";
import { CardShell } from "../ui/CardShell";
import { CardHeader } from "../ui/CardHeader";
import { ScoreInsight } from "../ui/ScoreInsight";

function ratingColor(r: CWVRating) {
  return r === "good" ? "text-emerald-400" : r === "needs-improvement" ? "text-amber-400" : "text-red-400";
}

function ratingDot(r: CWVRating) {
  return r === "good" ? "bg-emerald-500" : r === "needs-improvement" ? "bg-amber-500" : "bg-red-500";
}

function ratingBadge(r: CWVRating) {
  const base = "text-[10px] font-medium px-1.5 py-0.5 rounded";
  return r === "good"
    ? `${base} bg-emerald-950 text-emerald-400 border border-emerald-800`
    : r === "needs-improvement"
    ? `${base} bg-amber-950 text-amber-400 border border-amber-800`
    : `${base} bg-red-950 text-red-400 border border-red-800`;
}

function lighthouseColor(score: number) {
  return score >= 90 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-red-400";
}

function lighthouseRingColor(score: number) {
  return score >= 90 ? "stroke-emerald-500" : score >= 50 ? "stroke-amber-500" : "stroke-red-500";
}

function ScoreGauge({ label, score }: { label: string; score: number }) {
  const r = 16;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative w-12 h-12">
        <svg viewBox="0 0 40 40" className="w-12 h-12 -rotate-90">
          <circle cx="20" cy="20" r={r} fill="none" stroke="#27272a" strokeWidth="4" />
          <circle
            cx="20" cy="20" r={r} fill="none" strokeWidth="4"
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
            className={lighthouseRingColor(score)}
          />
        </svg>
        <span className={`absolute inset-0 flex items-center justify-center text-[11px] font-bold ${lighthouseColor(score)}`}>
          {score}
        </span>
      </div>
      <span className="text-[10px] text-zinc-500 text-center leading-tight">{label}</span>
    </div>
  );
}

function VitalRow({ label, vital }: { label: string; vital: CoreWebVital }) {
  if (!vital.displayValue) return null;
  return (
    <div className="flex items-center gap-2.5 py-2 border-b border-zinc-800/60 last:border-0">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${ratingDot(vital.rating)}`} />
      <span className="text-xs text-zinc-300 flex-1">{label}</span>
      <span className={`text-xs font-semibold tabular-nums ${ratingColor(vital.rating)}`}>
        {vital.displayValue}
      </span>
      <span className={ratingBadge(vital.rating)}>
        {vital.rating === "needs-improvement" ? "OK" : vital.rating.charAt(0).toUpperCase() + vital.rating.slice(1)}
      </span>
    </div>
  );
}

function StrategyView({ data }: { data: StrategyData }) {
  const { lighthouse: lh, fcp, lcp, tbt, cls, speedIndex, fieldLcp, fieldCls, fieldInp, fieldFcp } = data;
  const hasFieldData = !!(fieldLcp || fieldCls || fieldInp || fieldFcp);

  return (
    <>
      {/* Lighthouse scores */}
      {lh && (
        <div className="grid grid-cols-4 gap-2 mb-4 pb-4 border-b border-zinc-800">
          <ScoreGauge label="Performance"    score={lh.performance ?? 0} />
          <ScoreGauge label="Accessibility"  score={lh.accessibility ?? 0} />
          <ScoreGauge label="Best Practices" score={lh.bestPractices ?? 0} />
          <ScoreGauge label="SEO"            score={lh.seo ?? 0} />
        </div>
      )}

      {/* Lab metrics */}
      <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider mb-1">Lab Data (Simulated)</p>
      <div className="mb-3">
        {lcp && <VitalRow label="Largest Contentful Paint" vital={lcp} />}
        {fcp && <VitalRow label="First Contentful Paint"   vital={fcp} />}
        {tbt && <VitalRow label="Total Blocking Time"       vital={tbt} />}
        {cls && <VitalRow label="Cumulative Layout Shift"   vital={cls} />}
        {speedIndex && <VitalRow label="Speed Index"        vital={speedIndex} />}
      </div>

      {/* Field data (CrUX real-user metrics) */}
      {hasFieldData && (
        <>
          <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider mb-1 mt-3">
            Real User Data (CrUX)
          </p>
          <div>
            {fieldLcp && <VitalRow label="LCP (real users)" vital={fieldLcp} />}
            {fieldFcp && <VitalRow label="FCP (real users)" vital={fieldFcp} />}
            {fieldCls && <VitalRow label="CLS (real users)" vital={fieldCls} />}
            {fieldInp && <VitalRow label="INP (real users)" vital={fieldInp} />}
          </div>
        </>
      )}
    </>
  );
}

type Strategy = "mobile" | "desktop";

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-2.5 py-1 text-[11px] font-medium rounded transition-colors ${
        active
          ? "bg-violet-500/10 text-violet-300 border border-violet-500/30"
          : "text-zinc-500 hover:text-zinc-300 border border-transparent"
      }`}
    >
      {children}
    </button>
  );
}

function perfLabel(score: number): { text: string; cls: string } {
  if (score >= 90) return { text: "Fast",     cls: "text-emerald-400 bg-emerald-950 border-emerald-800" };
  if (score >= 50) return { text: "Moderate", cls: "text-amber-400   bg-amber-950  border-amber-800"   };
  return                  { text: "Slow",     cls: "text-red-400     bg-red-950    border-red-800"     };
}

function detectBottleneck(data: StrategyData): string | null {
  const { lcp, tbt, cls, fcp } = data;
  if (lcp?.rating === "poor") return "Largest Contentful Paint (LCP) is the biggest bottleneck — the main content takes too long to render.";
  if (tbt?.rating === "poor") return "Total Blocking Time (TBT) is high — JavaScript is blocking the main thread and delaying interactivity.";
  if (cls?.rating === "poor") return "Cumulative Layout Shift (CLS) is the primary issue — elements are moving around as the page loads.";
  if (fcp?.rating === "poor") return "First Contentful Paint (FCP) is slow — the browser is taking too long to render anything on screen.";
  if (lcp?.rating === "needs-improvement") return "LCP needs improvement — optimize your hero image or largest visible element.";
  if (tbt?.rating === "needs-improvement") return "TBT needs improvement — review render-blocking scripts and defer non-critical JS.";
  return null;
}

function buildSuggestions(data: StrategyData): string[] {
  const suggestions: string[] = [];
  const score = data.lighthouse?.performance ?? 100;

  if (score < 90) suggestions.push("Compress and convert images to WebP or AVIF format");
  if (data.tbt?.rating !== "good") suggestions.push("Defer or remove unused JavaScript to reduce blocking time");
  if (data.lcp?.rating !== "good") suggestions.push("Preload your largest above-the-fold image or hero element");
  if (data.cls?.rating !== "good") suggestions.push("Set explicit width/height on images to prevent layout shifts");
  if (score < 75) suggestions.push("Enable browser caching and use a CDN to serve assets faster");
  if (score < 60) suggestions.push("Minify CSS, JavaScript, and HTML to reduce file sizes");

  return suggestions.slice(0, 4);
}

function perfInsightText(score: number): { meaning: string; nextStep: string } {
  if (score >= 90) return {
    meaning: "Your page loads fast — users get a smooth, responsive experience.",
    nextStep: "Maintain these scores by running Lighthouse in CI and monitoring Core Web Vitals.",
  };
  if (score >= 50) return {
    meaning: "Moderate performance — some users, especially on mobile, may experience slow loads.",
    nextStep: "Address the bottleneck identified above; image optimization is usually the fastest win.",
  };
  return {
    meaning: "Slow performance is costing you users — Google penalizes slow pages in rankings too.",
    nextStep: "Start with image compression and deferring render-blocking JS — together they often double scores.",
  };
}

export function PerformanceCard({ performance }: { performance: PerformanceResult }) {
  const initial: Strategy = performance.mobile ? "mobile" : "desktop";
  const [strategy, setStrategy] = useState<Strategy>(initial);

  const data = strategy === "mobile" ? performance.mobile : performance.desktop;
  if (!data) return null;

  const mobileLhScore = performance.mobile?.lighthouse?.performance;
  const badge = mobileLhScore !== undefined ? `${mobileLhScore}/100` : undefined;
  const badgeColor = mobileLhScore !== undefined
    ? (mobileLhScore >= 90 ? "green" : mobileLhScore >= 50 ? "amber" : "red") as "green" | "amber" | "red"
    : "violet" as const;

  const lhScore     = data.lighthouse?.performance ?? 0;
  const label       = perfLabel(lhScore);
  const bottleneck  = detectBottleneck(data);
  const suggestions = buildSuggestions(data);
  const insight     = perfInsightText(lhScore);

  return (
    <CardShell>
      <CardHeader title="Core Web Vitals" badge={badge} badgeColor={badgeColor} />
      <div className="p-4">
        {/* Tab + performance label row */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${label.cls}`}>
            {label.text}
          </span>
          <div className="flex items-center gap-1">
            {performance.mobile && (
              <TabButton active={strategy === "mobile"} onClick={() => setStrategy("mobile")}>Mobile</TabButton>
            )}
            {performance.desktop && (
              <TabButton active={strategy === "desktop"} onClick={() => setStrategy("desktop")}>Desktop</TabButton>
            )}
          </div>
        </div>

        <p className="text-[11px] text-zinc-600 mb-4 leading-snug">
          Google's official Lighthouse scores — the SEO score here reflects technical SEO basics Google itself checks.
        </p>

        <StrategyView data={data} />

        {/* Bottleneck */}
        {bottleneck && (
          <div className="mt-4 flex gap-2.5 p-3 rounded-lg bg-amber-950/20 border border-amber-900/30">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400 shrink-0 mt-0.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <div>
              <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-0.5">Biggest Bottleneck</p>
              <p className="text-xs text-zinc-400 leading-snug">{bottleneck}</p>
            </div>
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="mt-3">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Suggestions</p>
            <div className="flex flex-col gap-1.5">
              {suggestions.map((s, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0 mt-1.5" />
                  <span className="text-xs text-zinc-400">{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-[10px] text-zinc-700 mt-3">
          {strategy === "mobile" ? "Mobile" : "Desktop"} · via Google PageSpeed Insights
        </p>

        <ScoreInsight meaning={insight.meaning} nextStep={insight.nextStep} />
      </div>
    </CardShell>
  );
}
