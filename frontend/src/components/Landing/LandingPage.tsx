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
            <div className="mb-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[11px] font-medium text-zinc-500">
              <span>Free</span>
              <span className="h-1 w-1 rounded-full bg-zinc-700" aria-hidden="true" />
              <span>No signup required</span>
              {usage && (
                <>
                  <span className="h-1 w-1 rounded-full bg-zinc-700" aria-hidden="true" />
                  <span
                    className="inline-flex items-center gap-1.5 text-zinc-400"
                    aria-label={
                      usage.plan === "owner"
                        ? "Unlimited analyses left today"
                        : `${usage.dailyRemaining} of ${usage.dailyLimit} analyses left today`
                    }
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${usage.plan === "owner" || usage.dailyRemaining > 0 ? "bg-emerald-400" : "bg-amber-400"}`} aria-hidden="true" />
                    <span aria-hidden="true">{usage.plan === "owner" ? "∞" : `${usage.dailyRemaining}/${usage.dailyLimit}`} analyses left today</span>
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

            {/* URL input with inline deep scan toggle */}
            <div className="mt-10">
              <URLInput
                onAnalyze={analyze}
                isLoading={false}
                deepScan={deepScan}
                onDeepScanToggle={() => setDeepScan((v) => !v)}
              />
            </div>

            {/* Recently analyzed sites */}
            {recents.length > 0 && (
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
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

        {/* Scope & limits — comparison table */}
        <section className="px-4 sm:px-6 pb-20" aria-labelledby="scope-heading">
          <div className="mx-auto max-w-4xl">
            <div className="text-center mb-8">
              <p className="text-[11px] font-semibold text-violet-400 uppercase tracking-[0.2em]">Scope &amp; limits</p>
              <h2 id="scope-heading" className="mt-2 text-2xl sm:text-3xl font-bold text-zinc-100">What this tool is built for</h2>
            </div>

            <div className="rounded-2xl border border-zinc-800 overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-2 bg-zinc-900/60 border-b border-zinc-800">
                <div className="px-5 py-3 text-[10px] font-bold tracking-[0.14em] uppercase text-emerald-400 border-r border-zinc-800">Works well for</div>
                <div className="px-5 py-3 text-[10px] font-bold tracking-[0.14em] uppercase text-amber-400">Known limits</div>
              </div>

              {[
                {
                  ok: "Public landing pages, blogs, docs & stores",
                  limit: "Login-only, paywalled, or bot-protected pages",
                },
                {
                  ok: "HTML, metadata, headings, images, links & scripts",
                  limit: "Client-rendered or infinite-scroll content (may be partial)",
                },
                {
                  ok: "Lighthouse / PageSpeed scores for reachable pages",
                  limit: "Performance scores can vary run-to-run or be unavailable",
                },
                {
                  ok: "Tech stack, security headers, open graph & structured data",
                  limit: "We never submit forms or use credentials on your behalf",
                },
              ].map((row, i) => (
                <div key={i} className="grid grid-cols-2 border-b border-zinc-800/50 last:border-0">
                  <div className="px-5 py-3 text-[11.5px] text-zinc-400 leading-relaxed flex items-start gap-2.5 border-r border-zinc-800/50 bg-zinc-900/30">
                    <svg className="shrink-0 mt-0.5 text-emerald-400" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    {row.ok}
                  </div>
                  <div className="px-5 py-3 text-[11.5px] text-zinc-400 leading-relaxed flex items-start gap-2.5 bg-zinc-900/20">
                    <svg className="shrink-0 mt-0.5 text-amber-400" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    {row.limit}
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-4 text-center text-[11px] text-zinc-600">
              See the <a className="text-zinc-400 underline underline-offset-2 hover:text-zinc-300 transition-colors" href="/terms">Terms</a> for full scope and the <a className="text-zinc-400 underline underline-offset-2 hover:text-zinc-300 transition-colors" href="/privacy">Privacy Policy</a> for data handling.
            </p>
          </div>
        </section>

        {/* How it works — verb pill steps */}
        <section className="px-4 sm:px-6 pb-20">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <p className="text-[11px] font-semibold text-violet-400 uppercase tracking-[0.2em]">How it works</p>
              <h2 className="mt-2 text-2xl sm:text-3xl font-bold text-zinc-100">URL in. Report out.</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-[3px]">
              {[
                { verb: "Paste", title: "Any public URL", desc: "Landing page, blog, store, docs — anything the open web can reach. No account needed." },
                { verb: "Analyze", title: "50+ signals in parallel", desc: "Page fetch, PageSpeed, and 20 scored sections — all running simultaneously in seconds." },
                { verb: "Act", title: "Every issue, fix included", desc: "Each flagged item links to a step-by-step repair guide. Save history or share links on Pro." },
              ].map((s, i) => (
                <div
                  key={s.verb}
                  className={`bg-zinc-900/50 border border-zinc-800 p-5 ${
                    i === 0 ? "rounded-t-xl sm:rounded-l-xl sm:rounded-tr-none" :
                    i === 2 ? "rounded-b-xl sm:rounded-r-xl sm:rounded-bl-none" : ""
                  }`}
                >
                  <span className="inline-block mb-3 px-2 py-0.5 rounded text-[9px] font-bold tracking-[0.12em] uppercase text-violet-300 bg-violet-500/10 border border-violet-500/20">
                    {s.verb}
                  </span>
                  <h4 className="text-sm font-bold text-zinc-100 mb-1.5">{s.title}</h4>
                  <p className="text-xs text-zinc-500 leading-relaxed">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
