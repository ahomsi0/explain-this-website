import { useState, useEffect, useRef, useCallback, useMemo, type ReactNode, Suspense, lazy } from "react";
import { useAnalysis } from "./hooks/useAnalysis";
import { LoadingSpinner } from "./components/ui/LoadingSpinner";
import { ErrorBanner, type QuotaState } from "./components/ui/ErrorBanner";
import { fetchReport } from "./services/analyzeApi";
import type { AnalysisResult } from "./types/analysis";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/useAuth";
import { LandingPage } from "./components/Landing/LandingPage";
import { fetchUsage, type UsageSummary } from "./services/authApi";
import { ConsentBanner } from "./components/privacy/ConsentBanner";
import { SiteFooter } from "./components/ui/SiteFooter";
import { SiteHeader } from "./components/ui/SiteHeader";
import { NotFoundPage } from "./components/ui/NotFoundPage";
import { ReportSkeleton } from "./components/ui/Skeletons";
import { authHref } from "./lib/authLinks";
import { VerifyEmailNotice } from "./components/auth/VerifyEmailNotice";
import { usePageMeta } from "./seo/usePageMeta";
import { track } from "./lib/analytics";
import { isRepeatUser, recordAnalysisCompleted } from "./lib/conversionTracking";
import { rememberUrl } from "./lib/recentUrls";
import type { AnalyzeOptions } from "./services/analyzeApi";

// Route-level code splitting: the landing page stays in the main chunk; every
// other view loads on demand so the homepage ships less JavaScript.
const ResultDashboard = lazy(() => import("./components/ResultDashboard/ResultDashboard").then((m) => ({ default: m.ResultDashboard })));
const AdminDashboard = lazy(() => import("./components/admin/AdminDashboard").then((m) => ({ default: m.AdminDashboard })));
const GoProPage = lazy(() => import("./components/billing/GoProPage").then((m) => ({ default: m.GoProPage })));
const ComparePage = lazy(() => import("./components/compare/ComparePage").then((m) => ({ default: m.ComparePage })));
const LegalPage = lazy(() => import("./components/privacy/LegalPage").then((m) => ({ default: m.LegalPage })));
const WhatsNewPage = lazy(() => import("./components/WhatsNew/WhatsNewPage").then((m) => ({ default: m.WhatsNewPage })));
const HistoryPage = lazy(() => import("./components/auth/HistoryPage").then((m) => ({ default: m.HistoryPage })));
const GuidesIndexPage = lazy(() => import("./components/guides/GuidesPages").then((m) => ({ default: m.GuidesIndexPage })));
const GuideDetailPage = lazy(() => import("./components/guides/GuidesPages").then((m) => ({ default: m.GuideDetailPage })));
const AuthPage = lazy(() => import("./components/auth/AuthPage").then((m) => ({ default: m.AuthPage })));
const VerifyEmailPage = lazy(() => import("./components/auth/VerifyEmailPage").then((m) => ({ default: m.VerifyEmailPage })));
const StatusPage = lazy(() => import("./components/status/StatusPage").then((m) => ({ default: m.StatusPage })));
const BuiltWithHubPage = lazy(() => import("./components/builtwith/BuiltWithPages").then((m) => ({ default: m.BuiltWithHubPage })));
const BuilderDetailPage = lazy(() => import("./components/builtwith/BuiltWithPages").then((m) => ({ default: m.BuilderDetailPage })));

type AnalysisSource = "landing" | "example" | "report";

// Single app shell: every route renders inside this so pre-analysis pages
// share one header/footer. App-like views (loading, reports) can opt out of
// the footer via `footer={false}`.
function PageShell({ children, header, footer = true }: { children: ReactNode; header?: ReactNode; footer?: boolean }) {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-950">
      {header}
      <div className={`flex-1 flex flex-col ${header ? "pt-14" : ""}`}>
        {/* Pages with the site header only: app-like views (reports, admin)
            have their own fixed chrome and no room for a bar. */}
        {header && <VerifyEmailNotice />}
        <Suspense fallback={<div className="flex-1 min-h-[50vh]" aria-busy="true" />}>{children}</Suspense>
        {footer && <SiteFooter />}
      </div>
    </div>
  );
}

