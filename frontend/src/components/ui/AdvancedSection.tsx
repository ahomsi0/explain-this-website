// Simple collapsible wrapper for advanced/technical detail cards

import { useState } from "react";

interface AdvancedSectionProps {
  children: React.ReactNode;
  label?: string; // default: "Advanced Technical Details"
}

export function AdvancedSection({ children, label = "Advanced Technical Details" }: AdvancedSectionProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-xs text-zinc-500
                   hover:text-zinc-300 bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-800/60
                   transition-colors"
      >
        {/* Chevron SVG — rotates when open */}
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className={`transition-transform shrink-0 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
        <span className="font-medium">{open ? `Hide ${label}` : `Show ${label}`}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-2 mt-2">
          {children}
        </div>
      )}
    </div>
  );
}
