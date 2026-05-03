import { useState } from "react";
import type { PerformanceResult, StrategyData, CoreWebVital, CWVRating } from "../../types/analysis";
import { CardShell } from "../ui/CardShell";
import { CardHeader } from "../ui/CardHeader";

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
      <div className="grid grid-cols-4 gap-2 mb-4 pb-4 border-b border-zinc-800">
        <ScoreGauge label="Performance"    score={lh.performance} />
        <ScoreGauge label="Accessibility"  score={lh.accessibility} />
        <ScoreGauge label="Best Practices" score={lh.bestPractices} />
        <ScoreGauge label="SEO"            score={lh.seo} />
      </div>

      {/* Lab metrics */}
      <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider mb-1">Lab Data (Simulated)</p>
      <div className="mb-3">
        <VitalRow label="Largest Contentful Paint" vital={lcp} />
        <VitalRow label="First Contentful Paint"   vital={fcp} />
        <VitalRow label="Total Blocking Time"       vital={tbt} />
        <VitalRow label="Cumulative Layout Shift"   vital={cls} />
        <VitalRow label="Speed Index"               vital={speedIndex} />
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

export function PerformanceCard({ performance }: { performance: PerformanceResult }) {
  // Default to mobile when both available; otherwise pick whichever exists.
  const initial: Strategy = performance.mobile ? "mobile" : "desktop";
  const [strategy, setStrategy] = useState<Strategy>(initial);

  const data = strategy === "mobile" ? performance.mobile : performance.desktop;
  if (!data) return null;

  const mobileLhScore = performance.mobile?.lighthouse?.performance;
  const badge = mobileLhScore !== undefined ? `${mobileLhScore}/100` : undefined;
  const badgeColor = mobileLhScore !== undefined
    ? (mobileLhScore >= 90 ? "green" : mobileLhScore >= 50 ? "amber" : "red") as "green" | "amber" | "red"
    : "violet" as const;

  return (
    <CardShell>
      <CardHeader title="Core Web Vitals" badge={badge} badgeColor={badgeColor} />
      <div className="p-4">
        <div className="flex items-center justify-between mb-1">
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

        <p className="text-[10px] text-zinc-700 mt-3">
          {strategy === "mobile" ? "Mobile" : "Desktop"} · via Google PageSpeed Insights
        </p>
      </div>
    </CardShell>
  );
}
