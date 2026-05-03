import { useEffect, useState } from "react";
import { requestPasswordReset, resetPassword, setToken } from "../../services/authApi";
import { fetchMe } from "../../services/authApi";
import { useAuth } from "../../context/AuthContext";

type Step = "email" | "code";

export function ForgotPasswordModal({
  open,
  initialEmail = "",
  onClose,
  onBackToSignIn,
}: {
  open: boolean;
  initialEmail?: string;
  onClose: () => void;
  onBackToSignIn: () => void;
}) {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  // Refresh user state without going through useAuth's setUser directly
  // (we don't have access to it — we re-trigger /me via fetchMe and let the
  // provider's polling/initial-load reconcile on next mount via reload).
  const { } = useAuth();

  useEffect(() => {
    if (open) {
      setStep("email");
      setEmail(initialEmail);
      setCode("");
      setNewPassword("");
      setError(null);
      setInfo(null);
    }
  }, [open, initialEmail]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await requestPasswordReset(email);
      setInfo(`If an account exists for ${email}, a 6-digit code has been sent. Enter it below.`);
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset code");
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await resetPassword(email, code, newPassword);
      if (res.token) {
        setToken(res.token);
        // Trigger a fetch so any other parts of the app see the user immediately.
        await fetchMe().catch(() => {});
        // Easiest "now you're logged in" UX: reload so AuthProvider picks it up.
        window.location.reload();
        return;
      }
      setInfo("Password updated. You can now sign in.");
      setTimeout(onBackToSignIn, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password");
    } finally {
      setBusy(false);
    }
  }

  // Local cooldown so users can't hammer the resend button. Backend already
  // invalidates prior codes whenever a new one is issued, so the UX is clear:
  // hit resend → previous code stops working.
  const [resendCooldown, setResendCooldown] = useState(0);
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  async function resendCode() {
    if (resendCooldown > 0 || busy) return;
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      await requestPasswordReset(email);
      setInfo(`A fresh code was sent to ${email}. Any previous code is now invalid.`);
      setCode("");
      setResendCooldown(30); // 30s before they can hit it again
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend code");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
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
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>
            </svg>
          </div>

          <h2 className="text-lg font-semibold text-zinc-100 leading-tight">
            {step === "email" ? "Reset your password" : "Enter your code"}
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            {step === "email"
              ? "We'll email a 6-digit code to confirm it's you."
              : "Check your inbox for the code we just sent."}
          </p>
        </div>

        <div className="px-7 py-6">
          {info && (
            <div className="mb-4 text-xs text-violet-300 bg-violet-500/10 border border-violet-500/25 rounded-md px-3 py-2">{info}</div>
          )}
          {error && (
            <div className="mb-4 text-xs text-red-300 bg-red-950/50 border border-red-800/40 rounded-md px-3 py-2">{error}</div>
          )}

          {step === "email" ? (
            <form onSubmit={submitEmail} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="px-3 py-2.5 rounded-md bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20"
                  placeholder="you@example.com"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="mt-2 w-full px-4 py-2.5 rounded-md text-xs font-bold uppercase tracking-wider bg-violet-500 hover:bg-violet-400 text-white disabled:opacity-60 transition-colors shadow-[0_4px_14px_rgba(124,58,237,0.35)]"
              >
                {busy ? "Sending…" : "Send code"}
              </button>
              <button
                type="button"
                onClick={onBackToSignIn}
                className="text-[10px] text-zinc-500 hover:text-zinc-300 text-center mt-1"
              >
                ← Back to sign in
              </button>
            </form>
          ) : (
            <form onSubmit={submitCode} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">6-Digit Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  required
                  autoFocus
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="px-3 py-2.5 rounded-md bg-zinc-950 border border-zinc-800 text-lg font-mono tracking-[0.5em] text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 text-center"
                  placeholder="000000"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">New Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="px-3 py-2.5 rounded-md bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20"
                  placeholder="8+ characters"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="mt-2 w-full px-4 py-2.5 rounded-md text-xs font-bold uppercase tracking-wider bg-violet-500 hover:bg-violet-400 text-white disabled:opacity-60 transition-colors shadow-[0_4px_14px_rgba(124,58,237,0.35)]"
              >
                {busy ? "Resetting…" : "Reset password"}
              </button>

              <div className="flex items-center justify-between mt-1">
                <button
                  type="button"
                  onClick={() => setStep("email")}
                  className="text-[10px] text-zinc-500 hover:text-zinc-300"
                >
                  ← Wrong email?
                </button>
                <button
                  type="button"
                  onClick={resendCode}
                  disabled={resendCooldown > 0 || busy}
                  className="text-[10px] text-violet-400 hover:text-violet-300 disabled:text-zinc-600 disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Didn't get it? Resend code"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
