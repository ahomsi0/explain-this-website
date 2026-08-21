import { LogoWordmark } from "../ui/Logo";
import { SiteFooter } from "../ui/SiteFooter";

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
        <header className="border-b border-zinc-900/80 px-4 sm:px-6 backdrop-blur-md bg-zinc-950/40">
          <div className="mx-auto flex h-14 max-w-4xl items-center justify-between">
            <a href="/" aria-label="Explain This Website home">
              <LogoWordmark size={20} />
            </a>
            <a href="/" className="text-xs text-zinc-400 transition-colors hover:text-zinc-100">
              Back to analyzer
            </a>
          </div>
        </header>

        <main className="mx-auto max-w-4xl px-4 sm:px-6">
          {/* Page header */}
          <section className="pt-14 pb-12 sm:pt-20 sm:pb-16 fade-up">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-400">
              Product updates
            </p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
              What&apos;s new
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-zinc-400 sm:text-base">
              The latest improvements to Explain This Website, written in plain English.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3 text-xs">
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-500/10 px-3 py-1.5 text-violet-300">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-400" aria-hidden="true" />
                Latest · August 21, 2026
              </span>
              <a
                href="/"
                className="text-zinc-500 underline decoration-zinc-700 underline-offset-4 transition-colors hover:text-zinc-200"
              >
                Run an analysis
              </a>
            </div>
          </section>

          {/* Timeline */}
          <section aria-labelledby="updates-heading" className="pb-16">
            <h2 id="updates-heading" className="sr-only">Recent updates</h2>

            <div className="relative">
              {/* Vertical rail line */}
              <div
                className="absolute left-[5px] top-2 bottom-0 w-px bg-zinc-800 sm:left-[90px]"
                aria-hidden="true"
              />

              <ol className="space-y-0">
                {UPDATES.map((update, i) => {
                  const t = TONE[update.tone];
                  const isLast = i === UPDATES.length - 1;
                  return (
                    <li key={update.title} className="relative flex gap-5 sm:gap-0">
                      {/* Mobile dot */}
                      <div className="relative z-10 mt-1.5 flex-shrink-0 sm:hidden">
                        <span className={`block h-[11px] w-[11px] rounded-full ${t.dot} ring-2 ring-zinc-950`} />
                      </div>

                      {/* Desktop: date column */}
                      <div className="hidden sm:flex sm:w-[90px] sm:flex-shrink-0 sm:flex-col sm:items-end sm:pr-8 sm:pt-1">
                        <span className="relative z-10 text-[11px] text-zinc-600 leading-none">
                          {update.date}
                        </span>
                      </div>

                      {/* Desktop dot */}
                      <div className="relative z-10 mt-1.5 hidden flex-shrink-0 sm:block">
                        <span className={`block h-[11px] w-[11px] rounded-full ${t.dot} ring-2 ring-zinc-950`} />
                      </div>

                      {/* Content */}
                      <div className={`flex-1 pb-10 sm:pl-8 ${isLast ? "pb-0" : ""}`}>
                        <div className="flex flex-wrap items-center gap-2 sm:hidden mb-1">
                          <span className="text-[10px] text-zinc-600">{update.date}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span
                            className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${t.tag} ${t.tagBg} ${t.tagBorder}`}
                          >
                            {update.label}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold tracking-tight text-zinc-100 sm:text-xl">
                          {update.title}
                        </h3>
                        <p className="mt-2 text-sm leading-7 text-zinc-400">{update.description}</p>
                        <ul className="mt-4 space-y-2">
                          {update.details.map((detail) => (
                            <li key={detail} className="flex items-start gap-2.5 text-xs leading-relaxed text-zinc-500">
                              <span className={`mt-1.5 h-1 w-1 flex-shrink-0 rounded-full ${t.dot} opacity-60`} aria-hidden="true" />
                              {detail}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </section>

          {/* Footer cta */}
          <section className="border-t border-zinc-900 py-10">
            <p className="text-sm text-zinc-500">Have an idea or found something that needs fixing?</p>
            <a
              href="mailto:support@explainthewebsite.com"
              className="mt-2 inline-block text-sm text-violet-400 underline decoration-violet-500/30 underline-offset-4 transition-colors hover:text-violet-300"
            >
              Send us a note
            </a>
          </section>
        </main>

        <SiteFooter />
      </div>
    </div>
  );
}
