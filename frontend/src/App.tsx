import { useState, useEffect, useRef, type ReactNode } from "react";
import { useAnalysis } from "./hooks/useAnalysis";
import { LoadingSpinner } from "./components/ui/LoadingSpinner";
import { ErrorBanner } from "./components/ui/ErrorBanner";
import { ResultDashboard } from "./components/ResultDashboard/ResultDashboard";
import { fetchReport } from "./services/analyzeApi";
import type { AnalysisResult } from "./types/analysis";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/useAuth";
import { LandingPage } from "./components/Landing/LandingPage";
import { fetchUsage, type UsageSummary } from "./services/authApi";
import { AdminDashboard } from "./components/admin/AdminDashboard";
import { GoProPage } from "./components/billing/GoProPage";
import { ComparePage } from "./components/compare/ComparePage";
import { ConsentBanner } from "./components/privacy/ConsentBanner";
import { LegalPage } from "./components/privacy/LegalPage";
import { WhatsNewPage } from "./components/WhatsNew/WhatsNewPage";
import { SiteFooter } from "./components/ui/SiteFooter";
import { SiteHeader } from "./components/ui/SiteHeader";
import { AuthModal } from "./components/auth/AuthModal";
import { HistoryModal } from "./components/auth/HistoryModal";
import { track } from "./lib/analytics";
import { isRepeatUser, recordAnalysisCompleted } from "./lib/conversionTracking";
import type { AnalyzeOptions } from "./services/analyzeApi";

type AnalysisSource = "landing" | "example" | "report";

// Single app shell: every route renders inside this so pre-analysis pages
// share one header/footer. App-like views (loading, reports) can opt out of
// the footer via `footer={false}`.
function PageShell({ children, header, footer = true }: { children: ReactNode; header?: ReactNode; footer?: boolean }) {
  return (
    <div className="min-h-screen flex flex-col bg-zinc-950">
      {header}
      <div className="flex-1 flex flex-col">{children}</div>
      {footer && <SiteFooter />}
    </div>
  );
}

function useReportRoute() {
  const [sharedResult, setSharedResult] = useState<AnalysisResult | null>(null);
  const [sharedError, setSharedError] = useState<string | null>(null);
  const reportId = window.location.pathname.match(/^\/report\/([a-f0-9]{32})$/)?.[1] ?? null;

  useEffect(() => {
    if (!reportId) return;
    fetchReport(reportId)
      .then(setSharedResult)
      .catch((e) => setSharedError(e instanceof Error ? e.message : "Could not load report"));
  }, [reportId]);

  return { sharedResult, sharedError, loadingShared: Boolean(reportId && !sharedResult && !sharedError) };
}

function useDashboardRoute() {
  const pathname = window.location.pathname.toLowerCase();
  return pathname === "/dashboard";
}

