type UpdateTone = "violet" | "emerald" | "amber";

type Update = {
  date: string;
  label: string;
  title: string;
  description: string;
  details: string[];
  tone: UpdateTone;
};

const UPDATES: Update[] = [
  {
    date: "Aug 21, 2026",
    label: "Reliability",
    title: "Reports now explain the full picture",
    description:
      "We made the analysis experience clearer about which signals were available and where a result may be incomplete.",
    details: [
      "More context around performance and third-party data",
      "Clearer expectations for public, reachable pages",
      "Practical recommendations grouped by what to fix first",
    ],
    tone: "violet",
  },
  {
    date: "Aug 21, 2026",
    label: "Transparency",
    title: "A clearer boundary around what we can analyze",
    description:
      "The landing page now sets expectations before you spend an analysis: what works best, and what can make a result incomplete.",
    details: [
      "Public landing pages, blogs, docs, stores, and marketing sites",
      "HTML, metadata, links, headings, images, scripts, and visible content",
      "Known limitations for login-only, blocked, client-rendered, and dynamic pages",
    ],
    tone: "emerald",
  },
  {
    date: "Aug 21, 2026",
    label: "Privacy",
    title: "Privacy and terms are easier to find",
    description:
      "We added dedicated policy pages and made analytics consent explicit, so you can understand how the service works before using it.",
    details: [
      "A focused Privacy Policy and Terms of Service",
      "Optional analytics only loads after you allow it",
      "No credentials or form submissions are requested from analyzed sites",
    ],
    tone: "amber",
  },
  {
    date: "Aug 21, 2026",
    label: "Product flow",
    title: "From first audit to repeat use",
    description:
      "The core journey is now connected: start from the landing page, review an audit, create an account, and return to your history.",
    details: [
      "Five free analyses per day without signing in",
      "Saved audit history for signed-in users",
      "Shareable reports and a faster path back to a new audit",
    ],
    tone: "violet",
  },
];

const TONE: Record<UpdateTone, { dot: string; tag: string; tagBg: string; tagBorder: string }> = {
  violet: {
    dot: "bg-violet-400",
    tag: "text-violet-300",
    tagBg: "bg-violet-500/10",
    tagBorder: "border-violet-500/25",
  },
  emerald: {
    dot: "bg-emerald-400",
    tag: "text-emerald-300",
    tagBg: "bg-emerald-500/10",
    tagBorder: "border-emerald-500/25",
  },
  amber: {
    dot: "bg-amber-400",
    tag: "text-amber-300",
    tagBg: "bg-amber-500/10",
    tagBorder: "border-amber-500/25",
  },
};

export function WhatsNewPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Hero backdrop — matches landing page */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] hero-grid" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] hero-noise" aria-hidden="true" />

      <div className="relative z-10">
        <main className="mx-auto max-w-3xl px-4 sm:px-6">
          {/* Page header */}
          <section className="pt-14 pb-10 sm:pt-20 sm:pb-14 fade-up">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-400">
              Product updates
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
              What&apos;s new
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-400 sm:text-base">
              The latest improvements to Explain This Website, written in plain English.
            </p>
          </section>

          {/* Changelog cards */}
          <section aria-labelledby="updates-heading" className="pb-12">
            <h2 id="updates-heading" className="sr-only">Recent updates</h2>

            <div className="flex flex-col gap-4">
              {UPDATES.map((update, i) => {
                const t = TONE[update.tone];
                const isLatest = i === 0;
                return (
                  <article
                    key={update.title}
                    className={`fade-up rounded-xl border p-5 transition-colors sm:p-6 ${
                      isLatest
                        ? "border-violet-500/30 bg-violet-500/[0.04]"
                        : "border-zinc-800/80 bg-zinc-900/30 hover:border-zinc-700"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${t.tag} ${t.tagBg} ${t.tagBorder}`}
                      >
                        {update.label}
                      </span>
                      {isLatest && (
                        <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                          New
                        </span>
                      )}
                      <time className="ml-auto text-[11px] text-zinc-600">{update.date}</time>
                    </div>

                    <h3 className="mt-3 text-lg font-semibold tracking-tight text-zinc-100 sm:text-xl">
                      {update.title}
                    </h3>
                    <p className="mt-2 text-sm leading-7 text-zinc-400">{update.description}</p>

                    <ul className="mt-4 grid gap-2 sm:grid-cols-1">
                      {update.details.map((detail) => (
                        <li key={detail} className="flex items-start gap-2.5 text-xs leading-relaxed text-zinc-500">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`mt-0.5 shrink-0 ${t.tag}`} aria-hidden="true">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          {detail}
                        </li>
                      ))}
                    </ul>
                  </article>
                );
              })}
            </div>
          </section>

          {/* Footer cta */}
          <section className="border-t border-zinc-900 py-10 text-center">
            <p className="text-sm text-zinc-500">Have an idea or found something that needs fixing?</p>
            <a
              href="mailto:support@explainthewebsite.com"
              className="mt-2 inline-block text-sm text-violet-400 underline decoration-violet-500/30 underline-offset-4 transition-colors hover:text-violet-300"
            >
              Send us a note
            </a>
            <div className="mt-5">
              <a href="/" className="text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors">
                ← Back to the analyzer
              </a>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
