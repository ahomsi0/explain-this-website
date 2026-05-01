import { Separator } from "@/components/ui/separator";
import { LogoMark } from "../ui/Logo";
import type { AnalysisResult } from "../../types/analysis";
import { OverviewCard }          from "../cards/OverviewCard";
import { TechStackCard }         from "../cards/TechStackCard";
import { SEOAuditCard }          from "../cards/SeoAuditCard";
import { ConversionCard, TrustEngagementCard } from "../cards/ConversionCard";
import { ConversionScoreCard }   from "../cards/ConversionScoreCard";
import { WeakPointsCard }        from "../cards/WeakPointsCard";
import { RecommendationsCard }   from "../cards/RecommendationsCard";
import { PageStatsCard, PagePerfCard } from "../cards/PageStatsCard";
import { ContentCard }           from "../cards/ContentCard";
import { InsightCard }           from "../cards/InsightCard";
import { CustomerViewCard }      from "../cards/CustomerViewCard";
import { PrioritizedIssuesCard } from "../cards/PrioritizedIssuesCard";
import { ELI5Card }              from "../cards/ELI5Card";
import { PerformanceCard }       from "../cards/PerformanceCard";
import { CopyButton }            from "../ui/CopyButton";
import { DownloadButton }        from "../ui/DownloadButton";

function computeScores(result: AnalysisResult) {
  const pass     = result.seoChecks.filter((c) => c.status === "pass").length;
  const seoScore = result.seoChecks.length ? Math.round((pass / result.seoChecks.length) * 100) : 0;
  const uxSigs   = [result.ux.hasCTA, result.ux.hasForms, result.ux.hasSocialProof,
                    result.ux.hasTrustSignals, result.ux.hasContactInfo, result.ux.mobileReady];
  const uxScore  = Math.round((uxSigs.filter(Boolean).length / uxSigs.length) * 100);
  return { seoScore, uxScore };
}

function scoreColor(n: number) {
  return n >= 80 ? "text-emerald-400" : n >= 50 ? "text-amber-400" : "text-red-400";
}

function impressionColor(n: number) {
  return n >= 8 ? "text-emerald-400" : n >= 6 ? "text-amber-400" : n >= 4 ? "text-orange-400" : "text-red-400";
}

function Metric({ label, value, valueClass = "text-zinc-100" }: {
  label: string; value: string | number; valueClass?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 shrink-0">
      <span className="text-[11px] text-zinc-600 uppercase tracking-wider font-medium whitespace-nowrap">{label}</span>
      <span className={`text-lg font-semibold leading-none ${valueClass}`}>{value}</span>
    </div>
  );
}

function ColHeader({ label, description }: { label: string; description: string }) {
  return (
    <div className="mb-1">
      <h2 className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">{label}</h2>
      <p className="text-[11px] text-zinc-700 mt-0.5">{description}</p>
    </div>
  );
}

