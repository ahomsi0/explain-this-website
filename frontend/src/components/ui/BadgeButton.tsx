import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8080";

// BadgeButton copies an embeddable SVG badge snippet for the analyzed site.
// The badge is served by GET /api/badge?url=… from the latest server-side
// analysis of that URL, so it keeps working after this session ends.
export function BadgeButton({ url, reportId }: { url: string; reportId?: string }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleCopy = async () => {
    const reportPath = reportId ? `/report/${reportId}` : "/";
    const snippet = `<a href="${window.location.origin}${reportPath}" target="_blank" rel="noopener">\n  <img src="${API_URL}/api/badge?url=${encodeURIComponent(url)}" alt="Website audit score" height="20">\n</a>`;
    let ok = false;
    try {
      await navigator.clipboard.writeText(snippet);
      ok = true;
    } catch {
      try {
        const el = document.createElement("textarea");
        el.value = snippet;
        document.body.appendChild(el);
        el.select();
        ok = document.execCommand("copy");
        document.body.removeChild(el);
      } catch {
        ok = false;
      }
    }
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      setFailed(true);
      setTimeout(() => setFailed(false), 2500);
    }
  };

  return (
    <button
      onClick={handleCopy}
      aria-label={copied ? "Embed badge: copied" : failed ? "Embed badge: copy failed" : "Copy embeddable score badge"}
      title="Copy an embeddable score badge for this site"
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-colors"
    >
      {copied ? (
        <>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span className="text-emerald-400 hidden sm:inline">Badge copied</span>
        </>
      ) : failed ? (
        <>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span className="text-red-400 hidden sm:inline">Copy failed</span>
        </>
      ) : (
        <>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
          </svg>
          <span className="hidden sm:inline">Badge</span>
        </>
      )}
    </button>
  );
}
