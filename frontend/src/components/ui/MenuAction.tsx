// One row of the report's Actions menu: what it does, and a quiet second
// line that says what you get. After a click the second line becomes the
// outcome ("Link copied"), so feedback appears where the eye already is.

const TONE = {
  hint: "text-zinc-500",
  ok: "text-emerald-400",
  error: "text-red-400",
} as const;

export function MenuAction({
  label,
  hint,
  status,
  onClick,
  disabled = false,
  ariaLabel,
  className = "",
}: {
  label: string;
  hint: string;
  /** Replaces the hint after the action runs. */
  status?: { text: string; tone: "ok" | "error" | "hint" };
  onClick: () => void;
  disabled?: boolean;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`flex w-full flex-col items-start rounded-md px-3 py-2 text-left transition-colors hover:bg-zinc-800/60 focus-visible:bg-zinc-800/60 focus-visible:outline-none disabled:opacity-60 ${className}`}
    >
      <span className="text-[13px] font-medium text-zinc-100">{label}</span>
      <span className={`mt-0.5 text-xs ${TONE[status?.tone ?? "hint"]}`}>{status?.text ?? hint}</span>
    </button>
  );
}
