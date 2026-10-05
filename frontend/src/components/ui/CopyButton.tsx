import { useState } from "react";
import type { AnalysisResult } from "../../types/analysis";
import { formatReport } from "../../utils/reportFormatter";

export function CopyButton({ result, inMenu = false }: { result: AnalysisResult; inMenu?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  const handleCopy = async () => {
    const text = formatReport(result);
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; }
    catch {
      // Clipboard API unavailable/denied — try the legacy path and honour its result.
      try {
        const el = document.createElement("textarea");
        el.value = text; document.body.appendChild(el); el.select();
        ok = document.execCommand("copy");
        document.body.removeChild(el);
      } catch { ok = false; }
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
      aria-label={copied ? "Copy report: copied" : "Copy report"}
      title="Copy report"
      className={`flex items-center gap-2 px-3 ${inMenu ? "py-2.5 w-full rounded-md border-0" : "py-1.5 rounded-md border"} text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors ${inMenu ? "justify-start" : "border-zinc-800 hover:border-zinc-700"}`}
    >
      {copied ? (
        <>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span className={`text-emerald-400 ${inMenu ? "" : "hidden sm:inline"}`}>Copied</span>
        </>
      ) : failed ? (
        <>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span className={`text-red-400 ${inMenu ? "" : "hidden sm:inline"}`}>Copy failed</span>
        </>
      ) : (
        <>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          <span className={inMenu ? "" : "hidden sm:inline"}>Copy</span>
        </>
      )}
    </button>
  );
}
