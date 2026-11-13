// A captured page waiting for the visitor to confirm it. It is kept in
// sessionStorage so it survives the trip to the sign-in page and back, and
// stays in this tab only: it is gone when the tab closes.

import type { CapturePayload } from "../services/analyzeApi";

const KEY = "etw_pending_capture";

export type PendingCapture = CapturePayload & { title: string };

export function savePendingCapture(pending: PendingCapture): void {
  try { sessionStorage.setItem(KEY, JSON.stringify(pending)); }
  catch { /* too large for storage, or storage is off: it stays in memory only */ }
}

export function loadPendingCapture(): PendingCapture | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingCapture> | null;
    if (!parsed || typeof parsed.url !== "string" || typeof parsed.html !== "string") return null;
    return {
      url: parsed.url,
      html: parsed.html,
      title: typeof parsed.title === "string" ? parsed.title : "",
      source: parsed.source === "paste" ? "paste" : "browser",
      headers: parsed.headers,
      timings: parsed.timings,
    };
  } catch {
    return null;
  }
}

export function clearPendingCapture(): void {
  try { sessionStorage.removeItem(KEY); }
  catch { /* ignore */ }
}
