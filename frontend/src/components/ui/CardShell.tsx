// frontend/src/components/ui/CardShell.tsx
import { useState } from "react";

interface CardShellProps {
  children: React.ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  title?: string;
  variant?: "primary" | "secondary";
}

export function CardShell({ children, className = "", collapsible, defaultOpen, title, variant = "secondary" }: CardShellProps) {
  const [open, setOpen] = useState(defaultOpen ?? true);

  const base = variant === "primary"
    ? "rounded-lg border border-zinc-700 bg-zinc-800/30"
    : "rounded-lg border border-zinc-800 bg-zinc-900";

  if (!collapsible) {
    return (
      <div className={`${base} ${className}`}>
        {children}
      </div>
    );
  }

  return (
    <div className={`${base} ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-5 py-3.5
                   border-b border-zinc-800/60 text-left hover:bg-zinc-800/60 transition-colors"
      >
        <span className="text-sm font-semibold text-zinc-200">{title}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className={`text-zinc-500 transition-transform shrink-0 ${open ? "rotate-180" : ""}`}
          aria-hidden="true">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}
