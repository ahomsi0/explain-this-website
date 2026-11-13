// The "Explain this page" bookmark button and the message it sends.
//
// The button runs on someone else's page, in the visitor's own logged-in
// browser. It reads the page as that browser sees it, opens this site in a new
// tab and hands the page over with postMessage. No password, cookie or token is
// read or sent, and the server never requests the page.
//
// The script is written out by hand as a string: it has to be one
// self-contained expression with no imports, and a bundler would rewrite a
// real function into something that depends on its own helpers.

import type { BrowserTimings } from "../types/analysis";

export const CAPTURE_MESSAGE = "etw-capture";
export const CAPTURE_READY_MESSAGE = "etw-capture-ready";
export const CAPTURE_PATH = "/capture";

/** Response headers the report uses. Nothing else leaves the visitor's browser. */
export const CAPTURED_HEADERS = [
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

export interface CaptureMessage {
  type: typeof CAPTURE_MESSAGE;
  url: string;
  title: string;
  html: string;
  headers: Record<string, string>;
  timings: BrowserTimings;
}

/** The bookmark button's script for a given site origin (no `javascript:` prefix). */
export function bookmarkletSource(origin: string): string {
  const O = JSON.stringify(origin);
  const headerRe = `/^(${CAPTURED_HEADERS.join("|")})$/`;
  return [
    "(function(){",
    `var O=${O};`,
    'if(location.origin===O){alert("Open the page you want to analyze first, then click this bookmark there.");return}',
    `var w=window.open(O+"${CAPTURE_PATH}","_blank");`,
    'if(!w){alert("Your browser blocked the new tab. Allow pop-ups for this page and click the bookmark again.");return}',
    "var d=document,p=window.performance,t={},h={},ready=false,gotHeaders=false,sent=false;",
    `var data={type:"${CAPTURE_MESSAGE}",url:location.href,title:d.title,html:"<!doctype html>"+d.documentElement.outerHTML,headers:h,timings:t};`,
    // Load timings the browser already recorded for this page.
    "try{var n=p.getEntriesByType(\"navigation\")[0],r=p.getEntriesByType(\"resource\"),b=0,i;",
    "if(n){t.ttfbMs=Math.round(n.responseStart);t.domContentLoadedMs=Math.round(n.domContentLoadedEventEnd);t.loadMs=Math.round(n.loadEventEnd);b=n.transferSize||0}",
    "for(i=0;i<r.length;i++)b+=r[i].transferSize||0;t.requests=r.length+1;t.transferBytes=b}catch(e){}",
    "function ob(k,f){try{if(PerformanceObserver.supportedEntryTypes.indexOf(k)<0)return false;new PerformanceObserver(function(l){f(l.getEntries())}).observe({type:k,buffered:true});return true}catch(e){return false}}",
    'ob("largest-contentful-paint",function(es){var l=es[es.length-1];if(l)t.lcpMs=Math.round(l.startTime)});',
    'var cls=0;if(ob("layout-shift",function(es){for(var j=0;j<es.length;j++)if(!es[j].hadRecentInput)cls+=es[j].value;t.cls=Math.round(cls*1000)/1000})){t.cls=0;t.hasCls=true}',
    "function send(){if(ready&&gotHeaders&&!sent){sent=true;w.postMessage(data,O)}}",
    // A HEAD request for the page's own address: it returns the response
    // headers without a body and without changing anything on the server.
    `try{fetch(location.href,{method:"HEAD",credentials:"same-origin",cache:"no-store"}).then(function(res){if(res.ok)res.headers.forEach(function(v,k){if(${headerRe}.test(k))h[k]=v});gotHeaders=true;send()}).catch(function(){gotHeaders=true;send()})}catch(e){gotHeaders=true}`,
    "setTimeout(function(){gotHeaders=true;send()},2500);",
    `window.addEventListener("message",function(e){if(e.origin===O&&e.source===w&&e.data&&e.data.type==="${CAPTURE_READY_MESSAGE}"){ready=true;send()}});`,
    "})();",
  ].join("");
}

/** The href to put on the draggable button. */
export function bookmarkletHref(origin: string): string {
  return `javascript:${encodeURIComponent(bookmarkletSource(origin))}`;
}

const MAX_URL_LENGTH = 4096;

/**
 * Validate a message from the page that opened this tab. Any site can open
 * this page and post to it, so nothing is trusted: the shape is checked, and
 * the page address must belong to the origin that sent it, so one site cannot
 * submit a page claiming to be another.
 */
export function readCaptureMessage(data: unknown, senderOrigin: string): CaptureMessage | null {
  if (!data || typeof data !== "object") return null;
  const m = data as Record<string, unknown>;
  if (m.type !== CAPTURE_MESSAGE) return null;
  if (typeof m.url !== "string" || typeof m.html !== "string") return null;
  if (m.url.length > MAX_URL_LENGTH || m.html.trim() === "") return null;

  let pageOrigin: string;
  try {
    const parsed = new URL(m.url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    pageOrigin = parsed.origin;
  } catch {
    return null;
  }
  if (pageOrigin !== senderOrigin) return null;

  const headers: Record<string, string> = {};
  if (m.headers && typeof m.headers === "object") {
    for (const [key, value] of Object.entries(m.headers as Record<string, unknown>)) {
      const name = key.toLowerCase();
      if (typeof value === "string" && CAPTURED_HEADERS.includes(name)) headers[name] = value;
    }
  }

  return {
    type: CAPTURE_MESSAGE,
    url: m.url,
    title: typeof m.title === "string" ? m.title.slice(0, 300) : "",
    html: m.html,
    headers,
    timings: readTimings(m.timings),
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
