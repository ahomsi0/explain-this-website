import { useEffect, useState } from "react";
import { URLInput } from "../UrlInput/UrlInput";
import { fetchAudits, type AuthUser, type UsageSummary } from "../../services/authApi";
import type { AnalyzeOptions } from "../../services/analyzeApi";
import { getRecentUrls } from "../../lib/recentUrls";
import { onAnalyticsConsentChange, trackOnce } from "../../lib/analytics";

type Tag = "FAIL" | "WARN" | "PASS" | "STACK";

const SAMPLE_FINDINGS: { tag: Tag; text: string; category: string; guide?: string }[] = [
  { tag: "FAIL", text: "Hero image is 2.3 MB, LCP 4.1 s on mobile", category: "Performance", guide: "lcp" },
  { tag: "FAIL", text: "14 pages have no meta description", category: "SEO", guide: "meta-description" },
  { tag: "WARN", text: "Phone number is not tappable on mobile", category: "UX", guide: "contact-info" },
  { tag: "PASS", text: "HTTPS, canonical, sitemap, one H1 per page", category: "SEO" },
  { tag: "STACK", text: "WordPress, Elementor, GA4, Cloudflare", category: "High confidence" },
];

const tagColor: Record<Tag, string> = {
  FAIL: "text-red-400",
  WARN: "text-amber-400",
  PASS: "text-emerald-400",
  STACK: "text-violet-400",
};

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
      {/* Grid backdrop + film-grain noise over the whole landing page, with a
          brighter patch behind the hero. Covering the full height avoids the
          hard change from grid to flat colour halfway down the page. */}
      <div className="pointer-events-none absolute inset-0 hero-grid" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 hero-noise" aria-hidden="true" />

      <main className="relative z-10">
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
                    <span className={`h-1.5 w-1.5 rounded-full ${usage.plan === "owner" || usage.dailyRemaining > 0 ? "bg-emerald-400" : "bg-amber-400"}`} aria-hidden="true" />
                    {/* aria-label is not allowed on a plain span, so the spoken text is sr-only. */}
                    <span className="sr-only">
                      {usage.plan === "owner"
                        ? "Unlimited analyses left today"
                        : `${usage.dailyRemaining} of ${usage.dailyLimit} analyses left today`}
                    </span>
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
              Every issue we flag comes with a repair guide:{" "}
              <a href="/guides" className="text-zinc-400 hover:text-violet-300 underline underline-offset-2 transition-colors">
                browse the fix guides
              </a>
              , or find out{" "}
              <a href="/built-with" className="text-zinc-400 hover:text-violet-300 underline underline-offset-2 transition-colors">
                what a website is built with
              </a>.
            </p>
          </div>
        </section>

        {/* One sample from a real report, as a plain findings list. This is the
            only block below the hero on purpose: the page stays out of the way
            of the input, and the preview reads the way the report itself does. */}
        <section className="px-4 sm:px-6 pb-24" aria-labelledby="what-you-get-heading">
          <div className="mx-auto max-w-4xl">
            <h2 id="what-you-get-heading" className="mb-5 text-center text-[11px] font-semibold text-zinc-500 uppercase tracking-[0.2em]">
              What a report looks like
            </h2>
            <ul className="border-t border-zinc-700">
              {SAMPLE_FINDINGS.map((f) => (
                <li key={f.text} className="grid grid-cols-[48px_1fr] sm:grid-cols-[56px_1fr_auto] gap-x-4 sm:gap-x-5 gap-y-1 items-baseline py-3 px-1 border-b border-zinc-700">
                  <span className={`font-mono text-[11px] tracking-[0.08em] ${tagColor[f.tag]}`}>{f.tag}</span>
                  <span className="text-[14px] text-zinc-100">
                    {f.text}
                    <span className="ml-2 text-[12.5px] text-zinc-500">{f.category}</span>
                  </span>
                  {f.guide ? (
                    <a
                      href={`/guides/${f.guide}`}
                      className="col-start-2 sm:col-start-3 text-[12px] text-zinc-400 hover:text-violet-300 underline underline-offset-[3px] decoration-zinc-700 transition-colors whitespace-nowrap"
                    >
                      Fix guide
                    </a>
                  ) : (
                    <span className="hidden sm:block" />
                  )}
                </li>
              ))}
            </ul>
            <p className="flex flex-wrap justify-between gap-x-4 gap-y-1 pt-3 px-1 text-[12px] text-zinc-500">
              <span>acme-plumbing.co.uk · overall <span className="text-zinc-100 font-medium">71</span> / 100</span>
              <span>20 sections, 19 seconds</span>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
