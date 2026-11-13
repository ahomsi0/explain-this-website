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
  // A page captured from behind a login belongs to its owner alone: it has no
  // public link to share and no public score to put on a badge.
  const isPrivate = Boolean(result.capture);

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
    <>
      {/* From sm up the actions sit in the header itself: one click, no menu. */}
      <div className="hidden sm:flex items-center gap-1.5" role="group" aria-label="Report actions">
        {!isPrivate && <ShareButton reportId={result.reportId} variant="toolbar" />}
        <DownloadButton result={result} variant="toolbar" />
        <CopyButton result={result} variant="toolbar" />
        {!isPrivate && <BadgeButton url={result.url} reportId={result.reportId} variant="toolbar" />}
      </div>

      {/* Phones have no room for four buttons, so they keep a menu. */}
      <div ref={menuRef} className="relative sm:hidden">
        <button
          type="button"
          aria-label="Report actions"
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen((value) => !value)}
          className={`flex min-h-11 min-w-11 items-center justify-center rounded-md border px-1.5 py-1.5 text-xs font-medium transition-colors hover:border-zinc-700 hover:bg-zinc-800 hover:text-zinc-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-violet-500/60 ${
            open ? "border-zinc-700 bg-zinc-800 text-zinc-200" : "border-zinc-800 text-zinc-400"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="5" cy="12" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="19" cy="12" r="1.8" />
          </svg>
        </button>

        {open && (
          <div
            className="absolute right-0 top-full z-40 mt-2 w-60 rounded-lg border border-zinc-800 bg-zinc-900 p-1 shadow-xl shadow-black/40"
            role="menu"
            aria-label="Report actions menu"
          >
            {!isPrivate && <ShareButton reportId={result.reportId} />}
            <CopyButton result={result} />
            <DownloadButton result={result} />
            {!isPrivate && <BadgeButton url={result.url} reportId={result.reportId} />}
            {onRerun && (
              <MenuAction
                label="Re-run fresh"
                hint="Skip the cache and audit again"
                onClick={onRerun}
                ariaLabel="Re-run fresh"
              />
            )}
          </div>
        )}
      </div>
    </>
  );
}
