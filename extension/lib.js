// Small pure helpers shared by the popup and the background worker. No chrome
// APIs here, so they can be tested outside a browser.

/** Hosts where Chrome does not let any extension read the page. */
const STORE_HOSTS = ["chromewebstore.google.com", "chrome.google.com"];

/**
 * What the popup can do with a tab.
 * - "ready": a normal web page.
 * - "own-site": the tab is Explain This Website itself.
 * - "unsupported": a browser page, a file, the Web Store, or no address at all.
 */
export function describeTab(tab, site) {
  let url;
  try {
    url = new URL(tab?.url ?? "");
  } catch {
    return { kind: "unsupported" };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return { kind: "unsupported" };
  if (STORE_HOSTS.includes(url.hostname)) return { kind: "unsupported" };
  if (url.origin === new URL(site).origin) return { kind: "own-site" };
  return {
    kind: "ready",
    url: url.href,
    title: (tab.title || "").trim(),
    address: displayAddress(url),
  };
}

/** "app.example.com/dashboard": the address without scheme, query or hash. */
export function displayAddress(url) {
  const path = url.pathname === "/" ? "" : url.pathname;
  return url.host + path;
}

/** Where the site starts its normal analysis of a public address. */
export function publicAnalysisUrl(site, pageUrl) {
  const clean = new URL(pageUrl);
  clean.hash = "";
  return `${site}/?url=${encodeURIComponent(clean.href)}`;
}

/** Where the site waits for a page handed over by this extension. */
export function handoverUrl(site) {
  return `${site}/capture?from=extension`;
}
