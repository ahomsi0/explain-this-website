import type { AnalysisResult } from "../types/analysis";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";
const HEALTH_TIMEOUT_MS = 2500;

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export async function waitForServerSignal(timeoutMs = HEALTH_TIMEOUT_MS): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/health`, {
      method: "GET",
      signal: controller.signal,
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error(`Analysis server did not respond in time. Make sure backend is running at ${API_URL}.`);
    }
    throw new Error(`Could not reach analysis server at ${API_URL}.`);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new Error(`Analysis server is unavailable (${response.status})`);
  }
}

export async function analyzeWebsite(url: string): Promise<AnalysisResult> {
  const response = await fetch(`${API_URL}/api/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  let data: { error?: string } | undefined;
  try { data = await response.json(); } catch { /* response body wasn't valid JSON */ }

  if (!response.ok) {
    throw new Error(data?.error ?? `Server error (${response.status})`);
  }

  return data as AnalysisResult;
}
