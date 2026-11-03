// Logo for "Explain This Website": three lines of a page with one of them
// swiped by a highlighter. The wordmark repeats the idea by highlighting
// "this". One accent colour on one shape, so it reads at 16 px.
//
// The lines use currentColor; the wrapper sets text-zinc-100, which the light
// theme remaps to ink (see index.css), so the mark adapts without props.

export const LOGO_ACCENT = "#7c3aed";

export function LogoMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex text-zinc-100 ${className}`}>
      <svg
        aria-hidden="true"
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Highlighter swipe, slightly skewed like a real marker stroke */}
        <polygon points="7,23 58,20 59,38 8,41" fill={LOGO_ACCENT} />
        {/* Page lines */}
        <rect x="12" y="12" width="34" height="7" rx="3.5" fill="currentColor" />
        <rect x="12" y="28.5" width="42" height="7" rx="3.5" fill="currentColor" />
        <rect x="12" y="45" width="26" height="7" rx="3.5" fill="currentColor" />
      </svg>
    </span>
  );
}

export function LogoWordmark({ size = 28 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark size={size} />
      <span className="text-sm font-semibold text-zinc-100 tracking-tight whitespace-nowrap">
        explain{" "}
        <mark className="rounded-[3px] bg-violet-600 px-1 py-px text-white">this</mark>{" "}
        website
      </span>
    </div>
  );
}
