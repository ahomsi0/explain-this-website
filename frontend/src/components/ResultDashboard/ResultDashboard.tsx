import { useState } from "react";
import { CachedResultNotice } from "./CachedResultNotice";
import { CaptureNotice, LoginWallNotice } from "./ReportNotices";
import { formatDuration } from "../../lib/browserTimings";
import { useTheme } from "../../context/useTheme";
import { Separator } from "@/components/ui/separator";
import { LogoWordmark } from "../ui/Logo";
import type { AnalysisResult } from "../../types/analysis";
import type { AnalyzeOptions } from "../../services/analyzeApi";
import { scoreColor as sharedScoreColor } from "../../utils/scoreColors";
import { ReportActionsMenu } from "./ReportActionsMenu";
import { Sidebar, MobileSectionNav } from "./Sidebar";
import { SectionView } from "./sections";
import { SECTIONS, type SectionId } from "./sectionConfig";
import { ErrorBoundary } from "../ui/ErrorBoundary";
import { useAuth } from "../../context/useAuth";
import { authHref } from "../../lib/authLinks";
import { UserMenu } from "../auth/UserMenu";
import { type UsageSummary } from "../../services/authApi";
import { normalizeInputUrl } from "../../lib/urls";
import { useNow } from "../../hooks/useNow";

function FaviconOrInitial({ src, hostname }: { src: string; hostname: string }) {
  const [failed, setFailed] = useState(false);
  const initial = hostname.replace(/^www\./, "").charAt(0).toUpperCase();
  if (!src || failed) {
    return (
      <span className="flex items-center justify-center w-5 h-5 rounded text-[11px] font-bold text-white bg-violet-700 shrink-0">
        {initial}
      </span>
    );
  }
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      onError={() => setFailed(true)}
      className="w-5 h-5 rounded object-contain shrink-0"
    />
  );
}

function relativeTime(iso: string, now: number): string {
  const diff = now - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// Its own component so the clock tick re-renders this text, not the dashboard.
function ReportAge({ iso }: { iso: string }) {
  const now = useNow();
  return <span className="text-[11px] text-zinc-600 shrink-0">· {relativeTime(iso, now)}</span>;
}

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
  return n >= 8 ? "text-emerald-400" : n >= 5 ? "text-amber-400" : "text-red-400";
}

// Every tile in the strip is built the same way so they read as one row: a
// small label on top (it may wrap to two lines), and the value pinned to the
// bottom. Tiles stretch to the same height, so every value sits on one line
// however long its label is.
const TILE = "flex min-w-[104px] flex-1 basis-0 flex-col justify-between gap-2 border-r border-zinc-800 px-3 py-3 last:border-r-0";
const TILE_LABEL = "text-xs font-medium leading-tight text-zinc-400 line-clamp-2";

function MetricTile({ label, value, suffix, valueClass = "text-zinc-100" }: {
  label: string; value: string | number; suffix?: string; valueClass?: string;
}) {
  return (
    <div className={TILE}>
      <span className={TILE_LABEL}>{label}</span>
      <span className="flex items-baseline gap-1 whitespace-nowrap">
        <span className={`text-xl font-semibold leading-none tabular-nums tracking-tight ${valueClass}`}>{value}</span>
        {suffix && <span className="text-xs text-zinc-500">{suffix}</span>}
      </span>
    </div>
  );
}

// Tech stack as plain text, not chips: it is one more value in the row.
function TechStackTile({ items }: { items: { name: string }[] }) {
  if (!items.length) return null;
  const top = items.slice(0, 2);
  const extra = items.length - top.length;
  return (
    <div className={`${TILE} min-w-[136px]`}>
      <span className={TILE_LABEL}>Tech stack</span>
      <span className="truncate text-[13px] font-medium leading-none text-zinc-100" title={items.map((t) => t.name).join(", ")}>
        {top.map((t) => t.name).join(", ")}
        {extra > 0 && <span className="font-normal text-zinc-500"> +{extra}</span>}
      </span>
    </div>
  );
}

