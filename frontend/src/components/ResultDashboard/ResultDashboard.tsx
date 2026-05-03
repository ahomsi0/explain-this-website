import { useState } from "react";
import { useTheme } from "../../context/ThemeContext";
import { Separator } from "@/components/ui/separator";
import { LogoMark } from "../ui/Logo";
import type { AnalysisResult } from "../../types/analysis";
import { CopyButton }   from "../ui/CopyButton";
import { DownloadButton } from "../ui/DownloadButton";
import { ShareButton } from "../ui/ShareButton";
import { Sidebar, MobileSectionNav } from "./Sidebar";
import { SECTIONS, SectionView, type SectionId } from "./sections";
import { ErrorBoundary } from "../ui/ErrorBoundary";
import { useAuth } from "../../context/AuthContext";
import { AuthModal } from "../auth/AuthModal";
import { UserMenu } from "../auth/UserMenu";
import { HistoryModal } from "../auth/HistoryModal";

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

function MetricTile({ label, value, suffix, valueClass = "text-zinc-100" }: {
  label: string; value: string | number; suffix?: string; valueClass?: string;
}) {
  return (
    <div className="flex flex-col gap-1 px-3 py-3 border-r border-zinc-800 last:border-r-0 min-w-[110px]">
      <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold whitespace-nowrap">{label}</span>
      <div className="flex items-baseline gap-0.5">
        <span className={`text-2xl font-bold leading-none ${valueClass}`}>{value}</span>
        {suffix && <span className="text-xs text-zinc-600 font-medium">{suffix}</span>}
      </div>
    </div>
  );
}

function freshnessColor(rating: string) {
  return rating === "fresh" ? "text-emerald-400" : rating === "aging" ? "text-amber-400" : rating === "stale" ? "text-red-400" : "text-zinc-500";
}

function lcpColor(rating: string) {
  return rating === "good" ? "text-emerald-400" : rating === "needs-improvement" ? "text-amber-400" : "text-red-400";
}

