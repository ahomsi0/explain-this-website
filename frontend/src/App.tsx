import { useState } from "react";
import { useAnalysis } from "./hooks/useAnalysis";
import { UrlInput } from "./components/UrlInput/UrlInput";
import { LoadingSpinner } from "./components/ui/LoadingSpinner";
import { ErrorBanner } from "./components/ui/ErrorBanner";
import { ResultDashboard } from "./components/ResultDashboard/ResultDashboard";
import { LogoWordmark } from "./components/ui/Logo";

export default function App() {
  const { status, result, error, analyze, reset } = useAnalysis();
  const [currentUrl, setCurrentUrl] = useState("");

  const handleAnalyze = (url: string) => { setCurrentUrl(url); analyze(url); };

  return (
    <div className="min-h-screen" style={{ background: "hsl(0 0% 4%)" }}>
      {status === "idle" && (
        <div className="flex flex-col items-center justify-center min-h-screen px-4">
          <div className="w-full max-w-2xl fade-up">
            {/* Wordmark */}
            <div className="flex justify-center mb-10">
              <LogoWordmark size={32} />
            </div>

            {/* Headline */}
            <h1 className="text-center text-4xl sm:text-5xl font-bold tracking-tight text-zinc-100 leading-tight">
              Analyze any website<br />
              <span className="text-zinc-500">in seconds.</span>
            </h1>
            <p className="mt-5 text-center text-zinc-500 text-base leading-relaxed">
              Paste a URL — get tech stack, SEO audit, UX signals, and actionable recommendations.
            </p>

            {/* URL input */}
            <div className="mt-10">
              <UrlInput onAnalyze={handleAnalyze} isLoading={false} />
            </div>
          </div>
        </div>
      )}

      {status === "loading" && <LoadingSpinner url={currentUrl} />}

      {status === "error" && <ErrorBanner message={error!} onRetry={reset} />}

      {status === "success" && result && (
        <ResultDashboard result={result} onReset={reset} />
      )}
    </div>
  );
}
