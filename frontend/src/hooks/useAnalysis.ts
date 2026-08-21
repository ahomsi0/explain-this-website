import { useState, useCallback, useRef } from "react";
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
  cancel: () => void;
  reset: () => void;
}

export function useAnalysis(onSuccess?: (result: AnalysisResult) => void | Promise<void>): UseAnalysisReturn {
  const [status, setStatus] = useState<AnalysisStatus>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [serverSignaled, setServerSignaled] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  const analyze = useCallback(async (url: string) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setStatus("loading");
    setResult(null);
    setError(null);
    setServerSignaled(false);

    try {
      let data: AnalysisResult;

      if (USE_MOCK) {
        setServerSignaled(true);
        // Simulate network latency so the loading state is visible.
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, 1400);
          controller.signal.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(new DOMException("Analysis cancelled", "AbortError"));
          }, { once: true });
        });
        data = { ...mockAnalysisResult, url };
      } else {
        // Go straight to the analysis request — no separate health preflight.
        // Render holds the TCP connection while waking the service, so the
        // fetch naturally waits. onServerReached fires the moment we get any
        // HTTP response back, advancing the loading spinner.
        data = await analyzeWebsite(url, () => setServerSignaled(true), controller.signal);
      }

      // A newer analyze()/cancel()/reset() has taken over — drop this stale
      // response instead of clobbering the newer request's state.
      if (controllerRef.current !== controller) return;
      setResult(data);
      void onSuccess?.(data);
      setStatus("success");
    } catch (err) {
      // Superseded by a newer request — its state updates must win.
      if (controllerRef.current !== controller) return;
      if (controller.signal.aborted) {
        setStatus("idle");
        return;
      }
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
      setStatus("error");
    } finally {
      if (controllerRef.current === controller) controllerRef.current = null;
    }
  }, [onSuccess]);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setStatus("idle");
    setResult(null);
    setError(null);
    setServerSignaled(false);
  }, []);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setStatus("idle");
    setResult(null);
    setError(null);
    setServerSignaled(false);
  }, []);

  return { status, result, error, serverSignaled, analyze, cancel, reset };
}
