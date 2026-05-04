import { useState, useCallback } from "react";
import type { AnalysisResult, AnalysisStatus } from "../types/analysis";
import { analyzeWebsite } from "../services/analyzeApi";
import { mockAnalysisResult } from "../mock/mockData";

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

interface UseAnalysisReturn {
  status: AnalysisStatus;
  result: AnalysisResult | null;
  error: string | null;
  serverSignaled: boolean;
  analyze: (url: string) => Promise<void>;
  reset: () => void;
}

export function useAnalysis(onSuccess?: (result: AnalysisResult) => void | Promise<void>): UseAnalysisReturn {
  const [status, setStatus] = useState<AnalysisStatus>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [serverSignaled, setServerSignaled] = useState(false);

  const analyze = useCallback(async (url: string) => {
    setStatus("loading");
    setResult(null);
    setError(null);
    setServerSignaled(false);

    try {
      let data: AnalysisResult;

      if (USE_MOCK) {
        setServerSignaled(true);
        // Simulate network latency so the loading state is visible.
        await new Promise((resolve) => setTimeout(resolve, 1400));
        data = { ...mockAnalysisResult, url };
      } else {
        // Go straight to the analysis request — no separate health preflight.
        // Render holds the TCP connection while waking the service, so the
        // fetch naturally waits. onServerReached fires the moment we get any
        // HTTP response back, advancing the loading spinner.
        data = await analyzeWebsite(url, () => setServerSignaled(true));
      }

      setResult(data);
      void onSuccess?.(data);
      setStatus("success");
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
      setStatus("error");
    }
  }, [onSuccess]);

  const reset = useCallback(() => {
    setStatus("idle");
    setResult(null);
    setError(null);
    setServerSignaled(false);
  }, []);

  return { status, result, error, serverSignaled, analyze, reset };
}
