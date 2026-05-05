// frontend/src/components/ui/Tooltip.tsx
import { useState } from "react";
import type { ReactNode } from "react";

export function Tooltip({ children, text }: { children: ReactNode; text: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-max max-w-[220px] px-2.5 py-1.5 rounded-md bg-zinc-800 border border-zinc-700 text-[11px] text-zinc-300 leading-snug shadow-xl pointer-events-none text-center">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-800" />
        </span>
      )}
    </span>
  );
}
