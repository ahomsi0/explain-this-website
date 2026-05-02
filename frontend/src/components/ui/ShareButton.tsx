import { useState } from "react";

export function ShareButton({ reportId }: { reportId?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "unavailable">("idle");

  const handleShare = async () => {
    if (!reportId) {
      setState("unavailable");
      setTimeout(() => setState("idle"), 2500);
      return;
    }
    const link = `${window.location.origin}/report/${reportId}`;
    try { await navigator.clipboard.writeText(link); }
    catch {
      const el = document.createElement("textarea");
      el.value = link; document.body.appendChild(el); el.select();
      document.execCommand("copy"); document.body.removeChild(el);
    }
    setState("copied");
    setTimeout(() => setState("idle"), 2500);
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-colors"
    >
      {state === "copied" ? (
        <>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
          <span className="text-emerald-400 hidden sm:inline">Link copied</span>
        </>
      ) : state === "unavailable" ? (
        <>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <span className="text-red-400 hidden sm:inline">Not available</span>
        </>
      ) : (
        <>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
          </svg>
          <span className="hidden sm:inline">Share</span>
        </>
      )}
    </button>
  );
}
