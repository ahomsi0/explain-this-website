import { useState } from "react";
import { useTheme } from "../../context/useTheme";
import { Separator } from "@/components/ui/separator";
import { LogoMark } from "../ui/Logo";
import type { AnalysisResult } from "../../types/analysis";
import type { AnalyzeOptions } from "../../services/analyzeApi";
import { scoreColor as sharedScoreColor } from "../../utils/scoreColors";
import { CopyButton }   from "../ui/CopyButton";
import { DownloadButton } from "../ui/DownloadButton";
import { ShareButton } from "../ui/ShareButton";
import { BadgeButton } from "../ui/BadgeButton";
import { Sidebar, MobileSectionNav } from "./Sidebar";
import { SectionView } from "./sections";
import { SECTIONS, type SectionId } from "./sectionConfig";
import { ErrorBoundary } from "../ui/ErrorBoundary";
import { useAuth } from "../../context/useAuth";
import { AuthModal } from "../auth/AuthModal";
import { UserMenu } from "../auth/UserMenu";
import { type UsageSummary } from "../../services/authApi";
import { normalizeInputUrl } from "../../lib/urls";

function computeScores(result: AnalysisResult) {
  const requiredChecks = result.seoChecks.filter((c) => !c.optional);
  const pass     = requiredChecks.filter((c) => c.status === "pass").length;
  const seoScore = requiredChecks.length ? Math.round((pass / requiredChecks.length) * 100) : 0;
  const uxSigs   = [result.ux.hasCTA, result.ux.hasForms, result.ux.hasSocialProof,
                    result.ux.hasTrustSignals, result.ux.hasContactInfo, result.ux.mobileReady];
  const uxScore  = Math.round((uxSigs.filter(Boolean).length / uxSigs.length) * 100);
  return { seoScore, uxScore };
}

// Delegates to the shared threshold (green ≥ 75) so the dashboard, admin
// cards, and PDF export all colour the same score identically.
const scoreColor = sharedScoreColor;

function impressionColor(n: number) {
  return n >= 8 ? "text-emerald-400" : n >= 6 ? "text-amber-400" : n >= 4 ? "text-orange-400" : "text-red-400";
}

function MetricTile({ label, value, suffix, valueClass = "text-zinc-100" }: {
  label: string; value: string | number; suffix?: string; valueClass?: string;
}) {
  return (
    <div className="flex flex-col gap-1 px-3 py-3 border-r border-zinc-800 last:border-r-0 min-w-[110px] shrink-0">
      <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold whitespace-nowrap">{label}</span>
      <div className="flex items-baseline gap-0.5">
        <span className={`text-2xl font-bold leading-none ${valueClass}`}>{value}</span>
        {suffix && <span className="text-xs text-zinc-600 font-medium">{suffix}</span>}
      </div>
    </div>
  );
}

function lcpColor(rating: string) {
  return rating === "good" ? "text-emerald-400" : rating === "needs-improvement" ? "text-amber-400" : "text-red-400";
}

