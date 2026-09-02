import type { AnalysisResult } from "../types/analysis";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";
const REPORT_TIMEOUT_MS = 180_000;

export async function fetchReport(id: string): Promise<AnalysisResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REPORT_TIMEOUT_MS);

  try {
    const res = await fetch(`${API_URL}/api/report/${id}`, {
      credentials: "include",
      signal: controller.signal,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.error ?? `Report not found (${res.status})`);
    return data as AnalysisResult;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("The report server did not respond in time. Please try again.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

// How long to wait for the server in total (covers Render cold-starts which can take 60-90s).
const TOTAL_TIMEOUT_MS = 180_000;

// How long a single attempt is allowed before we retry (handles flaky wakeups).
// Must exceed the longest real analysis (~90s when PageSpeed is slow under load).
const ATTEMPT_TIMEOUT_MS = 150_000;

// Delay between retries when the attempt itself fails (network error, not a slow response).
const RETRY_DELAY_MS = 2_000;

function isNetworkError(err: unknown): boolean {
  // TypeError is thrown by fetch on network failure / CORS block.
  return err instanceof TypeError;
}

// AbortSignal.any is unavailable on older browsers; fall back to a manual
// relay so the caller's signal still aborts the attempt.
function anySignal(signals: AbortSignal[]): AbortSignal {
  if (typeof AbortSignal.any === "function") {
    return AbortSignal.any(signals);
  }
  const controller = new AbortController();
  for (const s of signals) {
    if (s.aborted) {
      controller.abort(s.reason);
      break;
    }
    s.addEventListener("abort", () => controller.abort(s.reason), { once: true });
  }
  return controller.signal;
}

export interface AnalyzeOptions {
  /** Bypass the server's short-lived result cache ("Re-run fresh"). */
  refresh?: boolean;
  /** Deep scan: also audit a few key subpages (/pricing, /about, …). */
  deep?: boolean;
}

export async function analyzeWebsite(
  url: string,
  onServerReached?: () => void,
  signal?: AbortSignal,
  opts: AnalyzeOptions = {},
): Promise<AnalysisResult> {
  const deadline = Date.now() + TOTAL_TIMEOUT_MS;
  let serverReachedFired = false;

  while (true) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      throw new Error("Analysis timed out. Please try again.");
    }

    const controller = new AbortController();
    const timeoutMs = Math.min(ATTEMPT_TIMEOUT_MS, remaining);
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${API_URL}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          refresh: opts.refresh === true,
          deep: opts.deep === true,
        }),
        credentials: "include",
        signal: signal ? anySignal([controller.signal, signal]) : controller.signal,
      });

      let data: { error?: string } | undefined;
      try { data = await response.json(); } catch { /* not valid JSON */ }

      if (!response.ok) {
        // Real application error from the Go server — don't retry.
        throw new Error(data?.error ?? `Server error (${response.status})`);
      }

      if (!data) {
        // 200 OK but no valid JSON — likely Render's proxy "waking up" page.
        // Treat as transient and retry.
        throw new TypeError("Non-JSON response — server not ready yet");
      }

      // We have a real successful response from the Go server.
      if (!serverReachedFired) {
        serverReachedFired = true;
        onServerReached?.();
      }

      return data as AnalysisResult;
    } catch (err) {
      if (signal?.aborted) throw err;
      // If it's an application-level error (from the throw above), don't retry.
      if (!isNetworkError(err) && !(err instanceof DOMException)) {
        throw err;
      }

      // Network error or timeout — wait a bit then retry if deadline allows.
      const retryRemaining = deadline - Date.now();
      if (retryRemaining <= 0) {
        throw new Error("Analysis timed out. Please try again.");
      }

      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(RETRY_DELAY_MS, retryRemaining)),
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
