import { useState } from "react";
import type { AnalysisResult } from "../../types/analysis";
import { formatReport } from "../../utils/reportFormatter";

export function CopyButton({ result }: { result: AnalysisResult }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = formatReport(result);
    try { await navigator.clipboard.writeText(text); }
    catch {
      const el = document.createElement("textarea");
      el.value = text; document.body.appendChild(el); el.select();
      document.execCommand("copy"); document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button onClick={handleCopy} className="btn-ghost text-sm border border-white/8 hover:border-white/15">
      {copied ? (
        <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        <span className="text-emerald-400">Copied!</span></>
      ) : (
        <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>Copy</>
      )}
    </button>
  );
}
