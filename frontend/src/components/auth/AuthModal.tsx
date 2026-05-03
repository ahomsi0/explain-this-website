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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-lg border border-zinc-800 bg-zinc-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tab toggle */}
        <div className="flex gap-1 mb-5 p-1 rounded-md bg-zinc-950 border border-zinc-800">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 py-1.5 text-xs font-semibold uppercase tracking-wider rounded transition-colors ${
              mode === "login" ? "bg-violet-500/15 text-violet-300" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 py-1.5 text-xs font-semibold uppercase tracking-wider rounded transition-colors ${
              mode === "signup" ? "bg-violet-500/15 text-violet-300" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Sign up
          </button>
        </div>

        <h2 className="text-base font-semibold text-zinc-100 mb-1">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h2>
        <p className="text-xs text-zinc-500 mb-5">
          {mode === "login"
            ? "Sign in to access your audit history."
            : "Save your audits, share protected reports, get higher rate limits."}
        </p>

        <form onSubmit={submit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Email</label>
            <input
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="px-3 py-2 rounded-md bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-violet-500/40"
              placeholder="you@example.com"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="px-3 py-2 rounded-md bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-violet-500/40"
              placeholder={mode === "signup" ? "8+ characters" : "Your password"}
            />
          </div>

          {error && (
            <div className="text-xs text-red-400 bg-red-950/50 border border-red-800/40 rounded px-3 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="mt-1 px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider bg-violet-300 hover:bg-violet-200 text-violet-950 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}
