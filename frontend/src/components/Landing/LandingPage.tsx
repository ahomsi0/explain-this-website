import { useEffect } from "react";
import { URLInput } from "../UrlInput/UrlInput";
import type { AuthUser, UsageSummary } from "../../services/authApi";
import { onAnalyticsConsentChange, trackOnce } from "../../lib/analytics";

const EXAMPLE_URLS = ["stripe.com", "github.com", "vercel.com", "linear.app"];

export function LandingPage({
  user,
  usage,
  onAnalyze,
  setAuthOpen,
  setHistoryOpen,
}: {
  user: AuthUser | null;
  usage: UsageSummary | null;
  onAnalyze: (url: string, source?: "landing" | "example" | "report") => void;
  setAuthOpen: (v: boolean) => void;
  setHistoryOpen: (v: boolean) => void;
}) {

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
        {/* Universal header (logo, theme toggle, auth) comes from the app shell. */}

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
      </div>
    </div>
  );
}
