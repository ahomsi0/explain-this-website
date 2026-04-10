import { Separator } from "@/components/ui/separator";
import { LogoMark } from "../ui/Logo";
import type { AnalysisResult } from "../../types/analysis";
import { OverviewCard }        from "../cards/OverviewCard";
import { TechStackCard }       from "../cards/TechStackCard";
import { SeoAuditCard }        from "../cards/SeoAuditCard";
import { ConversionCard }      from "../cards/ConversionCard";
import { WeakPointsCard }      from "../cards/WeakPointsCard";
import { RecommendationsCard } from "../cards/RecommendationsCard";
import { PageStatsCard }       from "../cards/PageStatsCard";
import { ContentCard }         from "../cards/ContentCard";
import { CopyButton }          from "../ui/CopyButton";
import { DownloadButton }      from "../ui/DownloadButton";

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

export function ResultDashboard({ result, onReset }: { result: AnalysisResult; onReset: () => void }) {
  const { seoScore, uxScore } = computeScores(result);
  const issueCount = result.weakPoints.length;
  const hostname = (() => { try { return new URL(result.url).hostname; } catch { return result.url; } })();

  return (
    <div className="min-h-screen flex flex-col">

      {/* ── Top bar ── */}
      <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 h-12 flex items-center gap-4">
          <div className="flex items-center gap-2 shrink-0">
            <LogoMark size={22} />
            <span className="text-xs font-semibold text-zinc-400 hidden sm:block">Explain This Website</span>
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/>
              </svg>
              <span className="hidden sm:inline">New</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Metrics strip ── */}
      <div className="border-b border-zinc-800 bg-zinc-900/40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center gap-5 sm:gap-8 overflow-x-auto scrollbar-none">
          <Metric label="SEO Score"    value={`${seoScore}/100`} valueClass={scoreColor(seoScore)} />
          <Separator orientation="vertical" className="h-8 bg-zinc-800 shrink-0" />
          <Metric label="UX Score"     value={`${uxScore}/100`}  valueClass={scoreColor(uxScore)} />
          <Separator orientation="vertical" className="h-8 bg-zinc-800 shrink-0" />
          <Metric label="Tech Detected" value={result.techStack.length} />
          <Separator orientation="vertical" className="h-8 bg-zinc-800 shrink-0" />
          <Metric label="Issues"        value={issueCount}
            valueClass={issueCount === 0 ? "text-emerald-400" : issueCount <= 3 ? "text-amber-400" : "text-red-400"} />
          <Separator orientation="vertical" className="h-8 bg-zinc-800 shrink-0" />
          <Metric label="Page Weight"   value={result.overview.pageLoadHint.charAt(0).toUpperCase() + result.overview.pageLoadHint.slice(1)}
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

      {/* ── Main content ── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-start">

        {/* Left col: SEO Audit + Weak Points */}
        <div className="flex flex-col gap-4">
          <SeoAuditCard seoChecks={result.seoChecks} />
          <WeakPointsCard weakPoints={result.weakPoints} />
        </div>

        {/* Middle col: Overview + Tech + Conversion */}
        <div className="flex flex-col gap-4">
          <OverviewCard overview={result.overview} url={result.url} fetchedAt={result.fetchedAt} />
          <TechStackCard techStack={result.techStack} />
          <ConversionCard ux={result.ux} />
        </div>

        {/* Right col: Page Stats + Content + Recommendations */}
        <div className="flex flex-col gap-4">
          {result.pageStats && <PageStatsCard pageStats={result.pageStats} />}
          {result.contentStats && <ContentCard contentStats={result.contentStats} />}
          <RecommendationsCard recommendations={result.recommendations} />
        </div>

      </main>
    </div>
  );
}
