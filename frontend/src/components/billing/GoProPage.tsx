import { useState } from "react";
import { LogoWordmark } from "../ui/Logo";
import { UserMenu } from "../auth/UserMenu";
import { useAuth } from "../../context/AuthContext";
import { AuthModal } from "../auth/AuthModal";
import { createCheckoutSession, createPortalSession } from "../../services/authApi";

export function GoProPage() {
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [busy, setBusy] = useState<"upgrade" | "manage" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isPro = user?.plan === "pro";

  async function handlePrimaryAction() {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    setError(null);
    setBusy(isPro ? "manage" : "upgrade");
    try {
      const session = isPro ? await createPortalSession() : await createCheckoutSession();
      window.location.href = session.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open billing");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-sm">
        <div className="px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <LogoWordmark size={20} />
            <span className="hidden sm:block text-zinc-700">/</span>
            <span className="text-sm font-semibold text-zinc-300 truncate">Go Pro</span>
          </div>
          {user && <UserMenu />}
        </div>
      </header>

      <main className="px-4 sm:px-6 py-10">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-[11px] font-semibold text-violet-400 uppercase tracking-[0.2em]">Plans</p>
            <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-zinc-100">Choose the plan that fits your workflow</h1>
            <p className="mt-3 text-sm sm:text-base text-zinc-400">
              Start free and upgrade only when you need higher daily limits.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-zinc-100">Free</h2>
                <span className="text-[11px] font-semibold text-zinc-300 bg-zinc-800 border border-zinc-700 rounded-full px-2.5 py-1">
                  Included
                </span>
              </div>
              <p className="mt-3 text-3xl font-bold text-zinc-100">$0<span className="text-sm text-zinc-500 font-medium">/month</span></p>
              <ul className="mt-5 space-y-2 text-sm text-zinc-300">
                <li>2 analyses per day</li>
                <li>No email required</li>
                <li>History when signed in</li>
              </ul>
            </section>

            <section className="rounded-xl border border-violet-500/30 bg-violet-500/8 p-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-zinc-100">Pro</h2>
                <span className="text-[11px] font-semibold text-violet-300 bg-violet-500/15 border border-violet-500/25 rounded-full px-2.5 py-1">
                  30 daily analyses
                </span>
              </div>
              <p className="mt-3 text-3xl font-bold text-zinc-100">$4.99<span className="text-sm text-zinc-400 font-medium">/month</span></p>
              <ul className="mt-5 space-y-2 text-sm text-zinc-200">
                <li>30 analyses per day</li>
                <li>Saved account history</li>
                <li>Shareable report links</li>
              </ul>
              <button
                onClick={() => void handlePrimaryAction()}
                disabled={busy !== null}
                className="mt-6 inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-semibold text-white bg-violet-500 hover:bg-violet-400 disabled:opacity-60 transition-colors"
              >
                {busy
                  ? "Please wait…"
                  : !user
                    ? "Sign in to continue"
                    : isPro
                      ? "Manage subscription"
                      : "Upgrade to Pro"}
              </button>
              {error && <p className="mt-3 text-xs text-red-300">{error}</p>}
            </section>
          </div>
        </div>
      </main>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