export function ResultDashboard({ result, onReset, onAnalyze }: { result: AnalysisResult; onReset: () => void; onAnalyze?: (url: string) => void }) {
  const { seoScore, uxScore } = computeScores(result);
  const [activeSection, setActiveSection] = useState<SectionId>("overview");
  const [searchValue, setSearchValue] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const hostname = (() => { try { return new URL(result.url).hostname; } catch { return result.url; } })();
  const currentMeta = SECTIONS.find((s) => s.id === activeSection)!;

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchValue.trim();
    if (!trimmed || !onAnalyze) return;
    onAnalyze(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    setSearchValue("");
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950">

      {/* ── Top bar ── */}
      <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-sm">
        <div className="px-4 sm:px-6 h-12 flex items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <LogoMark size={22} />
            <h1 className="text-xs font-semibold text-zinc-300 hidden sm:block">Explain This Website</h1>
            <span className="sr-only">Explain This Website — Website Analysis Report</span>
          </div>

          <Separator orientation="vertical" className="h-4 bg-zinc-800 hidden sm:block" />

          <div className="flex-1 min-w-0 flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 shrink-0 max-w-[200px]">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600 shrink-0">
                <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              <span className="text-xs font-medium text-zinc-300 truncate">{hostname}</span>
            </div>
            <span className="sm:hidden text-xs font-medium text-zinc-300 truncate">{hostname}</span>

            {onAnalyze && (
              <form onSubmit={submitSearch} className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 focus-within:border-violet-500/40 transition-colors flex-1 max-w-md">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500 shrink-0">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  placeholder="Analyze another URL…"
                  className="flex-1 bg-transparent text-xs text-zinc-200 placeholder:text-zinc-600 outline-none min-w-0"
                />
                {searchValue && (
                  <kbd className="hidden lg:inline text-[9px] font-mono text-zinc-500 bg-zinc-800 border border-zinc-700 rounded px-1 py-px">↵</kbd>
                )}
              </form>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={toggle}
              aria-label="Toggle theme"
              className="flex items-center justify-center w-7 h-7 rounded-md text-zinc-400 hover:text-zinc-200 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 transition-colors"
            >
              {theme === "dark" ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>
            <CopyButton result={result} />
            <DownloadButton result={result} />
            <ShareButton reportId={result.reportId} />
            {user ? (
              <UserMenu onShowHistory={() => setHistoryOpen(true)} />
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium text-zinc-300 hover:text-zinc-100 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 transition-colors"
              >
                Sign in
              </button>
            )}
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium text-violet-300 hover:text-violet-200 bg-violet-500/10 hover:bg-violet-500/15 border border-violet-500/30 transition-colors"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span className="hidden sm:inline">New Analysis</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile section nav (only < md) ── */}
      <MobileSectionNav items={SECTIONS} active={activeSection} onSelect={setActiveSection} />

      {/* ── Body: sidebar + main ── */}
      <div className="flex-1 flex">
        <Sidebar items={SECTIONS} active={activeSection} onSelect={setActiveSection} onNewAudit={onReset} />

        <main className="flex-1 min-w-0">
          {/* Metrics strip */}
          <div className="border-b border-zinc-800 bg-zinc-900/30">
            <div className="flex items-stretch overflow-x-auto scrollbar-none">
              <MetricTile label="SEO Audit"        value={seoScore}                                        suffix="/100" valueClass={scoreColor(seoScore)} />
              {result.performance?.mobile?.lighthouse && <>
                <MetricTile label="Lighthouse SEO"   value={result.performance.mobile.lighthouse.seo}      suffix="/100" valueClass={scoreColor(result.performance.mobile.lighthouse.seo)} />
                <MetricTile label="Performance"      value={result.performance.mobile.lighthouse.performance} suffix="/100" valueClass={scoreColor(result.performance.mobile.lighthouse.performance)} />
                <MetricTile label="Accessibility"    value={result.performance.mobile.lighthouse.accessibility} suffix="/100" valueClass={scoreColor(result.performance.mobile.lighthouse.accessibility)} />
              </>}
              {result.performance?.mobile?.lcp?.displayValue && (
                <MetricTile label="LCP"              value={result.performance.mobile.lcp.displayValue}    valueClass={lcpColor(result.performance.mobile.lcp.rating)} />
              )}
              <MetricTile label="UX Score"           value={uxScore}                                        suffix="/100" valueClass={scoreColor(uxScore)} />
              <MetricTile label="First Impression"   value={result.firstImpression.score}                  suffix="/10"  valueClass={impressionColor(result.firstImpression.score)} />
              <MetricTile label="Conversion Score"   value={result.conversionScores.overall}               suffix="/100" valueClass={scoreColor(result.conversionScores.overall)} />
              <MetricTile label="Tech Stack"         value={result.techStack.length}                        suffix=" tools" valueClass="text-zinc-100" />
              <MetricTile label="Freshness"          value={result.siteFreshness.copyrightYear || result.siteFreshness.rating} valueClass={freshnessColor(result.siteFreshness.rating)} />
              {result.securityHeaders.length > 0 && (() => {
                const secPass = result.securityHeaders.filter(h => h.status === "pass").length;
                const secTotal = result.securityHeaders.length;
                const secColor = secPass >= Math.ceil(secTotal * 0.8) ? "text-emerald-400" : secPass >= Math.ceil(secTotal * 0.5) ? "text-amber-400" : "text-red-400";
                return <MetricTile label="Security Headers" value={`${secPass}/${secTotal}`} valueClass={secColor} />;
              })()}
              {result.linkCheck.checked > 0 && (() => {
                const linkColor = result.linkCheck.broken === 0 ? "text-emerald-400" : result.linkCheck.broken <= 2 ? "text-amber-400" : "text-red-400";
                return <MetricTile label="Broken Links" value={result.linkCheck.broken} valueClass={linkColor} />;
              })()}
            </div>
          </div>

          {/* Section content */}
          <div className="px-4 sm:px-6 lg:px-8 py-5 sm:py-6 max-w-[1800px]">
            <div className="mb-5">
              <h2 className="text-lg sm:text-xl font-bold text-zinc-100">{currentMeta.title}</h2>
              <p className="text-xs sm:text-sm text-zinc-500 mt-1 max-w-2xl leading-relaxed">{currentMeta.description}</p>
            </div>

            <ErrorBoundary key={activeSection}>
              <SectionView id={activeSection} result={result} />
            </ErrorBoundary>
          </div>
        </main>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      <HistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onOpenAudit={(id) => {
          // App.tsx loads /report/:id from the URL — navigate to that path.
          window.location.href = `/report/${id}`;
        }}
      />
    </div>
  );
}
