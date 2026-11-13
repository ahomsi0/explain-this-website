import { useEffect, useRef, useState } from "react";
import type { AnalysisResult } from "../../types/analysis";
import { CopyButton } from "../ui/CopyButton";
import { DownloadButton } from "../ui/DownloadButton";
import { BadgeButton } from "../ui/BadgeButton";
import { ShareButton } from "../ui/ShareButton";
import { MenuAction } from "../ui/MenuAction";

export function ReportActionsMenu({
  result,
  onRerun,
}: {
  result: AnalysisResult;
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
        className={`flex min-h-11 min-w-11 sm:min-h-0 sm:min-w-0 items-center justify-center gap-1.5 rounded-md border px-1.5 sm:px-2.5 py-1.5 text-xs font-medium transition-colors hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-violet-500/60 ${
          open ? "border-zinc-700 bg-zinc-800 text-zinc-200" : "border-zinc-800 text-zinc-400"
        }`}
      >
        {/* Phones have no room for the word, so they get a "more" glyph. */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className="sm:hidden">
          <circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" />
        </svg>
        <span className="hidden sm:inline">Actions</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={`hidden sm:block transition-transform ${open ? "rotate-180" : ""}`}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-40 mt-2 w-60 rounded-lg border border-zinc-800 bg-zinc-900 p-1 shadow-xl shadow-black/40"
          role="menu"
          aria-label="Report actions menu"
        >
          {/* Sharing first: it is the action most worth finding. */}
          <ShareButton reportId={result.reportId} />
          <CopyButton result={result} />
          <DownloadButton result={result} />
          <BadgeButton url={result.url} reportId={result.reportId} />
          {onRerun && (
            <MenuAction
              label="Re-run fresh"
              hint="Skip the cache and audit again"
              onClick={onRerun}
              ariaLabel="Re-run fresh"
              className="sm:hidden"
            />
          )}
        </div>
      )}
    </div>
  );
}
