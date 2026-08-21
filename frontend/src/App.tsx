import { useState, useEffect, useRef } from "react";
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
import { ConsentBanner } from "./components/privacy/ConsentBanner";
import { LegalPage } from "./components/privacy/LegalPage";
import { track } from "./lib/analytics";
import { isRepeatUser, recordAnalysisCompleted } from "./lib/conversionTracking";

type AnalysisSource = "landing" | "example" | "report";

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

  const handleAnalyze = (url: string, source: AnalysisSource = status === "success" ? "report" : "landing") => {
    analysisSource.current = source;
    track("analysis_started", { source, repeat_user: isRepeatUser(), signed_in: Boolean(user) });
    setCurrentUrl(url);
    void analyze(url);
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
    } else {
      document.title = "Explain This Website — Instant Website Analyzer";
    }
  }, [pathname, status, result]);

  if (isDashboardRoute) {
    return <AdminDashboard />;
  }

  if (pathname === "/privacy") return <LegalPage kind="privacy" />;
  if (pathname === "/terms") return <LegalPage kind="terms" />;
  if (pathname === "/go-pro") return <GoProPage />;

  // Shared report route takes over the whole page.
  if (loadingShared) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <p className="text-zinc-500 text-sm">Loading shared report…</p>
      </div>
    );
  }
  if (sharedResult) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <ResultDashboard result={sharedResult} onReset={() => { window.location.href = "/"; }} />
      </div>
    );
  }
  if (sharedError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center">
          <p className="text-zinc-300 text-sm font-medium mb-2">Report not found</p>
          <p className="text-zinc-600 text-xs mb-6">{sharedError}</p>
          <button onClick={() => { window.location.href = "/"; }}
            className="text-xs text-violet-400 hover:text-violet-300 underline underline-offset-2">
            Analyze a new site
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" >
      {status === "idle" && (
        <LandingPage
          user={user}
          usage={usage}
          onAnalyze={handleAnalyze}
          authOpen={authOpen}
          setAuthOpen={setAuthOpen}
          historyOpen={historyOpen}
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
    </div>
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
