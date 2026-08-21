import { useEffect } from "react";
import { LogoWordmark } from "../ui/Logo";
import { SiteFooter } from "../ui/SiteFooter";
import { URLInput } from "../UrlInput/UrlInput";
import { UserMenu } from "../auth/UserMenu";
import { AuthModal } from "../auth/AuthModal";
import { HistoryModal } from "../auth/HistoryModal";
import { useTheme } from "../../context/useTheme";
import type { AuthUser, UsageSummary } from "../../services/authApi";
import { onAnalyticsConsentChange, trackOnce } from "../../lib/analytics";

const EXAMPLE_URLS = ["stripe.com", "github.com", "vercel.com", "linear.app"];

export function LandingPage({
  user,
  usage,
  onAnalyze,
  authOpen,
  setAuthOpen,
  historyOpen,
  setHistoryOpen,
}: {
  user: AuthUser | null;
  usage: UsageSummary | null;
  onAnalyze: (url: string, source?: "landing" | "example" | "report") => void;
  authOpen: boolean;
  setAuthOpen: (v: boolean) => void;
  historyOpen: boolean;
  setHistoryOpen: (v: boolean) => void;
}) {
  const { theme, toggle } = useTheme();

  useEffect(() => {
    const recordLandingView = () => trackOnce("landing_view", "landing_view");
    recordLandingView();
    return onAnalyticsConsentChange(recordLandingView);
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Striped grid backdrop + film-grain noise — replaces the gradient blobs */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[820px] hero-grid" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[820px] hero-noise" aria-hidden="true" />

      <div className="relative z-10">
        {/* Top bar */}
        <header className="sticky top-0 backdrop-blur-md bg-zinc-950/40 border-b border-zinc-900/80 px-4 sm:px-6 h-14 flex items-center justify-between">
          <LogoWordmark size={20} />
          <div className="flex items-center gap-2">
            <button
              onClick={toggle}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              className="flex items-center justify-center w-7 h-7 rounded-md text-zinc-400 hover:text-zinc-200 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 transition-colors"
            >
              {theme === "dark" ? (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>
            {user ? (
              <>
                <button
                  onClick={() => setHistoryOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-300 hover:text-zinc-100 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 transition-colors"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  History
                </button>
                <UserMenu />
              </>
            ) : (
              <button
                onClick={() => setAuthOpen(true)}
                className="px-3 py-1.5 rounded-md text-xs font-medium text-zinc-300 hover:text-zinc-100 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 transition-colors"
              >
                Sign in
              </button>
            )}
          </div>
        </header>

        {/* Hero */}
        <section className="px-4 sm:px-6 pt-16 sm:pt-24 pb-12">
          <div className="max-w-3xl mx-auto fade-up">
            <div className="mb-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[11px] font-medium text-zinc-500">
              <span>Free</span>
              <span className="h-1 w-1 rounded-full bg-zinc-700" aria-hidden="true" />
              <span>No signup required</span>
              {usage && (
                <>
                  <span className="h-1 w-1 rounded-full bg-zinc-700" aria-hidden="true" />
                  <span className="inline-flex items-center gap-1.5 text-zinc-400">
                    <span className={`h-1.5 w-1.5 rounded-full ${usage.plan === "owner" || usage.dailyRemaining > 0 ? "bg-emerald-400" : "bg-amber-400"}`} />
                    {usage.plan === "owner" ? "∞" : `${usage.dailyRemaining}/${usage.dailyLimit}`} analyses left today
                  </span>
                </>
              )}
            </div>

            <h1 className="text-center text-4xl sm:text-6xl font-bold tracking-tight leading-[1.05]">
              <span className="text-zinc-100">Understand any website </span>
              <span className="text-violet-300">
                in seconds.
              </span>
            </h1>

            <p className="mt-6 text-center text-zinc-400 text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
              Start with 5 free analyses a day without signing in. Create an account to save your audit history.
            </p>

            {/* URL input */}
            <div className="mt-10">
              <URLInput onAnalyze={onAnalyze} isLoading={false} />
            </div>

            {/* Example URL chips */}
            <div className="mt-4 flex flex-wrap justify-center gap-1.5">
              <span className="text-[11px] text-zinc-500 self-center mr-1">Try:</span>
              {EXAMPLE_URLS.map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => onAnalyze(`https://${u}`, "example")}
                  className="text-[11px] px-2.5 py-1 rounded-full text-zinc-400 hover:text-violet-300 bg-zinc-900/60 hover:bg-violet-500/10 border border-zinc-800 hover:border-violet-500/30 transition-colors"
                >
                  {u}
                </button>
              ))}
            </div>

            {user ? (
              <p className="mt-8 text-center text-xs text-zinc-500">
                Signed in as <span className="text-zinc-300">{user.email}</span> ·{" "}
                <button
                  onClick={() => setHistoryOpen(true)}
                  className="text-violet-400 hover:text-violet-300 underline underline-offset-2"
                >
                  view your audit history
                </button>
              </p>
            ) : (
              <p className="mt-8 text-center text-xs text-zinc-500">
                <button onClick={() => setAuthOpen(true)} className="text-violet-400 hover:text-violet-300 font-medium">
                  Create an account
                </button>{" "}
                to save your audit history.
              </p>
            )}
          </div>
        </section>

        {/* Analysis boundary: sets expectations before a visitor spends a quota. */}
        <section className="px-4 sm:px-6 pb-20" aria-labelledby="analysis-boundaries-heading">
          <div className="mx-auto max-w-4xl rounded-2xl border border-zinc-800/80 bg-zinc-900/35 p-6 sm:p-8">
            <div className="max-w-2xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-400">Set expectations</p>
              <h2 id="analysis-boundaries-heading" className="mt-2 text-2xl font-bold text-zinc-100">What we can analyze</h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">We analyze the public, reachable page you submit and turn its HTML, headers, metadata, and optional performance data into a practical audit.</p>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-emerald-500/15 bg-emerald-500/[0.04] p-4">
                <h3 className="text-sm font-semibold text-emerald-300">Works best for</h3>
                <ul className="mt-3 space-y-2 text-xs leading-relaxed text-zinc-400">
                  <li>• Public landing pages, blogs, docs, stores, and marketing sites</li>
                  <li>• HTML, titles, metadata, links, headings, images, scripts, and visible content</li>
                  <li>• Lighthouse/PageSpeed scores when Google can reach the page</li>
                </ul>
              </div>
              <div className="rounded-xl border border-amber-500/15 bg-amber-500/[0.04] p-4">
                <h3 className="text-sm font-semibold text-amber-300">Known limitations</h3>
                <ul className="mt-3 space-y-2 text-xs leading-relaxed text-zinc-400">
                  <li>• Private, login-only, paywalled, bot-protected, or blocked pages may fail</li>
                  <li>• Client-rendered, infinite-scroll, and interactive states can be incomplete</li>
                  <li>• Performance and third-party signals may be unavailable or vary by run</li>
                </ul>
              </div>
            </div>
            <p className="mt-5 text-[11px] leading-relaxed text-zinc-600">We never ask for credentials or submit forms on your behalf. See the <a className="text-zinc-400 underline underline-offset-2 hover:text-zinc-200" href="/terms">Terms</a> for the full scope and the <a className="text-zinc-400 underline underline-offset-2 hover:text-zinc-200" href="/privacy">Privacy Policy</a> for data handling.</p>
          </div>
        </section>

        {/* How it works */}
        <section className="px-4 sm:px-6 pb-20">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <p className="text-[11px] font-semibold text-violet-400 uppercase tracking-[0.2em]">How it works</p>
              <h3 className="mt-2 text-2xl sm:text-3xl font-bold text-zinc-100">From URL to insights in three steps</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { n: "01", title: "Paste any URL", desc: "Public site, landing page, blog, ecommerce — anything reachable on the open web." },
                { n: "02", title: "Wait a few seconds", desc: "We fetch the page, run Google PageSpeed, and analyze 50+ signals in parallel." },
                { n: "03", title: "Get a full report", desc: "Read the breakdown by section, copy any insight, save it to history, and share public links on Pro." },
              ].map((s) => (
                <div key={s.n} className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5">
                  <span className="text-[10px] font-mono font-semibold text-violet-400">{s.n}</span>
                  <h4 className="mt-2 text-sm font-semibold text-zinc-100">{s.title}</h4>
                  <p className="mt-1 text-xs text-zinc-500 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <SiteFooter />
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      {historyOpen && (
        <HistoryModal
          open
          onClose={() => setHistoryOpen(false)}
          onOpenAudit={(id) => { window.location.href = `/report/${id}`; }}
        />
      )}
    </div>
  );
}
