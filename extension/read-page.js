// Runs inside the page the user asked about, in their own signed-in browser.
// It reads the page as that browser shows it: the finished HTML, the load
// timings the browser already recorded, and a short list of response headers.
// No password, cookie or token is read.
//
// chrome.scripting injects this function by its source text, so it has to be
// self-contained: no imports and nothing from the surrounding file.

export async function readPage() {
  const MAX_HTML_CHARS = 5 * 1024 * 1024;
  const HEADERS_WAIT_MS = 2500;
  const OBSERVER_WAIT_MS = 150;
  // Response headers the report uses. Nothing else leaves the browser.
  const HEADER_NAMES = [
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

  const html = "<!doctype html>" + document.documentElement.outerHTML;
  if (html.length > MAX_HTML_CHARS) {
    return { error: "This page is too large to analyze. The limit is 5 MB of HTML." };
  }

  // Load timings the browser already recorded for this page.
  const timings = {};
  try {
    const nav = performance.getEntriesByType("navigation")[0];
    const resources = performance.getEntriesByType("resource");
    let bytes = 0;
    if (nav) {
      timings.ttfbMs = Math.round(nav.responseStart);
      timings.domContentLoadedMs = Math.round(nav.domContentLoadedEventEnd);
      timings.loadMs = Math.round(nav.loadEventEnd);
      bytes = nav.transferSize || 0;
    }
    for (const entry of resources) bytes += entry.transferSize || 0;
    timings.requests = resources.length + 1;
    timings.transferBytes = bytes;
  } catch {
    // Timings are a bonus. The page is still worth sending without them.
  }

  // Largest paint and layout shift are only available through an observer,
  // which replays what it has buffered a moment after it is created.
  const observe = (type, onEntries) => {
    try {
      if (!PerformanceObserver.supportedEntryTypes.includes(type)) return false;
      new PerformanceObserver((list) => onEntries(list.getEntries())).observe({ type, buffered: true });
      return true;
    } catch {
      return false;
    }
  };
  observe("largest-contentful-paint", (entries) => {
    const last = entries[entries.length - 1];
    if (last) timings.lcpMs = Math.round(last.startTime);
  });
  let shift = 0;
  const watchingShift = observe("layout-shift", (entries) => {
    for (const entry of entries) if (!entry.hadRecentInput) shift += entry.value;
    timings.cls = Math.round(shift * 1000) / 1000;
  });
  if (watchingShift) {
    timings.cls = 0;
    timings.hasCls = true;
  }

  // A HEAD request for the page's own address returns its response headers
  // without a body and without changing anything on the server.
  const headers = {};
  const readHeaders = (async () => {
    try {
      const res = await fetch(location.href, { method: "HEAD", credentials: "same-origin", cache: "no-store" });
      if (!res.ok) return;
      res.headers.forEach((value, name) => {
        if (HEADER_NAMES.includes(name.toLowerCase())) headers[name.toLowerCase()] = value;
      });
    } catch {
      // Some servers refuse HEAD. The report then says headers were not seen.
    }
  })();
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  await Promise.all([Promise.race([readHeaders, wait(HEADERS_WAIT_MS)]), wait(OBSERVER_WAIT_MS)]);

  return {
    capture: {
      url: location.href,
      title: document.title,
      html,
      // Copies, so a header or timing that lands late cannot change what is sent.
      headers: { ...headers },
      timings: { ...timings },
    },
  };
}
