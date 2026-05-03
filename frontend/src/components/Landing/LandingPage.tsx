import { LogoWordmark } from "../ui/Logo";
import { URLInput } from "../UrlInput/UrlInput";
import { UserMenu } from "../auth/UserMenu";
import { AuthModal } from "../auth/AuthModal";
import { HistoryModal } from "../auth/HistoryModal";
import type { AuthUser } from "../../services/authApi";

const FEATURES = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
      </svg>
    ),
    title: "Tech Stack",
    desc: "Detect frameworks, CMS, analytics, CDNs, and platforms in seconds.",
    accent: "from-violet-500/20 to-violet-500/0",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
    title: "SEO Audit",
    desc: "13 critical SEO checks: meta tags, headings, canonicals, hreflang, more.",
    accent: "from-blue-500/20 to-blue-500/0",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
    ),
    title: "Performance",
    desc: "Real Core Web Vitals from Google PageSpeed Insights — mobile + desktop.",
    accent: "from-amber-500/20 to-amber-500/0",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
      </svg>
    ),
    title: "UX Review",
    desc: "Conversion signals, trust markers, mobile readiness, and friction points.",
    accent: "from-emerald-500/20 to-emerald-500/0",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    title: "Security",
    desc: "Header audit, HTTPS posture, CSP, HSTS, frame protection, and more.",
    accent: "from-red-500/20 to-red-500/0",
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
      </svg>
    ),
    title: "Domain Info",
    desc: "Registrar, age, DNS records, and freshness signals via RDAP.",
    accent: "from-indigo-500/20 to-indigo-500/0",
  },
];

const EXAMPLE_URLS = ["stripe.com", "github.com", "vercel.com", "linear.app"];

export function LandingPage({
  user,
  onAnalyze,
  authOpen,
  setAuthOpen,
  historyOpen,
  setHistoryOpen,
}: {
  user: AuthUser | null;
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
                <UserMenu onShowHistory={() => setHistoryOpen(true)} />
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

            <h1 className="text-center text-4xl sm:text-6xl font-bold tracking-tight text-zinc-100 leading-[1.05]">
              Understand any website
            </h1>
            <h2 className="text-center text-4xl sm:text-6xl font-bold tracking-tight leading-[1.05] mt-1">
              <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-pink-400 bg-clip-text text-transparent">
                in seconds.
              </span>
            </h2>

            <p className="mt-6 text-center text-zinc-400 text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
              Drop a URL and get an instant audit: tech stack, SEO checks, UX signals, real performance metrics, and recommendations you can act on.
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
                to save your audits, access them anytime, and get higher rate limits.
              </p>
            )}
          </div>
        </section>

        {/* Feature grid */}
        <section className="px-4 sm:px-6 pb-16">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-8">
              <p className="text-[11px] font-semibold text-violet-400 uppercase tracking-[0.2em]">What you'll get</p>
              <h3 className="mt-2 text-2xl sm:text-3xl font-bold text-zinc-100">Everything you need to evaluate a site</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="group relative rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-5 hover:border-zinc-700 transition-colors overflow-hidden"
                >
                  <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${f.accent} blur-2xl opacity-0 group-hover:opacity-100 transition-opacity`} />
                  <div className="relative">
                    <div className="w-9 h-9 rounded-lg bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-violet-300 mb-3">
                      {f.icon}
                    </div>
                    <h4 className="text-sm font-semibold text-zinc-100 mb-1">{f.title}</h4>
                    <p className="text-xs text-zinc-500 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
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
                { n: "03", title: "Get a full report", desc: "Read the breakdown by section, copy any insight, share a public link, save to history." },
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