/** "3.5 s" from PageSpeed becomes a number and a unit, like every other tile. */
function splitMeasure(display: string): { value: string; unit?: string } {
  const m = display.replace(/\u00a0/g, " ").trim().match(/^([\d.,]+)\s*(.*)$/);
  return m ? { value: m[1], unit: m[2] || undefined } : { value: display };
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
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const hostname = (() => { try { return new URL(result.url).hostname; } catch { return result.url; } })();
  const currentMeta = SECTIONS.find((s) => s.id === activeSection)!;
  const usage = usageOverride ?? result.usage ?? user?.usage;
  // A captured page cannot be fetched again by the server, so there is
  // nothing to re-run: the visitor captures it again from their browser.
  const captured = Boolean(result.capture);
  const rerun = onAnalyze && !captured
    ? () => onAnalyze(result.url, "report", { refresh: true })
    : undefined;

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
        <div className="px-3 sm:px-4 lg:px-6 h-16 sm:h-12 flex items-center gap-1 sm:gap-3">
          <a href="/" aria-label="Explain This Website home" className="flex items-center shrink-0">
            {/* Same lockup and size as the site header on every other page.
                The words only fit beside the toolbar from lg up. */}
            <LogoWordmark size={20} textClassName="hidden lg:inline" />
            {/* One h1 at every width, for screen readers and for phones, which have no other h1. */}
            <h1 className="sr-only">Explain This Website: website analysis report</h1>
          </a>

          <Separator orientation="vertical" className="h-4 bg-zinc-800 hidden lg:block" />

          <div className="flex-1 min-w-0 flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-900 border border-zinc-800 shrink-0 max-w-[280px]">
              <FaviconOrInitial src={result.overview.favicon} hostname={hostname} />
              <span className="text-xs font-semibold text-zinc-200 truncate">{hostname}</span>
              <ReportAge iso={result.fetchedAt} />
            </div>
            <span className="hidden sm:inline lg:hidden text-xs font-medium text-zinc-300 truncate">{hostname}</span>
            {usage && (
              <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900 border border-zinc-800 shrink-0">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
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
                  <kbd className="hidden lg:inline text-[11px] font-mono text-zinc-500 bg-zinc-800 border border-zinc-700 rounded px-1 py-px">↵</kbd>
                )}
              </form>
            )}
            {searchError && <span id="report-url-error" role="alert" className="hidden md:block text-[11px] text-red-400">{searchError}</span>}
          </div>

          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button
              onClick={toggle}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              className="flex items-center justify-center w-11 h-11 sm:w-7 sm:h-7 rounded-md text-zinc-400 hover:text-zinc-200 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 transition-colors"
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
            {/* Below md the sidebar (New Audit) and the "Analyze another URL"
                box are both hidden, so phones get their own way out of a report. */}
            <button
              type="button"
              onClick={onReset}
              aria-label="New audit"
              className="md:hidden flex min-h-11 items-center gap-1 px-2.5 rounded-md text-xs font-semibold text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 transition-colors"
            >
              <svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              New
            </button>
            <ReportActionsMenu result={result} onRerun={rerun} />
            {rerun && (
              <button
                onClick={rerun}
                title="Re-fetch and re-analyze this page, bypassing the recent-results cache"
                aria-label="Re-run fresh"
                className="hidden sm:flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-colors"
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
              <a
                href={authHref("login")}
                className="flex min-h-11 sm:min-h-0 items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-md text-xs font-medium text-zinc-300 hover:text-zinc-100 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 transition-colors"
              >
                Sign in
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Spacer — the header is position:fixed so flow content must clear it. */}
      <div className="h-16 sm:h-12 shrink-0" aria-hidden="true" />

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
          scores={{
            seo: seoScore,
            performance: result.performance?.mobile?.lighthouse?.performance
              ?? result.performance?.desktop?.lighthouse?.performance,
            ux: uxScore,
            conversion: result.conversionScores?.overall,
            issueCount: result.seoChecks.filter(c => c.status === "fail").length,
          }}
        />

        <main className="flex-1 min-w-0">
      <CachedResultNotice
        ageSeconds={result.cachedAgeSeconds}
        receivedAt={result.receivedAt}
        onRerun={rerun}
      />
      {result.capture && <CaptureNotice source={result.capture.source} />}
      {result.loginWall && !captured && <LoginWallNotice />}

      {/* Metrics strip: the report's headline numbers. It belongs to the
          Overview; on the other tabs it only pushed their content down.
          There it stays pinned under the fixed header (h-12, so top-12)
          while the page scrolls, so the numbers are always in view. It needs
          a solid background or the cards scrolling behind would show through. */}
      {activeSection === "overview" && (
      <div data-testid="score-strip" className="hidden md:block sticky top-12 z-20 border-b border-zinc-800 bg-zinc-950">
        {/* Tiles keep a minimum width (see MetricTile). When all of them do
            not fit, the strip scrolls sideways rather than breaking labels
            mid-word. */}
        <div className="flex items-stretch overflow-x-auto scrollbar-none">
          <MetricTile label="SEO audit"        value={seoScore}                                           suffix="/ 100" valueClass={scoreColor(seoScore)} />
          {(() => {
            // Prefer mobile; fall back to desktop when PageSpeed only
            // returned one strategy for this run.
            const lh = result.performance?.mobile?.lighthouse ?? result.performance?.desktop?.lighthouse;
            return (
              <>
                {lh?.accessibility !== undefined &&
                  <MetricTile label="Accessibility" value={lh.accessibility} suffix="/ 100" valueClass={scoreColor(lh.accessibility)} />}
                {lh?.bestPractices !== undefined &&
                  <MetricTile label="Best practices" value={lh.bestPractices} suffix="/ 100" valueClass={scoreColor(lh.bestPractices)} />}
              </>
            );
          })()}
          {result.performance?.mobile?.lighthouse?.seo !== undefined &&
            <MetricTile label="Lighthouse SEO" value={result.performance.mobile.lighthouse.seo} suffix="/ 100" valueClass={scoreColor(result.performance.mobile.lighthouse.seo)} />}
          {result.performance?.mobile?.lighthouse?.performance !== undefined &&
            <MetricTile label="Performance" value={result.performance.mobile.lighthouse.performance} suffix="/ 100" valueClass={scoreColor(result.performance.mobile.lighthouse.performance)} />}
          {result.performance?.mobile?.lcp?.displayValue && (() => {
            const lcp = splitMeasure(result.performance.mobile.lcp.displayValue);
            return <MetricTile label="LCP" value={lcp.value} suffix={lcp.unit} valueClass={lcpColor(result.performance.mobile.lcp.rating)} />;
          })()}
          {result.capture?.timings?.loadMs ? (() => {
            const load = splitMeasure(formatDuration(result.capture.timings.loadMs));
            return <MetricTile label="Load time" value={load.value} suffix={load.unit} valueClass="text-zinc-100" />;
          })() : null}
          <MetricTile label="UX score"          value={uxScore}                                           suffix="/ 100" valueClass={scoreColor(uxScore)} />
          <MetricTile label="First impression"  value={result.firstImpression?.score ?? 0}               suffix="/ 10"  valueClass={impressionColor(result.firstImpression?.score ?? 0)} />
          <MetricTile label="Conversion"        value={result.conversionScores?.overall ?? 0}            suffix="/ 100" valueClass={scoreColor(result.conversionScores?.overall ?? 0)} />
          {(() => {
            const highConfidenceTech = result.techStack.filter(t => t.confidence === "high");
            return highConfidenceTech.length > 0 ? (
              <TechStackTile items={highConfidenceTech} />
            ) : null;
          })()}
        </div>
      </div>
      )}

      {/* Section content */}
      <div className="px-4 sm:px-6 lg:px-8 py-5 sm:py-6 max-w-[1800px]">
        <div className="mb-5">
          <h2 className="text-lg sm:text-xl font-bold text-zinc-100">{currentMeta.title}</h2>
          <p className="text-sm text-zinc-400 mt-1 max-w-2xl leading-relaxed">
            {captured && activeSection === "performance"
              ? "Load timings measured in your browser, plus load efficiency and content stats."
              : currentMeta.description}
          </p>
        </div>

        <ErrorBoundary key={activeSection}>
          <SectionView id={activeSection} result={result} />
        </ErrorBoundary>
      </div>
        </main>
      </div>

    </div>
  );
}
