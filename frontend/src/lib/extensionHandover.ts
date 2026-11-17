// The handover between the Chrome extension and the /capture page.
//
// The extension reads a page in the visitor's own browser, opens
// /capture?from=extension, and a script it runs on this page waits to be
// asked. The page asks with one message and the script answers with the page.
// Both messages travel inside this one tab: other websites cannot send them,
// because a message is only accepted from this window and this origin.

import type { BrowserTimings } from "../types/analysis";
import type { PendingCapture } from "./pendingCapture";

export const CAPTURE_REQUEST_MESSAGE = "etw-capture-request";
export const CAPTURE_MESSAGE = "etw-capture";

/** Response headers the report uses. Anything else is dropped. */
const CAPTURED_HEADERS = [
  "strict-transport-security",
  "content-security-policy",
  "x-frame-options",
  "x-content-type-options",
  "referrer-policy",
  "permissions-policy",
  "server",
  "x-powered-by",
  "x-generator",
];

const MAX_URL_LENGTH = 4096;

/** True when this tab was opened by the extension to hand a page over. */
export function openedByExtension(search: string): boolean {
  return new URLSearchParams(search).get("from") === "extension";
}

/**
 * The extension's answer, checked before it is used.
 * - `undefined`: not an answer from the extension at all.
 * - `null`: the extension answered and has no page for this tab.
 * - otherwise the page, ready for the confirm step.
 */
export function readExtensionCapture(data: unknown): PendingCapture | null | undefined {
  if (!data || typeof data !== "object") return undefined;
  const message = data as Record<string, unknown>;
  if (message.type !== CAPTURE_MESSAGE) return undefined;

  const c = message.capture;
  if (!c || typeof c !== "object") return null;
  const capture = c as Record<string, unknown>;
  if (typeof capture.url !== "string" || typeof capture.html !== "string") return null;
  if (capture.url.length > MAX_URL_LENGTH || capture.html.trim() === "") return null;
  try {
    const parsed = new URL(capture.url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
  } catch {
    return null;
  }

  const headers: Record<string, string> = {};
  if (capture.headers && typeof capture.headers === "object") {
    for (const [key, value] of Object.entries(capture.headers as Record<string, unknown>)) {
      const name = key.toLowerCase();
      if (typeof value === "string" && CAPTURED_HEADERS.includes(name)) headers[name] = value;
    }
  }

  return {
    url: capture.url,
    title: typeof capture.title === "string" ? capture.title.slice(0, 300) : "",
    html: capture.html,
    source: "browser",
    headers,
    timings: readTimings(capture.timings),
  };
}

function readTimings(raw: unknown): BrowserTimings {
  if (!raw || typeof raw !== "object") return {};
  const t = raw as Record<string, unknown>;
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? v : undefined);
  const out: BrowserTimings = {
    ttfbMs: num(t.ttfbMs),
    domContentLoadedMs: num(t.domContentLoadedMs),
    loadMs: num(t.loadMs),
    lcpMs: num(t.lcpMs),
    requests: num(t.requests),
    transferBytes: num(t.transferBytes),
  };
  if (t.hasCls === true && num(t.cls) !== undefined) {
    out.cls = num(t.cls);
    out.hasCls = true;
  }
  return out;
}
