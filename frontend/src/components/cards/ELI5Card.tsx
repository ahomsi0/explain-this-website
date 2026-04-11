import { useState } from "react";
import type { ELI5Item } from "../../types/analysis";

export function ELI5Card({ items }: { items: ELI5Item[] }) {
  const [open, setOpen] = useState(false);

  if (items.length === 0) return null;

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between group"
      >
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Website Summary</p>
          <span className="text-[10px] font-medium text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded">
            {items.length} findings
          </span>
        </div>
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          className={`text-zinc-600 group-hover:text-zinc-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {!open && (
        <p className="text-xs text-zinc-600 mt-1.5">
          Plain-language explanations of the issues found — no technical knowledge required.
        </p>
      )}

      {open && (
        <div className="mt-3 flex flex-col gap-3">
          {items.map((item, i) => (
            <div key={i} className="flex flex-col gap-1 pl-3 border-l-2 border-zinc-800">
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">{item.technical}</p>
              <p className="text-xs text-zinc-400 leading-relaxed">{item.simple}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
