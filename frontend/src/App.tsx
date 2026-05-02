import { useState, useEffect } from "react";
import { useAnalysis } from "./hooks/useAnalysis";
import { URLInput } from "./components/UrlInput/UrlInput";
import { LoadingSpinner } from "./components/ui/LoadingSpinner";
import { ErrorBanner } from "./components/ui/ErrorBanner";
import { ResultDashboard } from "./components/ResultDashboard/ResultDashboard";
import { LogoWordmark } from "./components/ui/Logo";
import { fetchReport } from "./services/analyzeApi";
import type { AnalysisResult } from "./types/analysis";

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

export default function App() {
  const { status, result, error, serverSignaled, analyze, reset } = useAnalysis();
  const [currentUrl, setCurrentUrl] = useState("");
  const { sharedResult, sharedError, loadingShared } = useReportRoute();

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
        <div className="flex flex-col items-center justify-center min-h-screen px-4">
          <div className="w-full max-w-2xl fade-up">
            <div className="flex justify-center mb-10">
              <LogoWordmark size={32} />
            </div>

            <h1 className="text-center text-4xl sm:text-5xl font-bold tracking-tight text-zinc-100 leading-tight">
              Analyze any website<br />
              <span className="text-zinc-500">in seconds.</span>
            </h1>
            <p className="mt-5 text-center text-zinc-500 text-base leading-relaxed">
              Paste a URL — get tech stack, SEO audit, UX signals, and actionable recommendations.
            </p>

            <div className="mt-10">
              <URLInput onAnalyze={handleAnalyze} isLoading={false} />
            </div>
          </div>
        </div>
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
        <ResultDashboard result={result} onReset={reset} />
      )}
    </div>
  );
}
