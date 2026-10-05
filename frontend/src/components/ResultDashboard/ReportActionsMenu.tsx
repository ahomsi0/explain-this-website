import { useEffect, useRef, useState } from "react";
import type { AnalysisResult } from "../../types/analysis";
import { CopyButton } from "../ui/CopyButton";
import { DownloadButton } from "../ui/DownloadButton";
import { BadgeButton } from "../ui/BadgeButton";
import { ShareButton } from "../ui/ShareButton";

export function ReportActionsMenu({
  result,
  canShare,
  onRerun,
}: {
  result: AnalysisResult;
  canShare: boolean;
  onRerun?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-label="Report actions"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        className={`flex min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 items-center justify-center gap-1.5 rounded-md border px-1.5 sm:px-2.5 py-1.5 text-xs font-medium transition-colors hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/60 ${
          open ? "border-zinc-700 bg-zinc-800 text-zinc-200" : "border-zinc-800 text-zinc-400"
        }`}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3v12" />
          <path d="m8 11 4 4 4-4" />
          <path d="M5 21h14" />
        </svg>
        <span className="hidden sm:inline">Actions</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-48 sm:w-max sm:min-w-full rounded-lg border border-zinc-700 bg-zinc-900 p-1.5 shadow-2xl shadow-black/50" role="menu" aria-label="Report actions menu">
          {/* Items come from shared button components; style them here so they read as one menu. */}
          <div className="[&_button]:gap-2.5 [&_button]:px-2.5 [&_button]:whitespace-nowrap [&_button]:text-[13px] [&_button]:text-zinc-200 [&_button:focus-visible]:bg-zinc-800 [&_button:focus-visible]:outline-none [&_button:focus-visible]:ring-1 [&_button:focus-visible]:ring-violet-500/60 [&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:shrink-0">
            <CopyButton result={result} inMenu />
            <DownloadButton result={result} inMenu />
            <BadgeButton url={result.url} reportId={result.reportId} inMenu />
            <ShareButton reportId={result.reportId} canShare={canShare} inMenu />
            {onRerun && <button type="button" onClick={onRerun} className="sm:hidden min-h-11 w-full rounded-md px-3 py-2.5 text-left text-xs text-zinc-300 hover:bg-zinc-800">Re-run fresh</button>}
          </div>
        </div>
      )}
    </div>
  );
}
