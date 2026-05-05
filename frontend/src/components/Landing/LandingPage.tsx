import { LogoWordmark } from "../ui/Logo";
import { URLInput } from "../UrlInput/UrlInput";
import { UserMenu } from "../auth/UserMenu";
import { AuthModal } from "../auth/AuthModal";
import { HistoryModal } from "../auth/HistoryModal";
import type { AuthUser, UsageSummary } from "../../services/authApi";

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
  onAnalyze: (url: string) => void;
  authOpen: boolean;
  setAuthOpen: (v: boolean) => void;
  historyOpen: boolean;
  setHistoryOpen: (v: boolean) => void;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Ambient gradient blobs — purely decorative */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute top-[40%] -left-32 w-[400px] h-[400px] rounded-full bg-blue-600/8 blur-[100px]" />
        <div className="absolute top-[20%] -right-32 w-[400px] h-[400px] rounded-full bg-pink-500/5 blur-[100px]" />
      </div>

      <div className="relative z-10">
        {/* Top bar */}
        <header className="sticky top-0 backdrop-blur-md bg-zinc-950/40 border-b border-zinc-900/80 px-4 sm:px-6 h-14 flex items-center justify-between">
          <LogoWordmark size={20} />
          <div className="flex items-center gap-2">
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
            {/* Pill */}
            <div className="flex justify-center mb-6">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-medium text-violet-300 bg-violet-500/10 border border-violet-500/25">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                Free · No signup required
              </span>
            </div>

            {usage && (
              <div className="flex justify-center mb-3">
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-medium text-zinc-300 bg-zinc-900/70 border border-zinc-800">
                  <span className={`w-1.5 h-1.5 rounded-full ${usage.dailyRemaining > 0 ? "bg-emerald-400" : "bg-amber-400"}`} />
                  {usage.dailyRemaining}/{usage.dailyLimit} analyses left today
                </span>
              </div>
            )}

            <h1 className="text-center text-4xl sm:text-6xl font-bold tracking-tight text-zinc-100 leading-[1.05]">
              Understand any website
            </h1>
            <h2 className="text-center text-4xl sm:text-6xl font-bold tracking-tight leading-[1.05] mt-1">
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                in seconds.
              </span>
            </h2>

            <p className="mt-6 text-center text-zinc-400 text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
              Start with 2 free analyses a day without signing in. Create an account to save history, then upgrade to Pro for 30 analyses a day at $4.99/month.
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
                  onClick={() => onAnalyze(`https://${u}`)}
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
                to save your audit history and unlock the paid Pro plan.
              </p>
            )}
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

        {/* Footer */}
        <footer className="px-4 sm:px-6 py-8 border-t border-zinc-900/80">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-zinc-600">
            <p>© {new Date().getFullYear()} Explain This Website</p>
            <div className="flex items-center gap-4">
              <a href="mailto:support@explainthewebsite.com" className="hover:text-zinc-400 transition-colors">Support</a>
              <a href="/api" className="hover:text-zinc-400 transition-colors">API</a>
              <a href="https://github.com/ahomsi0/explain-this-website" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-400 transition-colors">GitHub</a>
            </div>
          </div>
        </footer>
      </div>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      <HistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onOpenAudit={(id) => { window.location.href = `/report/${id}`; }}
      />
    </div>
  );
}
