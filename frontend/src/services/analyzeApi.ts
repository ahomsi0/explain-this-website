import type { AnalysisResult } from "../types/analysis";
import { getToken } from "./authApi";
import { getVisitorId } from "../lib/visitorId";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

// Adds Authorization header if a token is present, otherwise omits it.
function buildHeaders(extra: Record<string, string> = {}): HeadersInit {
  const t = getToken();
  const base = { ...extra, "X-Visitor-Id": getVisitorId() };
  return t ? { ...base, Authorization: `Bearer ${t}` } : base;
}

export async function fetchReport(id: string): Promise<AnalysisResult> {
  const res = await fetch(`${API_URL}/api/report/${id}`, { headers: buildHeaders() });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? `Report not found (${res.status})`);
  return data as AnalysisResult;
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

export async function analyzeWebsite(
  url: string,
  onServerReached?: () => void,
): Promise<AnalysisResult> {
  const deadline = Date.now() + TOTAL_TIMEOUT_MS;
  let serverReachedFired = false;

  while (true) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      throw new Error(
        `Analysis server did not respond in time. Make sure backend is running at ${API_URL}.`,
      );
    }

    const controller = new AbortController();
    const timeoutMs = Math.min(ATTEMPT_TIMEOUT_MS, remaining);
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${API_URL}/api/analyze`, {
        method: "POST",
        headers: buildHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ url }),
        signal: controller.signal,
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
      // If it's an application-level error (from the throw above), don't retry.
      if (!isNetworkError(err) && !(err instanceof DOMException)) {
        throw err;
      }

      // Network error or timeout — wait a bit then retry if deadline allows.
      const retryRemaining = deadline - Date.now();
      if (retryRemaining <= 0) {
        throw new Error(
          `Analysis server did not respond in time. Make sure backend is running at ${API_URL}.`,
        );
      }

      await new Promise((resolve) =>
        setTimeout(resolve, Math.min(RETRY_DELAY_MS, retryRemaining)),
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
