import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";

export function UserMenu({ onShowHistory }: { onShowHistory?: () => void }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!user) return null;
  const initial = user.email.charAt(0).toUpperCase();

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center w-7 h-7 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 text-[11px] font-bold hover:bg-violet-500/25 transition-colors"
        aria-label="Account menu"
      >
        {initial}
      </button>

      {open && (
        <div className="absolute right-0 top-9 w-56 rounded-md border border-zinc-800 bg-zinc-900 shadow-xl py-1 z-50">
          <div className="px-3 py-2 border-b border-zinc-800/60">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Signed in as</p>
            <p className="text-xs text-zinc-200 truncate" title={user.email}>{user.email}</p>
          </div>
          {onShowHistory && (
            <button
              onClick={() => { setOpen(false); onShowHistory(); }}
              className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Audit history
            </button>
          )}
          <button
            onClick={() => { setOpen(false); logout(); }}
            className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
