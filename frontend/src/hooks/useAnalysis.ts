import { useState, useCallback, useRef } from "react";
import type { AnalysisResult, AnalysisStatus } from "../types/analysis";
import { analyzeWebsite, type AnalyzeOptions } from "../services/analyzeApi";
import { mockAnalysisResult } from "../mock/mockData";

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

const STORAGE_KEY = "explain_current_analysis";

interface PersistedAnalysis {
  result: AnalysisResult;
  url: string;
}

function loadPersisted(): PersistedAnalysis | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.result && parsed?.url) return parsed as PersistedAnalysis;
  } catch { /* corrupted — ignore */ }
  return null;
}

function savePersisted(result: AnalysisResult, url: string) {
  try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ result, url })); }
  catch { /* quota — ignore */ }
}

function clearPersisted() {
  try { sessionStorage.removeItem(STORAGE_KEY); }
  catch { /* ignore */ }
}

interface UseAnalysisReturn {
  status: AnalysisStatus;
  result: AnalysisResult | null;
  currentUrl: string;
  error: string | null;
  serverSignaled: boolean;
  analyze: (url: string, opts?: AnalyzeOptions) => Promise<void>;
  cancel: () => void;
  reset: () => void;
}

export function useAnalysis(onSuccess?: (result: AnalysisResult) => void | Promise<void>): UseAnalysisReturn {
  const persisted = useRef(loadPersisted());
  const [status, setStatus] = useState<AnalysisStatus>(() => persisted.current ? "success" : "idle");
  const [result, setResult] = useState<AnalysisResult | null>(() => persisted.current?.result ?? null);
  const [currentUrl, setCurrentUrl] = useState<string>(() => persisted.current?.url ?? "");
  const [error, setError] = useState<string | null>(null);
  const [serverSignaled, setServerSignaled] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  const analyze = useCallback(async (url: string, opts: AnalyzeOptions = {}) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setCurrentUrl(url);
    setStatus("loading");
    setResult(null);
    setError(null);
    setServerSignaled(false);

    try {
      let data: AnalysisResult;

      if (USE_MOCK) {
        setServerSignaled(true);
        // Simulate network latency so the loading state is visible. Long
        // enough for e2e tests to click "Cancel analysis" comfortably.
        await new Promise<void>((resolve, reject) => {
          const timer = setTimeout(resolve, 4000);
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
        data = await analyzeWebsite(url, () => setServerSignaled(true), controller.signal, opts);
      }

      // A newer analyze()/cancel()/reset() has taken over — drop this stale
      // response instead of clobbering the newer request's state.
      if (controllerRef.current !== controller) return;
      setResult(data);
      setCurrentUrl(url);
      savePersisted(data, url);
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

  const clearState = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    clearPersisted();
    setStatus("idle");
    setResult(null);
    setCurrentUrl("");
    setError(null);
    setServerSignaled(false);
  }, []);

  const cancel = clearState;
  const reset = clearState;

  return { status, result, currentUrl, error, serverSignaled, analyze, cancel, reset };
}
