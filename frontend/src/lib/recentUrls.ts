// Remembers recently analyzed URLs locally so the landing page can offer
// one-click re-runs even before an account exists.
const KEY = "etw_recent_urls";
const MAX = 10;

export function getRecentUrls(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((u): u is string => typeof u === "string" && /^https?:\/\//i.test(u))
      .slice(0, MAX);
  } catch {
    return [];
  }
}

export function rememberUrl(url: string): void {
  try {
    const next = [url, ...getRecentUrls().filter((u) => u !== url)].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable — recents are a convenience, never critical.
  }
}