function AppInner() {
  const { user, refreshUser } = useAuth();
  const isDashboardRoute = useDashboardRoute();
  const pathname = window.location.pathname.toLowerCase();
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const analysisSource = useRef<AnalysisSource>("landing");
  const { status, result, error, serverSignaled, analyze, cancel, reset } = useAnalysis(async (analysisResult) => {
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
  });
  const [currentUrl, setCurrentUrl] = useState("");
  const { sharedResult, sharedError, loadingShared } = useReportRoute();
  const [authOpen, setAuthOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    fetchUsage().then(setUsage).catch(() => {});
  }, [user?.id]);

  const handleAnalyze = (
    url: string,
    source: AnalysisSource = status === "success" ? "report" : "landing",
    opts?: AnalyzeOptions,
  ) => {
    analysisSource.current = source;
    track("analysis_started", { source, repeat_user: isRepeatUser(), signed_in: Boolean(user) });
    setCurrentUrl(url);
    void analyze(url, opts);
  };
  const isBotProtectionError = !!error && (
    error.toLowerCase().includes("bot protection") ||
    error.toLowerCase().includes("http 403") ||
    error.toLowerCase().includes("http 999") ||
    error.toLowerCase().includes("actively blocks")
  );
  const handleTryAgain = () => {
    if (!currentUrl) { reset(); return; }
    handleAnalyze(currentUrl, analysisSource.current);
  };

  useEffect(() => {
    if (status === "error" && error) {
      track("analysis_failed", {
        source: analysisSource.current,
        reason: error.toLowerCase().includes("limit") ? "quota" : "request",
      });
    }
  }, [status, error]);

  useEffect(() => {
    if (status === "success" && result) {
      try { document.title = `${new URL(result.url).hostname} audit · Explain This Website`; }
      catch { document.title = "Website audit · Explain This Website"; }
    } else if (pathname === "/privacy") {
      document.title = "Privacy Policy · Explain This Website";
    } else if (pathname === "/terms") {
      document.title = "Terms of Service · Explain This Website";
    } else if (pathname === "/go-pro") {
      document.title = "Go Pro · Explain This Website";
    } else if (pathname === "/whats-new") {
      document.title = "What’s New · Explain This Website";
    } else if (pathname === "/compare") {
      document.title = "Compare Sites · Explain This Website";
    } else {
      document.title = "Explain This Website — Instant Website Analyzer";
    }
  }, [pathname, status, result]);

  // Lock background scrolling while an analysis is running — the loading
  // screen is a single fixed view.
  useEffect(() => {
    if (status !== "loading") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [status]);

  // Shared header + global auth/history modals for every pre-analysis page.
  // The results dashboard, shared reports, and admin keep their own chrome.
  const chrome = (
    <>
      <SiteHeader onSignIn={() => setAuthOpen(true)} onShowHistory={() => setHistoryOpen(true)} />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      {historyOpen && (
        <HistoryModal
          open
          onClose={() => setHistoryOpen(false)}
          onOpenAudit={(id) => { window.location.href = `/report/${id}`; }}
        />
      )}
    </>
  );

  if (isDashboardRoute) {
    return <PageShell><AdminDashboard /></PageShell>;
  }

  if (pathname === "/privacy") return <PageShell header={chrome}><LegalPage kind="privacy" /></PageShell>;
  if (pathname === "/terms") return <PageShell header={chrome}><LegalPage kind="terms" /></PageShell>;
  if (pathname === "/go-pro") return <PageShell header={chrome}><GoProPage /></PageShell>;
  if (pathname === "/whats-new") return <PageShell header={chrome}><WhatsNewPage /></PageShell>;
  if (pathname === "/compare") return <PageShell header={chrome}><ComparePage /></PageShell>;

  // Shared report route takes over the whole page.
  if (loadingShared) {
    return (
      <PageShell>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-zinc-500 text-sm">Loading shared report…</p>
        </div>
      </PageShell>
    );
  }
  if (sharedResult) {
    return (
      <PageShell footer={false}>
        <ResultDashboard result={sharedResult} onReset={() => { window.location.href = "/"; }} />
      </PageShell>
    );
  }
  if (sharedError) {
    return (
      <PageShell>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-zinc-300 text-sm font-medium mb-2">Report not found</p>
            <p className="text-zinc-600 text-xs mb-6">{sharedError}</p>
            <button onClick={() => { window.location.href = "/"; }}
              className="text-xs text-violet-400 hover:text-violet-300 underline underline-offset-2">
              Analyze a new site
            </button>
          </div>
        </div>
      </PageShell>
    );
  }

  // The results dashboard is an app-like view: its sidebar already carries
  // the secondary links, so the global footer would be redundant. Loading is
  // a fixed view — no footer and no page scroll.
  return (
    <PageShell header={status === "success" ? undefined : chrome} footer={status !== "loading" && status !== "success"}>
      {status === "idle" && (
        <LandingPage
          user={user}
          usage={usage}
          onAnalyze={handleAnalyze}
          setAuthOpen={setAuthOpen}
          setHistoryOpen={setHistoryOpen}
        />
      )}

      {status === "loading" && <LoadingSpinner url={currentUrl} serverSignaled={serverSignaled} onCancel={cancel} />}

      {status === "error" && (
        <ErrorBanner
          message={error!}
          isBotProtectionError={isBotProtectionError}
          onTryAgain={isBotProtectionError && currentUrl ? handleTryAgain : undefined}
          onTryAnotherUrl={reset}
        />
      )}

      {status === "success" && result && (
        <ResultDashboard result={result} usage={usage} onReset={reset} onAnalyze={handleAnalyze} />
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
