import { useState } from "react";
import { LogoWordmark } from "../ui/Logo";
import { UserMenu } from "../auth/UserMenu";
import { useAuth } from "../../context/AuthContext";
import { AuthModal } from "../auth/AuthModal";
import { createCheckoutSession, cancelSubscription } from "../../services/authApi";

type Interval = "monthly" | "yearly";

const MONTHLY_PRICE = "$2.99";
const YEARLY_PRICE  = "$24.99";
const FREE_LIMIT    = 5;
const PRO_LIMIT     = 50;

export function GoProPage() {
  const { user } = useAuth();
  const [authOpen,  setAuthOpen]  = useState(false);
  const [interval,  setInterval]  = useState<Interval>("monthly");
  const [busy,      setBusy]      = useState<"upgrade" | "cancel" | null>(null);
  const [error,     setError]     = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);
  const isPro = user?.plan === "pro";

  async function handleUpgrade() {
    if (!user) { setAuthOpen(true); return; }
    setError(null);
    setBusy("upgrade");
    try {
      const session = await createCheckoutSession(interval);
      window.location.href = session.url;
      // Keep busy=true after redirect — page is navigating away
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout");
      setBusy(null);
    }
  }

  async function handleCancel() {
    if (!confirm("Cancel your Pro subscription? You'll keep access until the end of your billing period.")) return;
    setError(null);
    setBusy("cancel");
    try {
      await cancelSubscription();
      setCancelled(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel subscription");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-sm">
        <div className="px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => { window.location.href = "/"; }}
              className="inline-flex items-center justify-center w-8 h-8 rounded-md text-zinc-400 hover:text-zinc-100 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 transition-colors"
              aria-label="Back to home"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
            </button>
            <LogoWordmark size={20} />
            <span className="hidden sm:block text-zinc-700">/</span>
            <span className="text-sm font-semibold text-zinc-300 truncate">Go Pro</span>
          </div>
          {user && <UserMenu />}
        </div>
      </header>

      <main className="px-4 sm:px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <p className="text-[11px] font-semibold text-violet-400 uppercase tracking-[0.2em]">Plans</p>
            <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-zinc-100">Simple, honest pricing</h1>
            <p className="mt-3 text-sm sm:text-base text-zinc-400">
              Start free. Upgrade when you need more.
            </p>

            {/* Monthly / Yearly toggle */}
            <div className="mt-6 inline-flex items-center gap-1 p-1 rounded-lg bg-zinc-900 border border-zinc-800">
              {(["monthly", "yearly"] as Interval[]).map(iv => (
                <button
                  key={iv}
                  type="button"
                  onClick={() => setInterval(iv)}
                  className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-colors capitalize ${
                    interval === iv
                      ? "bg-violet-500 text-white"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {iv}
                  {iv === "yearly" && (
                    <span className="ml-1.5 text-[9px] font-bold text-emerald-400">−30%</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {/* Free tier */}
            <section className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-6">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-100">Free</h2>
                  <p className="text-3xl font-bold text-zinc-100 mt-2">
                    $0<span className="text-sm text-zinc-500 font-medium">/month</span>
                  </p>
                </div>
                {!isPro && (
                  <span className="text-[11px] font-semibold text-zinc-300 bg-zinc-800 border border-zinc-700 rounded-full px-2.5 py-1">
                    Current plan
                  </span>
                )}
              </div>
              <ul className="mt-5 space-y-1.5 text-sm text-zinc-400">
                <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-zinc-600 shrink-0" />{FREE_LIMIT} analyses per day</li>
                <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-zinc-600 shrink-0" />No email required</li>
                <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-zinc-600 shrink-0" />History when signed in</li>
              </ul>
            </section>

            {/* Pro tier */}
            <section className="rounded-xl border border-violet-500/30 bg-violet-500/5 p-6">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-lg font-semibold text-zinc-100">Pro</h2>
                  <div className="mt-2 flex items-baseline gap-2">
                    <p className="text-3xl font-bold text-zinc-100">
                      {interval === "yearly" ? YEARLY_PRICE : MONTHLY_PRICE}
                    </p>
                    <span className="text-sm text-zinc-400 font-medium">
                      /{interval === "yearly" ? "year" : "month"}
                    </span>
                  </div>
                  {interval === "yearly" && (
                    <p className="mt-1 text-[11px] text-emerald-400 font-medium">
                      ~$2.08/month · save $10.89 vs monthly
                    </p>
                  )}
                </div>
                <span className="text-[11px] font-semibold text-violet-300 bg-violet-500/15 border border-violet-500/25 rounded-full px-2.5 py-1">
                  {PRO_LIMIT} analyses/day
                </span>
              </div>

              <ul className="mt-5 space-y-1.5 text-sm text-zinc-200">
                <li className="flex items-center gap-2">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400 shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
                  {PRO_LIMIT} analyses per day
                </li>
                <li className="flex items-center gap-2">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400 shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
                  Saved audit history
                </li>
                <li className="flex items-center gap-2">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400 shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
                  Shareable report links
                </li>
              </ul>

              {cancelled ? (
                <p className="mt-6 text-sm text-emerald-400">
                  Subscription cancelled. You'll keep Pro access until the end of your billing period.
                </p>
              ) : isPro ? (
                <div className="mt-6 flex items-center gap-3 flex-wrap">
                  <span className="text-sm text-emerald-400 font-medium">✓ You're on Pro</span>
                  <button
                    onClick={() => void handleCancel()}
                    disabled={busy !== null}
                    className="text-xs text-zinc-500 hover:text-red-400 underline underline-offset-2 transition-colors disabled:opacity-50"
                  >
                    {busy === "cancel" ? "Cancelling…" : "Cancel subscription"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => void handleUpgrade()}
                  disabled={busy !== null}
                  className="mt-6 inline-flex items-center justify-center px-5 py-2.5 rounded-md text-sm font-semibold text-white bg-violet-500 hover:bg-violet-400 disabled:opacity-60 transition-colors"
                >
                  {busy === "upgrade"
                    ? "Please wait…"
                    : !user
                      ? "Sign in to upgrade"
                      : `Upgrade to Pro — ${interval === "yearly" ? YEARLY_PRICE + "/yr" : MONTHLY_PRICE + "/mo"}`}
                </button>
              )}
              {error && <p role="alert" className="mt-3 text-xs text-red-300">{error}</p>}
            </section>
          </div>
        </div>
      </main>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}
