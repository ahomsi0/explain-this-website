import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";

type Mode = "login" | "signup";

export function AuthModal({
  open,
  initialMode = "login",
  onClose,
}: {
  open: boolean;
  initialMode?: Mode;
  onClose: () => void;
}) {
  const { login, signup } = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Reset to caller's preferred tab whenever the modal is reopened.
  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setError(null);
      setEmail("");
      setPassword("");
    }
  }, [open, initialMode]);

  // ESC closes.
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") await login(email, password);
      else                  await signup(email, password);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar with violet accent */}
        <div className="relative px-7 pt-7 pb-5 border-b border-zinc-800/60">
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          <div className="w-10 h-10 rounded-lg bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-300 mb-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>

          <h2 className="text-lg font-semibold text-zinc-100 leading-tight">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            {mode === "login"
              ? "Sign in to access your audit history."
              : "Save your audits, share protected reports, get higher rate limits."}
          </p>
        </div>

        <div className="px-7 py-6">
          {/* Tab toggle */}
          <div className="flex gap-1 mb-5 p-1 rounded-md bg-zinc-950 border border-zinc-800">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 py-1.5 text-[11px] font-semibold uppercase tracking-wider rounded transition-colors ${
                mode === "login" ? "bg-violet-500/15 text-violet-300 shadow-[inset_0_0_0_1px_rgba(124,58,237,0.25)]" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode("signup")}
              className={`flex-1 py-1.5 text-[11px] font-semibold uppercase tracking-wider rounded transition-colors ${
                mode === "signup" ? "bg-violet-500/15 text-violet-300 shadow-[inset_0_0_0_1px_rgba(124,58,237,0.25)]" : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Sign up
            </button>
          </div>

          <form onSubmit={submit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Email</label>
              <div className="relative">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-md bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-colors"
                  placeholder="you@example.com"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Password</label>
              <div className="relative">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 rounded-md bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-colors"
                  placeholder={mode === "signup" ? "8+ characters" : "Your password"}
                />
              </div>
            </div>

            {error && (
              <div className="text-xs text-red-300 bg-red-950/50 border border-red-800/40 rounded-md px-3 py-2 flex items-start gap-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-2 w-full px-4 py-2.5 rounded-md text-xs font-bold uppercase tracking-wider bg-violet-500 hover:bg-violet-400 text-white disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-[0_4px_14px_rgba(124,58,237,0.35)]"
            >
              {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
            </button>

            <p className="text-[10px] text-zinc-600 text-center mt-1">
              {mode === "login" ? "New here? " : "Already have an account? "}
              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
                className="text-violet-400 hover:text-violet-300 font-semibold"
              >
                {mode === "login" ? "Create one" : "Sign in"}
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