const REPORT_PATH = /^\/report\/([a-f0-9]{32})$/;

/**
 * The current path as state. Page-to-page links are plain <a> navigations;
 * this only exists so a finished analysis can move to its own address
 * (/report/<id>) and Back/Forward between it and the landing page re-render
 * without a reload.
 */
function usePathname() {
  const [pathname, setPathname] = useState(() => window.location.pathname.toLowerCase());

  useEffect(() => {
    const sync = () => setPathname(window.location.pathname.toLowerCase());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const navigate = useCallback((to: string, { replace = false }: { replace?: boolean } = {}) => {
    if (to !== window.location.pathname) {
      if (replace) window.history.replaceState({}, "", to);
      else window.history.pushState({}, "", to);
      window.scrollTo(0, 0);
    }
    setPathname(to.toLowerCase());
  }, []);

  return { pathname, navigate };
}

/**
 * Loads the report for /report/<id> from the API. Skipped when `id` is null:
 * either the route is not a report, or the report is the one this tab just
 * ran and already holds in memory.
 */
function useFetchedReport(id: string | null) {
  const [state, setState] = useState<{ id: string; result?: AnalysisResult; error?: string } | null>(null);

  useEffect(() => {
    if (!id) return;
    let stale = false;
    fetchReport(id)
      .then((result) => { if (!stale) setState({ id, result }); })
      .catch((e) => { if (!stale) setState({ id, error: e instanceof Error ? e.message : "Could not load report" }); });
    return () => { stale = true; };
  }, [id]);

  // Only trust state that belongs to the id on screen now.
  const current = id && state?.id === id ? state : null;
  return {
    sharedResult: current?.result ?? null,
    sharedError: current?.error ?? null,
    loadingShared: Boolean(id && !current),
  };
}

function AppInner() {
  const { user, refreshUser } = useAuth();
  const { pathname, navigate } = usePathname();
  const isDashboardRoute = pathname === "/dashboard";
  const routeReportId = pathname.match(REPORT_PATH)?.[1] ?? null;
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const analysisSource = useRef<AnalysisSource>("landing");
  // True when the running analysis was started from a report (another URL or
  // a re-run): its result then replaces the transient "/" entry, so Back from
  // the new report returns to the previous report, not to a loading screen.
  const startedFromReport = useRef(false);
  const onSuccess = useCallback(async (analysisResult: AnalysisResult) => {
    // Every finished report moves to its own address. "/" stays the landing
    // page, so the logo and Back always lead somewhere new.
    if (analysisResult.reportId) {
      navigate(`/report/${analysisResult.reportId}`, {
        replace: startedFromReport.current && window.location.pathname === "/",
      });
    }
    if (analysisResult.usage) {
      setUsage(analysisResult.usage);
    }
    if (user) {
      await refreshUser();
    }
    recordAnalysisCompleted({
      signedIn: Boolean(user),
      source: analysisSource.current,
      performanceAvailable: Boolean(analysisResult.performance?.available),
    });
    rememberUrl(analysisResult.url);
  }, [user, refreshUser, navigate]);
  const { status, result, currentUrl, error, serverSignaled, analyze, cancel, reset } = useAnalysis(onSuccess);

  // The report this tab ran itself is already in memory (and in
  // sessionStorage across reloads); anything else is fetched by id.
  const finished = status === "success" ? result : null;
  const ownReport = routeReportId && finished?.reportId === routeReportId ? finished : null;
  const { sharedResult, sharedError, loadingShared } = useFetchedReport(routeReportId && !ownReport ? routeReportId : null);
  // Reports without an id (mock mode, or an API that predates report links)
  // have no address of their own, so they still render in place at "/".
  const inPlaceReport = pathname === "/" && finished && !finished.reportId ? finished : null;
  const shownReport = ownReport ?? sharedResult ?? inPlaceReport;

  useEffect(() => {
    fetchUsage().then(setUsage).catch(() => {});
  }, [user?.id]);

  const handleAnalyze = (
    url: string,
    source: AnalysisSource = shownReport ? "report" : "landing",
    opts?: AnalyzeOptions,
  ) => {
    analysisSource.current = source;
    track("analysis_started", { source, repeat_user: isRepeatUser(), signed_in: Boolean(user) });
    // Loading and errors always show at "/": a report's address should only
    // ever show that report.
    startedFromReport.current = pathname !== "/";
    if (pathname !== "/") navigate("/");
    void analyze(url, opts);
  };

  // "New audit": back to the landing page. A report with its own address is
  // kept in memory so Back returns to it instantly; an in-place one has to be
  // cleared or "/" would keep showing it.
  const startNewAudit = () => {
    if (inPlaceReport) reset();
    navigate("/");
  };

  // Deep-link support: /?url=… starts that analysis immediately (used by the
  // history page's re-run button). The param is stripped so a refresh during
  // loading doesn't restart the run.
  useEffect(() => {
    if (window.location.pathname !== "/") return;
    const target = new URLSearchParams(window.location.search).get("url");
    if (!target) return;
    window.history.replaceState({}, "", window.location.pathname);
    handleAnalyze(target, "landing");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);
  const isBotProtectionError = useMemo(() => !!error && (
    error.toLowerCase().includes("bot protection") ||
    error.toLowerCase().includes("http 403") ||
    error.toLowerCase().includes("http 999") ||
    error.toLowerCase().includes("actively blocks")
  ), [error]);
  const handleTryAgain = () => {
    if (!currentUrl) { reset(); return; }
    handleAnalyze(currentUrl, analysisSource.current);
  };

  // The daily limit is not a failed analysis: retrying or another URL cannot
  // help, so the error screen offers sign-in (a signed-in account has its own
  // allowance) or the Pro plans instead.
  const quota: QuotaState | undefined = useMemo(() => {
    if (!error || !error.toLowerCase().includes("analyses for today")) return undefined;
    if (!user) return "signed-out";
    return user.plan === "pro" || user.plan === "owner" ? "pro" : "free";
  }, [error, user]);

  // Signing in from the limit screen returns through the /?url= deep link,
  // which picks the blocked analysis back up without retyping the URL.
  const signInFromLimit = () => {
    window.location.href = authHref("login", currentUrl ? `/?url=${encodeURIComponent(currentUrl)}` : "/");
  };

  useEffect(() => {
    if (status === "error" && error) {
      track("analysis_failed", {
        source: analysisSource.current,
        reason: error.toLowerCase().includes("limit") ? "quota" : "request",
      });
    }
  }, [status, error]);

  const auditTitle = useMemo(() => {
    if (!shownReport) return null;
    try { return `${new URL(shownReport.url).hostname} audit · Explain This Website`; }
    catch { return "Website audit · Explain This Website"; }
  }, [shownReport]);
  usePageMeta(pathname, auditTitle);

  // Lock background scrolling while an analysis is running — the loading
  // screen is a single fixed view.
  useEffect(() => {
    if (status !== "loading") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [status]);

  // Shared header for every pre-analysis page. History is a full page at
  // /history; the results dashboard, shared reports, and admin keep their
  // own chrome. Sign-in and sign-up are pages too (/login, /signup).
  const chrome = <SiteHeader onShowHistory={() => { window.location.href = "/history"; }} />;

  // Restore a browser session in the background. Public routes must remain
  // usable while /api/auth/me waits for a cold-starting or unavailable API;
  // the header updates once the session check completes.

  if (pathname === "/verify-email") return <Suspense fallback={null}><VerifyEmailPage /></Suspense>;
  if (pathname === "/login") return <PageShell header={chrome}><AuthPage mode="login" /></PageShell>;
  if (pathname === "/signup") return <PageShell header={chrome}><AuthPage mode="signup" /></PageShell>;

  if (isDashboardRoute) {
    if (!user) return <PageShell header={chrome}><div className="flex-1 flex items-center justify-center text-zinc-500">Access denied.</div></PageShell>;
    return <PageShell><AdminDashboard /></PageShell>;
  }

  if (pathname === "/privacy") return <PageShell header={chrome}><LegalPage kind="privacy" /></PageShell>;
  if (pathname === "/terms") return <PageShell header={chrome}><LegalPage kind="terms" /></PageShell>;
  if (pathname === "/go-pro") return <PageShell header={chrome}><GoProPage /></PageShell>;
  if (pathname === "/whats-new") return <PageShell header={chrome}><WhatsNewPage /></PageShell>;
  if (pathname === "/history") return <PageShell header={chrome}><HistoryPage /></PageShell>;
  if (pathname === "/status") return <PageShell header={chrome}><StatusPage /></PageShell>;
  if (pathname === "/compare") return <PageShell header={chrome}><ComparePage /></PageShell>;
  if (pathname === "/guides") return <PageShell header={chrome}><GuidesIndexPage /></PageShell>;
  {
    const guideSlug = pathname.match(/^\/guides\/([a-z0-9-]+)$/)?.[1];
    if (guideSlug) return <PageShell header={chrome}><GuideDetailPage slug={guideSlug} /></PageShell>;
  }
  if (pathname === "/built-with") return <PageShell header={chrome}><BuiltWithHubPage /></PageShell>;
  {
    const builderSlug = pathname.match(/^\/built-with\/([a-z0-9-]+)$/)?.[1];
    if (builderSlug) return <PageShell header={chrome}><BuilderDetailPage slug={builderSlug} /></PageShell>;
  }

  // Anything else that isn't the landing page or a report is a 404.
  // Vercel already serves dist/404.html for these; this covers client routing.
  if (pathname !== "/" && !routeReportId) {
    return <PageShell header={chrome}><NotFoundPage /></PageShell>;
  }

  // A report takes over the whole page. The results dashboard is an app-like
  // view with its own chrome: its sidebar already carries the secondary
  // links, so the global header and footer would be redundant. The same view
  // serves the tab that ran the audit and anyone who opens its link, so a
  // visitor arriving from a shared link can analyze their own site from it.
  if (shownReport) {
    return (
      <PageShell footer={false}>
        <ResultDashboard result={shownReport} usage={usage} onReset={startNewAudit} onAnalyze={handleAnalyze} />
      </PageShell>
    );
  }
  if (routeReportId) {
    if (loadingShared) {
      return (
        <PageShell header={chrome} footer={false}>
          <ReportSkeleton />
        </PageShell>
      );
    }
    return (
      <PageShell header={chrome}>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-zinc-300 text-sm font-medium mb-2">Report not found</p>
            <p className="text-zinc-600 text-xs mb-6">{sharedError ?? "This report link has expired or was removed."}</p>
            <button onClick={startNewAudit}
              className="text-xs text-violet-400 hover:text-violet-300 underline underline-offset-2">
              Analyze a new site
            </button>
          </div>
        </div>
      </PageShell>
    );
  }

  // "/" is the landing page, plus the transient loading and error views of
  // the analysis started from it. Loading is a fixed view: no footer and no
  // page scroll.
  return (
    <PageShell header={chrome} footer={status !== "loading"}>
      {status === "loading" && <LoadingSpinner url={currentUrl} serverSignaled={serverSignaled} onCancel={cancel} />}

      {status === "error" && (
        <ErrorBanner
          message={error!}
          isBotProtectionError={isBotProtectionError}
          onTryAgain={currentUrl ? handleTryAgain : undefined}
          onTryAnotherUrl={reset}
          quota={quota}
          onSignIn={signInFromLimit}
        />
      )}

      {status !== "loading" && status !== "error" && (
        <LandingPage
          user={user}
          usage={usage}
          onAnalyze={handleAnalyze}
        />
      )}
    </PageShell>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <>
          <AppInner />
          <ConsentBanner />
        </>
      </AuthProvider>
    </ThemeProvider>
  );
}
