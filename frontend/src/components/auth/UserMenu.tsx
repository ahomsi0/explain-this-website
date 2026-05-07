import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { createCheckoutSession } from "../../services/authApi";

export function UserMenu({ onGoPro }: { onGoPro?: () => void }) {
  const { user, logout, refreshUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<"upgrade" | "manage" | null>(null);
  const [error, setError] = useState<string | null>(null);
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
  const isPro = user.plan === "pro";

  async function startUpgrade() {
    setError(null);
    setBusy("upgrade");
    try {
      const { url } = await createCheckoutSession();
      window.location.href = url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open checkout");
    } finally {
      setBusy(null);
    }
  }

  function openPortal() {
    window.location.href = "/go-pro";
  }

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
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                isPro
                  ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/25"
                  : "text-zinc-300 bg-zinc-800/80 border-zinc-700"
              }`}>
                {isPro ? "Pro" : "Free"}
              </span>
              <span className="text-[10px] text-zinc-500">
                {user.usage.dailyRemaining}/{user.usage.dailyLimit} left today
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              setOpen(false);
              if (onGoPro) {
                onGoPro();
                return;
              }
              window.location.href = "/go-pro";
            }}
            className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            Go Pro
          </button>
          {user.billingEnabled && (
            <button
              onClick={() => {
                setOpen(false);
                void (isPro ? openPortal() : startUpgrade());
              }}
              className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              {busy ? "Please wait…" : isPro ? "Manage plan" : "Upgrade to Pro"}
            </button>
          )}
          <button
            onClick={() => {
              setOpen(false);
              void refreshUser();
            }}
            className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            Refresh account
          </button>
          <button
            onClick={() => { setOpen(false); logout(); }}
            className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            Sign out
          </button>
          {error && <p className="px-3 py-2 text-[10px] text-red-300 border-t border-zinc-800/60">{error}</p>}
        </div>
      )}
    </div>
  );
}
