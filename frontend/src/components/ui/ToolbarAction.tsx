import type { ReactNode } from "react";

// One action as a button in the report header (the menu-row twin is
// MenuAction). Icon-only buttons name themselves in a small tooltip, and the
// same tooltip reports the outcome ("Copied"), so feedback shows up right
// under the thing that was clicked.

const CHECK = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const ALERT = (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

export function ToolbarAction({
  icon,
  tooltip,
  text,
  status,
  primary = false,
  onClick,
  disabled = false,
  ariaLabel,
}: {
  icon: ReactNode;
  /** What the button does, shown on hover and focus. */
  tooltip: string;
  /** Visible label. Omit for an icon-only button. */
  text?: string;
  /** Outcome of the last click; shown in the tooltip until it clears. */
  status?: { text: string; tone: "ok" | "error" | "hint" };
  primary?: boolean;
  onClick: () => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  const tone = status?.tone;
  const shownIcon = tone === "ok" ? CHECK : tone === "error" ? ALERT : icon;
  const look = primary
    ? "border-violet-500 bg-violet-600 text-white hover:bg-violet-500"
    : `border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 ${
        tone === "ok" ? "text-emerald-400" : tone === "error" ? "text-red-400" : "text-zinc-400 hover:text-zinc-200"
      }`;

  return (
    <span className="group relative flex">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={ariaLabel}
        className={`flex h-7 items-center justify-center gap-1.5 rounded-md border text-xs font-medium transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-violet-500/60 disabled:opacity-60 ${
          text ? "px-2.5" : "w-7"
        } ${look}`}
      >
        {shownIcon}
        {text && <span>{text}</span>}
      </button>
      {/* Shown on hover and keyboard focus, and held open while there is an
          outcome to report. Keyboard focus only (:focus-visible): a mouse
          click also focuses the button, and the tip would then stay open
          until the next click somewhere else. */}
      <span
        role={status ? "status" : undefined}
        aria-hidden={status ? undefined : true}
        className={`pointer-events-none absolute left-1/2 top-full z-40 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] font-medium shadow-lg shadow-black/40 transition-opacity ${
          status ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-has-[:focus-visible]:opacity-100"
        } ${tone === "ok" ? "text-emerald-400" : tone === "error" ? "text-red-400" : "text-zinc-200"}`}
      >
        {status?.text ?? tooltip}
      </span>
    </span>
  );
}