export function ResultDashboard({
  result,
  usage: usageOverride,
  onReset,
  onAnalyze,
}: {
  result: AnalysisResult;
  usage?: UsageSummary | null;
  onReset: () => void;
  onAnalyze?: (url: string, source?: "landing" | "example" | "report", opts?: AnalyzeOptions) => void;
}) {
  const { seoScore, uxScore } = computeScores(result);
  const [activeSection, setActiveSection] = useState<SectionId>("overview");
  const [searchValue, setSearchValue] = useState("");
  const [searchError, setSearchError] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const hostname = (() => { try { return new URL(result.url).hostname; } catch { return result.url; } })();
  const currentMeta = SECTIONS.find((s) => s.id === activeSection)!;
  const usage = usageOverride ?? result.usage ?? user?.usage;
  const isPro = ["pro", "owner"].includes(user?.plan ?? usage?.plan ?? "");

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAnalyze) return;
    const normalized = normalizeInputUrl(searchValue);
    if (!normalized) {
      setSearchError("Enter a valid public URL");
      return;
    }
    setSearchError("");
    onAnalyze(normalized, "report");
    setSearchValue("");
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950">

      {/* ── Top bar ── */}
      <header className="fixed inset-x-0 top-0 z-30 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-sm">
        <div className="px-4 sm:px-6 h-12 flex items-center gap-3">
          <a href="/" aria-label="Explain This Website home" className="flex items-center gap-2 shrink-0">
            <LogoMark size={22} />
            <h1 className="text-xs font-semibold text-zinc-300 hidden sm:block">Explain This Website</h1>
            <span className="sr-only">Explain This Website — Website Analysis Report</span>
          </a>

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
            {usage && (
              <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 shrink-0">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                  usage.plan === "pro" || usage.plan === "owner"
                    ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/25"
                    : "text-zinc-300 bg-zinc-800 border-zinc-700"
                }`}>
                  {usage.plan === "owner" ? "Owner" : usage.plan === "pro" ? "Pro" : "Free"}
                </span>
                <span className="text-[11px] text-zinc-400">
                  {usage.plan === "owner" ? "∞" : `${usage.dailyRemaining}/${usage.dailyLimit}`} left today
                </span>
              </div>
            )}

            {onAnalyze && (
              <form onSubmit={submitSearch} aria-label="Analyze another website" className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 focus-within:border-violet-500/40 transition-colors flex-1 max-w-md">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-500 shrink-0">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <label htmlFor="report-url-input" className="sr-only">Website URL to analyze</label>
                <input
                  id="report-url-input"
                  type="text"
                  value={searchValue}
                  onChange={(e) => { setSearchValue(e.target.value); setSearchError(""); }}
                  placeholder="Analyze another URL…"
                  aria-invalid={Boolean(searchError)}
                  aria-describedby={searchError ? "report-url-error" : undefined}
                  className="flex-1 bg-transparent text-xs text-zinc-200 placeholder:text-zinc-600 outline-none min-w-0"
                />
                {searchValue && (
                  <kbd className="hidden lg:inline text-[9px] font-mono text-zinc-500 bg-zinc-800 border border-zinc-700 rounded px-1 py-px">↵</kbd>
                )}
              </form>
            )}
            {searchError && <span id="report-url-error" role="alert" className="hidden lg:block text-[10px] text-red-400">{searchError}</span>}
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
            <BadgeButton url={result.url} reportId={result.reportId} />
            <ShareButton reportId={result.reportId} canShare={isPro} />
            {onAnalyze && (
              <button
                onClick={() => onAnalyze(result.url, "report", { refresh: true })}
                title="Re-fetch and re-analyze this page, bypassing the recent-results cache"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
                </svg>
                <span className="hidden lg:inline">Re-run fresh</span>
              </button>
            )}
            {user ? (
              <UserMenu />
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium text-zinc-300 hover:text-zinc-100 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 transition-colors"
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Spacer — the header is position:fixed so flow content must clear it. */}
      <div className="h-12 shrink-0" aria-hidden="true" />

      {/* ── Mobile section nav (only < md) ── */}
      <MobileSectionNav items={SECTIONS} active={activeSection} onSelect={setActiveSection} />
      {/* Spacer — the mobile nav is position:fixed (42px bar + 1px border). */}
      <div className="md:hidden h-[43px] shrink-0" aria-hidden="true" />

      {/* ── Body: sidebar + main (sidebar is fixed, so clear it on md+) ── */}
      <div className="flex-1 flex md:pl-[220px]">
        <Sidebar
          items={SECTIONS}
          active={activeSection}
          onSelect={setActiveSection}
          onNewAudit={onReset}
          isSignedIn={!!user}
          onShowHistory={() => { window.location.href = "/history"; }}
        />

        <main className="flex-1 min-w-0">
          {/* Metrics strip */}
          <div className="border-b border-zinc-800 bg-zinc-900/30 overflow-x-auto scrollbar-none">
            <div className="flex items-stretch justify-start md:justify-center min-w-max md:min-w-0">
              <MetricTile label="SEO Audit"        value={seoScore}                                           suffix="/100" valueClass={scoreColor(seoScore)} />
              {(() => {
                // Prefer mobile; fall back to desktop when PageSpeed only
                // returned one strategy for this run.
                const lh = result.performance?.mobile?.lighthouse ?? result.performance?.desktop?.lighthouse;
                return (
                  <>
                    {lh?.accessibility !== undefined &&
                      <MetricTile label="Accessibility" value={lh.accessibility} suffix="/100" valueClass={scoreColor(lh.accessibility)} />}
                    {lh?.bestPractices !== undefined &&
                      <MetricTile label="Best Practices" value={lh.bestPractices} suffix="/100" valueClass={scoreColor(lh.bestPractices)} />}
                  </>
                );
              })()}
              {result.performance?.mobile?.lighthouse?.seo !== undefined &&
                <MetricTile label="Lighthouse SEO" value={result.performance.mobile.lighthouse.seo} suffix="/100" valueClass={scoreColor(result.performance.mobile.lighthouse.seo)} />}
              {result.performance?.mobile?.lighthouse?.performance !== undefined &&
                <MetricTile label="Performance" value={result.performance.mobile.lighthouse.performance} suffix="/100" valueClass={scoreColor(result.performance.mobile.lighthouse.performance)} />}
              {result.performance?.mobile?.lcp?.displayValue && (
                <MetricTile label="LCP"             value={result.performance.mobile.lcp.displayValue}       valueClass={lcpColor(result.performance.mobile.lcp.rating)} />
              )}
              <MetricTile label="UX Score"          value={uxScore}                                           suffix="/100" valueClass={scoreColor(uxScore)} />
              <MetricTile label="First Impression"  value={result.firstImpression?.score ?? 0}               suffix="/10"  valueClass={impressionColor(result.firstImpression?.score ?? 0)} />
              <MetricTile label="Conversion Score"  value={result.conversionScores?.overall ?? 0}            suffix="/100" valueClass={scoreColor(result.conversionScores?.overall ?? 0)} />
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
    </div>
  );
}