export function ResultDashboard({ result, onReset }: { result: AnalysisResult; onReset: () => void }) {
  const { seoScore, uxScore } = computeScores(result);
  const issueCount = result.weakPoints.length;
  const hostname = (() => { try { return new URL(result.url).hostname; } catch { return result.url; } })();

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950">

      {/* ── Top bar ── */}
      <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm">
        <div className="max-w-[1600px] mx-auto px-6 h-12 flex items-center gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <LogoMark size={22} />
            {/* h1 visible on desktop; sr-only version ensures crawlers always see it */}
            <h1 className="text-xs font-semibold text-zinc-400 hidden sm:block">Explain This Website</h1>
            <span className="sr-only">Explain This Website — Website Analysis Report</span>
          </div>

          <Separator orientation="vertical" className="h-4 bg-zinc-800" />

          <div className="flex-1 min-w-0 flex items-center gap-2">
            <span className="text-xs text-zinc-500 shrink-0">Analyzing</span>
            <span className="text-xs font-medium text-zinc-300 truncate">{hostname}</span>
            <span className="shrink-0 text-[10px] font-medium text-emerald-400 bg-emerald-950 border border-emerald-900 px-1.5 py-0.5 rounded">
              Done
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <CopyButton result={result} />
            <DownloadButton result={result} />
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-red-400 hover:text-red-200 hover:bg-red-950 border border-red-800 hover:border-red-600 transition-colors"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/>
              </svg>
              <span className="hidden sm:inline">New Analysis</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Metrics strip ── */}
      <div className="border-b border-zinc-800 bg-zinc-900/40">
        <div className="max-w-[1600px] mx-auto px-6 py-4 flex items-center gap-5 sm:gap-8 overflow-x-auto scrollbar-none">
          <Metric label="SEO Audit"      value={`${seoScore}/100`}  valueClass={scoreColor(seoScore)} />
          {result.performance?.mobile?.lighthouse && (
            <>
              <Separator orientation="vertical" className="h-8 bg-zinc-800 shrink-0" />
              <Metric label="Lighthouse SEO"
                value={`${result.performance.mobile.lighthouse.seo}/100`}
                valueClass={scoreColor(result.performance.mobile.lighthouse.seo)} />
            </>
          )}
          <Separator orientation="vertical" className="h-8 bg-zinc-800 shrink-0" />
          <Metric label="UX Score"       value={`${uxScore}/100`}   valueClass={scoreColor(uxScore)} />
          <Separator orientation="vertical" className="h-8 bg-zinc-800 shrink-0" />
          <Metric label="1st Impression" value={`${result.firstImpression.score}/10`}
            valueClass={impressionColor(result.firstImpression.score)} />
          <Separator orientation="vertical" className="h-8 bg-zinc-800 shrink-0" />
          <Metric label="Conv. Score"     value={`${result.conversionScores.overall}/100`}
            valueClass={scoreColor(result.conversionScores.overall)} />
          <Separator orientation="vertical" className="h-8 bg-zinc-800 shrink-0" />
          <Metric label="Tech Detected"  value={result.techStack.length} />
          <Separator orientation="vertical" className="h-8 bg-zinc-800 shrink-0" />
          <Metric label="Issues"         value={issueCount}
            valueClass={issueCount === 0 ? "text-emerald-400" : issueCount <= 3 ? "text-amber-400" : "text-red-400"} />
          <Separator orientation="vertical" className="h-8 bg-zinc-800 shrink-0" />
          <Metric label="Page Weight"    value={result.overview.pageLoadHint.charAt(0).toUpperCase() + result.overview.pageLoadHint.slice(1)}
            valueClass={result.overview.pageLoadHint === "lightweight" ? "text-emerald-400" : result.overview.pageLoadHint === "medium" ? "text-amber-400" : "text-red-400"} />
          {result.pageStats && (
            <>
              <Separator orientation="vertical" className="h-8 bg-zinc-800 shrink-0" />
              <Metric label="Words" value={result.pageStats.wordCount.toLocaleString()} />
            </>
          )}
          {result.contentStats && (
            <>
              <Separator orientation="vertical" className="h-8 bg-zinc-800 shrink-0" />
              <Metric label="Reading Level"
                value={result.contentStats.readingLevel.charAt(0).toUpperCase() + result.contentStats.readingLevel.slice(1)}
                valueClass={result.contentStats.readingLevel === "simple" ? "text-emerald-400" : result.contentStats.readingLevel === "moderate" ? "text-amber-400" : "text-red-400"} />
            </>
          )}
        </div>
      </div>

      {/* ── 3-column grid ── */}
      <main className="flex-1 max-w-[1600px] mx-auto w-full px-6 py-6
                       grid grid-cols-1 md:grid-cols-[320px_minmax(0,1fr)_360px] gap-x-6 gap-y-4 items-start">

        {/* ── Col 1: Site Profile ── */}
        <div className="flex flex-col gap-3">
          <ColHeader label="Site Profile" description="What this site is and who it's for" />
          <OverviewCard overview={result.overview} url={result.url} fetchedAt={result.fetchedAt} aiDetection={result.aiDetection} />
          {result.pageStats && <PageStatsCard pageStats={result.pageStats} />}
          {result.contentStats && <ContentCard contentStats={result.contentStats} />}
          <InsightCard
            intent={result.intent}
            biggestOpportunity={result.biggestOpportunity}
            competitorInsight={result.competitorInsight}
          />
          <CustomerViewCard customerView={result.customerView} />
        </div>

        {/* ── Col 2: Performance ── */}
        <div className="flex flex-col gap-3">
          <ColHeader label="Performance" description="How well it scores across key dimensions" />
          {result.performance?.available && <PerformanceCard performance={result.performance} />}
          <div className="grid grid-cols-2 gap-3">
            <TechStackCard techStack={result.techStack} />
            {result.pageStats && <PagePerfCard pageStats={result.pageStats} />}
          </div>
          <ConversionScoreCard scores={result.conversionScores} />
          <SEOAuditCard seoChecks={result.seoChecks} />
          <div className="grid grid-cols-2 gap-3">
            <ConversionCard ux={result.ux} />
            <TrustEngagementCard ux={result.ux} />
          </div>
        </div>

        {/* ── Col 3: Action Plan ── */}
        <div className="flex flex-col gap-3">
          <ColHeader label="Action Plan" description="What's broken and how to fix it" />
          {result.eli5.length > 0 && <ELI5Card items={result.eli5} />}
          <PrioritizedIssuesCard issues={result.prioritizedIssues} />
          <WeakPointsCard weakPoints={result.weakPoints} />
          <RecommendationsCard recommendations={result.recommendations} />
        </div>

      </main>
    </div>
  );
}
