import { useState, useEffect } from "react";
import { useAnalysis } from "./hooks/useAnalysis";
import { LoadingSpinner } from "./components/ui/LoadingSpinner";
import { ErrorBanner } from "./components/ui/ErrorBanner";
import { ResultDashboard } from "./components/ResultDashboard/ResultDashboard";
import { fetchReport } from "./services/analyzeApi";
import type { AnalysisResult } from "./types/analysis";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LandingPage } from "./components/Landing/LandingPage";
import { fetchUsage, type UsageSummary } from "./services/authApi";
import { AdminDashboard } from "./components/admin/AdminDashboard";
import { GoProPage } from "./components/billing/GoProPage";

function useReportRoute() {
  const [sharedResult, setSharedResult] = useState<AnalysisResult | null>(null);
  const [sharedError, setSharedError] = useState<string | null>(null);
  const [loadingShared, setLoadingShared] = useState(false);

  useEffect(() => {
    const match = window.location.pathname.match(/^\/report\/([a-f0-9]{32})$/);
    if (!match) return;
    const id = match[1];
    setLoadingShared(true);
    fetchReport(id)
      .then((r) => { setSharedResult(r); setLoadingShared(false); })
      .catch((e) => { setSharedError(e.message); setLoadingShared(false); });
  }, []);

  return { sharedResult, sharedError, loadingShared };
}

function useDashboardRoute() {
  const pathname = window.location.pathname.toLowerCase();
  return pathname === "/dashboard";
}

function useGoProRoute() {
  const pathname = window.location.pathname.toLowerCase();
  return pathname === "/go-pro";
}

function AppInner() {
  const { user, refreshUser } = useAuth();
  const isDashboardRoute = useDashboardRoute();
  const isGoProRoute = useGoProRoute();
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const { status, result, error, serverSignaled, analyze, reset } = useAnalysis(async (analysisResult) => {
    if (analysisResult.usage) {
      setUsage(analysisResult.usage);
    }
    if (user) {
      await refreshUser();
    }
  });
  const [currentUrl, setCurrentUrl] = useState("");
  const { sharedResult, sharedError, loadingShared } = useReportRoute();
  const [authOpen, setAuthOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("billing") === "success") {
      void refreshUser().finally(() => {
        params.delete("billing");
        const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
        window.history.replaceState({}, "", next);
      });
    }
  }, [refreshUser]);

  useEffect(() => {
    fetchUsage().then(setUsage).catch(() => {});
  }, [user?.id]);

  const handleAnalyze = (url: string) => { setCurrentUrl(url); analyze(url); };
  const isBotProtectionError = !!error && (
    error.toLowerCase().includes("bot protection") ||
    error.toLowerCase().includes("http 403") ||
    error.toLowerCase().includes("http 999") ||
    error.toLowerCase().includes("actively blocks")
  );
  const handleTryAgain = () => {
    if (!currentUrl) { reset(); return; }
    analyze(currentUrl);
  };

  if (isDashboardRoute) {
    return <AdminDashboard />;
  }
  if (isGoProRoute) {
    return <GoProPage />;
  }

  // Shared report route takes over the whole page.
  if (loadingShared) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "hsl(0 0% 4%)" }}>
        <p className="text-zinc-500 text-sm">Loading shared report…</p>
      </div>
    );
  }
  if (sharedResult) {
    return (
      <div className="min-h-screen" style={{ background: "hsl(0 0% 4%)" }}>
        <ResultDashboard result={sharedResult} onReset={() => { window.location.href = "/"; }} />
      </div>
    );
  }
  if (sharedError) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "hsl(0 0% 4%)" }}>
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
    <div className="min-h-screen" style={{ background: "hsl(0 0% 4%)" }}>
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

      {status === "loading" && <LoadingSpinner url={currentUrl} serverSignaled={serverSignaled} />}

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
        <AppInner />
      </AuthProvider>
    </ThemeProvider>
  );
}
