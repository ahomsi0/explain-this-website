import { useEffect, useState } from "react";
import { URLInput } from "../UrlInput/UrlInput";
import { fetchAudits, type AuthUser, type UsageSummary } from "../../services/authApi";
import type { AnalyzeOptions } from "../../services/analyzeApi";
import { getRecentUrls } from "../../lib/recentUrls";
import { onAnalyticsConsentChange, trackOnce } from "../../lib/analytics";

export function LandingPage({
  user,
  usage,
  onAnalyze,
  setAuthOpen,
}: {
  user: AuthUser | null;
  usage: UsageSummary | null;
  onAnalyze: (url: string, source?: "landing" | "example" | "report", opts?: AnalyzeOptions) => void;
  setAuthOpen: (v: boolean) => void;
}) {
  const [deepScan, setDeepScan] = useState(false);
  // Local recents render immediately; signed-in users get their authoritative
  // server history merged in below.
  const [recents, setRecents] = useState<string[]>(() => getRecentUrls().slice(0, 4));

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetchAudits()
      .then((items) => {
        if (cancelled) return;
        const local = getRecentUrls();
        const seen = new Set(items.map((i) => i.url.toLowerCase()));
        const merged = [...items.map((i) => i.url), ...local.filter((u) => !seen.has(u.toLowerCase()))];
        setRecents(merged.slice(0, 4));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [user]);

  const analyze = (url: string, source?: "landing" | "example" | "report") =>
    onAnalyze(url, source, deepScan ? { deep: true } : undefined);

  const chipLabel = (raw: string) => {
    try {
      const u = new URL(raw);
      return u.hostname.replace(/^www\./, "") + (u.pathname !== "/" ? u.pathname : "");
    } catch {
      return raw;
    }
  };

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
            <div className="mb-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[11px]">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-500/25 bg-violet-500/10 font-medium text-violet-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" aria-hidden="true" />
                Free · No signup required
              </span>
              {usage && (
                <span className="inline-flex items-center gap-1.5 text-zinc-400">
                  <span className={`h-1.5 w-1.5 rounded-full ${usage.plan === "owner" || usage.dailyRemaining > 0 ? "bg-emerald-400" : "bg-amber-400"}`} aria-hidden="true" />
                  {usage.plan === "owner" ? "∞" : `${usage.dailyRemaining}/${usage.dailyLimit}`} analyses left today
                </span>
              )}
            </div>

            <h1 className="text-center text-4xl sm:text-6xl font-bold tracking-tight leading-[1.04]">
              <span className="text-zinc-100">Instant clarity on </span>
              <span className="text-violet-300">any website.</span>
            </h1>

            <p className="mt-6 text-center text-zinc-400 text-base sm:text-lg leading-relaxed max-w-xl mx-auto">
              Start with 5 free analyses a day without signing in. Create an account to save your audit history.
            </p>

            {/* URL input */}
            <div className="mt-10">
              <URLInput onAnalyze={analyze} isLoading={false} />
            </div>

            {/* Deep scan toggle */}
            <div className="mt-3 flex justify-center">
              <button
                type="button"
                role="switch"
                aria-checked={deepScan}
                onClick={() => setDeepScan((v) => !v)}
                title="Also audit up to 4 key subpages (pricing, about, contact…)"
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium transition-all ${
                  deepScan
                    ? "border-violet-500/50 bg-violet-500/15 text-violet-200 shadow-[0_0_12px_-2px_rgba(124,58,237,0.4)]"
                    : "border-zinc-800 bg-zinc-900/60 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                }`}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill={deepScan ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
                Deep scan
                <span className={deepScan ? "text-violet-400/80" : "text-zinc-600"}>
                  · pricing, about, contact…
                </span>
              </button>
            </div>

            {/* ✦ Feature chips — show what the report covers */}
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {[
                { label: "SEO audit",           color: "bg-emerald-400" },
                { label: "Performance score",   color: "bg-blue-400" },
                { label: "Tech stack",          color: "bg-violet-400" },
                { label: "Content analysis",    color: "bg-orange-400" },
                { label: "Security headers",    color: "bg-pink-400" },
                { label: "Conversion signals",  color: "bg-teal-400" },
              ].map(({ label, color }) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] text-zinc-500 bg-zinc-900/60 border border-zinc-800"
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${color} shrink-0`} aria-hidden="true" />
                  {label}
                </span>
              ))}
            </div>

            {/* Recently analyzed sites */}
            {recents.length > 0 && (
              <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                <span className="text-[11px] text-zinc-500 self-center mr-1">Recent:</span>
                {recents.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => analyze(u, "example")}
                    title={u}
                    className="max-w-[220px] truncate text-[11px] px-2.5 py-1 rounded-full text-zinc-400 hover:text-violet-300 bg-zinc-900/60 hover:bg-violet-500/10 border border-zinc-800 hover:border-violet-500/30 transition-colors"
                  >
                    {chipLabel(u)}
                  </button>
                ))}
              </div>
            )}

            {user ? (
              <p className="mt-8 text-center text-xs text-zinc-500">
                Signed in as <span className="text-zinc-300">{user.email}</span> ·{" "}
                <a
                  href="/history"
                  className="text-violet-400 hover:text-violet-300 underline underline-offset-2"
                >
                  view your audit history
                </a>
              </p>
            ) : (
              <p className="mt-8 text-center text-xs text-zinc-500">
                <button onClick={() => setAuthOpen(true)} className="text-violet-400 hover:text-violet-300 font-medium">
                  Create an account
                </button>{" "}
                to save your audit history.
              </p>
            )}

            <p className="mt-3 text-center text-xs text-zinc-600">
              Every issue we flag comes with a repair guide —{" "}
              <a href="/guides" className="text-zinc-400 hover:text-violet-300 underline underline-offset-2 transition-colors">
                browse the fix guides
              </a>.
            </p>
          </div>
        </section>

        {/* ✦ "What you get" — sample output cards */}
        <section className="px-4 sm:px-6 pb-20" aria-labelledby="what-you-get-heading">
          <div className="mx-auto max-w-4xl">
            <div className="text-center mb-10">
              <p className="text-[11px] font-semibold text-violet-400 uppercase tracking-[0.2em]">What you get</p>
              <h2 id="what-you-get-heading" className="mt-2 text-2xl sm:text-3xl font-bold text-zinc-100">
                A 20-section audit, ready in seconds
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              {/* SEO preview card */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-emerald-500/[0.04] border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400" aria-hidden="true">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <span className="text-xs font-semibold text-zinc-200">SEO Audit</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-400">84/100</span>
                </div>
                <div className="p-4 flex flex-col gap-2.5">
                  {[
                    { label: "Title tag",        pct: 100, color: "bg-emerald-500", pass: true  },
                    { label: "Meta description", pct:  90, color: "bg-emerald-500", pass: true  },
                    { label: "H1 heading",       pct:  58, color: "bg-amber-500",   pass: false },
                    { label: "Image alt tags",   pct:  30, color: "bg-red-500",     pass: false },
                  ].map(({ label, pct, color, pass }) => (
                    <div key={label}>
                      <div className="flex justify-between mb-1">
                        <span className="text-[10px] text-zinc-500">{label}</span>
                        <span className={`text-[10px] font-semibold ${pass ? "text-emerald-400" : pct >= 50 ? "text-amber-400" : "text-red-400"}`}>
                          {pass ? "Pass" : pct >= 50 ? "Warn" : "Fail"}
                        </span>
                      </div>
                      <div className="h-1 rounded-full bg-zinc-800 overflow-hidden">
                        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Performance preview card */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 bg-amber-500/[0.04] border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400" aria-hidden="true">
                      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                    </svg>
                    <span className="text-xs font-semibold text-zinc-200">Performance</span>
                  </div>
                  <span className="text-xs font-bold text-amber-400">71</span>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[
                      { val: "1.2s", lbl: "LCP", color: "text-emerald-400" },
                      { val: "3.1s", lbl: "FCP", color: "text-amber-400"  },
                      { val: "0.05", lbl: "CLS", color: "text-emerald-400" },
                    ].map(({ val, lbl, color }) => (
                      <div key={lbl} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-2 text-center">
                        <div className={`text-sm font-bold ${color}`}>{val}</div>
                        <div className="text-[9px] text-zinc-600 uppercase tracking-wider mt-0.5">{lbl}</div>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-relaxed">
                    <span className="text-amber-400 font-semibold">Fix: </span>
                    First Contentful Paint is slow. Defer non-critical scripts.
                  </p>
                </div>
              </div>

              {/* Tech Stack preview card */}
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 bg-violet-500/[0.04] border-b border-zinc-800">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400" aria-hidden="true">
                    <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
                  </svg>
                  <span className="text-xs font-semibold text-zinc-200">Tech Stack</span>
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {[
                      { name: "React",      color: "text-blue-300    bg-blue-500/10    border-blue-500/20"    },
                      { name: "Next.js",    color: "text-emerald-300 bg-emerald-500/10 border-emerald-500/20" },
                      { name: "Stripe",     color: "text-amber-300   bg-amber-500/10   border-amber-500/20"   },
                      { name: "Vercel",     color: "text-pink-300    bg-pink-500/10    border-pink-500/20"    },
                      { name: "TypeScript", color: "text-violet-300  bg-violet-500/10  border-violet-500/20"  },
                      { name: "+6 more",   color: "text-zinc-400    bg-zinc-800        border-zinc-700"       },
                    ].map(({ name, color }) => (
                      <span key={name} className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${color}`}>
                        {name}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-relaxed">
                    Modern React/Next.js stack on Vercel. TypeScript detected — good for maintainability.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-center text-[11px] text-zinc-600">
              + 17 more sections: AI Summary, Colors, Images, Fonts, Security, Conversion, and more.
            </p>
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
              <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-zinc-100">From URL to insights in three steps</h2>
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
