import { Separator } from "@/components/ui/separator";
import type { AnalysisResult } from "../../types/analysis";
import { OverviewCard }        from "../cards/OverviewCard";
import { TechStackCard }       from "../cards/TechStackCard";
import { SeoAuditCard }        from "../cards/SeoAuditCard";
import { ConversionCard }      from "../cards/ConversionCard";
import { WeakPointsCard }      from "../cards/WeakPointsCard";
import { RecommendationsCard } from "../cards/RecommendationsCard";
import { PageStatsCard }       from "../cards/PageStatsCard";
import { CopyButton }          from "../ui/CopyButton";
import { DownloadButton }      from "../ui/DownloadButton";

function computeScores(result: AnalysisResult) {
  const pass     = result.seoChecks.filter((c) => c.status === "pass").length;
  const seoScore = result.seoChecks.length ? Math.round((pass / result.seoChecks.length) * 100) : 0;
  const uxSigs   = [result.ux.hasCTA, result.ux.hasForms, result.ux.hasSocialProof, result.ux.hasTrustSignals, result.ux.hasContactInfo, result.ux.mobileReady];
  const uxScore  = Math.round((uxSigs.filter(Boolean).length / uxSigs.length) * 100);
  return { seoScore, uxScore };
}

function scoreColor(n: number) {
  return n >= 80 ? "text-emerald-400" : n >= 50 ? "text-amber-400" : "text-rose-400";
}

function StatItem({ label, value, valueClass = "text-slate-100" }: {
  label: string; value: string | number; valueClass?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={`text-xl font-bold leading-none ${valueClass}`}>{value}</span>
      <span className="text-xs text-slate-500">{label}</span>
    </div>
  );
}

export function ResultDashboard({ result, onReset }: { result: AnalysisResult; onReset: () => void }) {
  const { seoScore, uxScore } = computeScores(result);
  const issueCount = result.weakPoints.length;

  return (
    <div className="w-full max-w-5xl mx-auto px-5 pb-20">

      {/* Sticky action bar */}
      <div className="sticky top-0 z-10 backdrop-blur-md bg-slate-900/80 border-b border-white/6 -mx-5 px-5 py-3 mb-6 flex items-center gap-3 flex-wrap">
        <span className="text-sm text-slate-400 truncate flex-1 min-w-0">{result.url}</span>
        <div className="flex items-center gap-2 shrink-0">
          <CopyButton result={result} />
          <DownloadButton result={result} />
          <button onClick={onReset} className="btn-ghost text-sm">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/>
            </svg>
            New analysis
          </button>
        </div>
      </div>

      <div className="space-y-4">

        {/* Overview */}
        <OverviewCard overview={result.overview} url={result.url} fetchedAt={result.fetchedAt} />

        {/* Stats strip */}
        <div className="rounded-xl border border-white/8 bg-white/4 px-6 py-4 flex items-center justify-around gap-4">
          <StatItem label="SEO Score"    value={`${seoScore}/100`}              valueClass={scoreColor(seoScore)} />
          <Separator orientation="vertical" className="h-8" />
          <StatItem label="UX Score"     value={`${uxScore}/100`}               valueClass={scoreColor(uxScore)} />
          <Separator orientation="vertical" className="h-8" />
          <StatItem label="Technologies" value={result.techStack.length} />
          <Separator orientation="vertical" className="h-8" />
          <StatItem label="Issues"       value={issueCount}
            valueClass={issueCount === 0 ? "text-emerald-400" : issueCount <= 3 ? "text-amber-400" : "text-rose-400"} />
          {result.pageStats && (
            <>
              <Separator orientation="vertical" className="h-8" />
              <StatItem label="Words" value={result.pageStats.wordCount.toLocaleString()} />
            </>
          )}
        </div>

        {/* SEO + Tech & Conversion */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <SeoAuditCard seoChecks={result.seoChecks} />
          <div className="flex flex-col gap-4">
            <TechStackCard techStack={result.techStack} />
            <ConversionCard ux={result.ux} />
          </div>
        </div>

        {/* Page Stats */}
        {result.pageStats && <PageStatsCard pageStats={result.pageStats} />}

        {/* Weak Points + Recommendations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
          <WeakPointsCard weakPoints={result.weakPoints} />
          <RecommendationsCard recommendations={result.recommendations} />
        </div>

      </div>
    </div>
  );
}
