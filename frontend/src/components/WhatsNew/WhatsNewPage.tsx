import { LogoWordmark } from "../ui/Logo";

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
    date: "August 21, 2026",
    label: "Reliability",
    title: "Reports now explain the full picture",
    description: "We made the analysis experience clearer about which signals were available and where a result may be incomplete.",
    details: [
      "More context around performance and third-party data",
      "Clearer expectations for public, reachable pages",
      "Practical recommendations grouped by what to fix first",
    ],
    tone: "violet",
  },
  {
    date: "August 21, 2026",
    label: "Transparency",
    title: "A clearer boundary around what we can analyze",
    description: "The landing page now sets expectations before you spend an analysis: what works best, and what can make a result incomplete.",
    details: [
      "Public landing pages, blogs, docs, stores, and marketing sites",
      "HTML, metadata, links, headings, images, scripts, and visible content",
      "Known limitations for login-only, blocked, client-rendered, and dynamic pages",
    ],
    tone: "emerald",
  },
  {
    date: "August 21, 2026",
    label: "Privacy",
    title: "Privacy and terms are easier to find",
    description: "We added dedicated policy pages and made analytics consent explicit, so you can understand how the service works before using it.",
    details: [
      "A focused Privacy Policy and Terms of Service",
      "Optional analytics only loads after you allow it",
      "No credentials or form submissions are requested from analyzed sites",
    ],
    tone: "amber",
  },
  {
    date: "August 21, 2026",
    label: "Product flow",
    title: "From first audit to repeat use",
    description: "The core journey is now connected: start from the landing page, review an audit, create an account, and return to your history.",
    details: [
      "Five free analyses per day without signing in",
      "Saved audit history for signed-in users",
      "Shareable reports and a faster path back to a new audit",
    ],
    tone: "violet",
  },
];

const TONE_STYLES: Record<UpdateTone, { dot: string; label: string; border: string }> = {
  violet: { dot: "bg-violet-300", label: "text-violet-300", border: "border-violet-500/20" },
  emerald: { dot: "bg-emerald-300", label: "text-emerald-300", border: "border-emerald-500/20" },
  amber: { dot: "bg-amber-300", label: "text-amber-300", border: "border-amber-500/20" },
};

export function WhatsNewPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-900/80 px-4 sm:px-6">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between">
          <a href="/" aria-label="Explain This Website home"><LogoWordmark size={20} /></a>
          <a href="/" className="text-xs text-zinc-400 transition-colors hover:text-zinc-100">Back to analyzer</a>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
        <section className="border-b border-zinc-800/80 pb-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-400">Product updates</p>
          <h1 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight sm:text-5xl">What&apos;s new</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-400 sm:text-base">
            The latest improvements to Explain This Website, written in plain English. We&apos;ll keep this page updated as the analyzer gets more useful and more transparent.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
            <span className="rounded-full border border-violet-500/25 bg-violet-500/10 px-3 py-1.5 text-violet-300">Latest update · August 21, 2026</span>
            <a href="/" className="underline decoration-zinc-700 underline-offset-4 transition-colors hover:text-zinc-200">Run an analysis</a>
          </div>
        </section>

        <section className="mt-10" aria-labelledby="updates-heading">
          <h2 id="updates-heading" className="sr-only">Recent updates</h2>
          <div className="space-y-5">
            {UPDATES.map((update) => {
              const styles = TONE_STYLES[update.tone];
              return (
                <article key={update.title} className={`rounded-2xl border ${styles.border} bg-zinc-900/40 p-5 sm:p-7`}>
                  <div className="flex flex-col gap-5 sm:flex-row sm:gap-8">
                    <div className="flex shrink-0 items-start gap-2.5 sm:w-40 sm:flex-col sm:gap-2">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${styles.dot} sm:mt-0`} aria-hidden="true" />
                      <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${styles.label}`}>{update.label}</p>
                      <p className="text-xs text-zinc-600">{update.date}</p>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xl font-semibold tracking-tight text-zinc-100">{update.title}</h3>
                      <p className="mt-2 max-w-2xl text-sm leading-7 text-zinc-400">{update.description}</p>
                      <ul className="mt-5 grid gap-2 text-xs leading-relaxed text-zinc-500 sm:grid-cols-3">
                        {update.details.map((detail) => (
                          <li key={detail} className="border-l border-zinc-700 pl-3">{detail}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-12 border-t border-zinc-900 pt-8">
          <p className="text-sm text-zinc-500">Have an idea or found something that needs fixing?</p>
          <a href="mailto:support@explainthewebsite.com" className="mt-2 inline-block text-sm text-violet-400 underline decoration-violet-500/30 underline-offset-4 transition-colors hover:text-violet-300">
            Send us a note
          </a>
        </section>
      </main>

      <footer className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-4 gap-y-2 border-t border-zinc-900 px-4 py-8 text-xs text-zinc-600 sm:px-6">
        <span>© {new Date().getFullYear()} Explain This Website</span>
        <a href="/whats-new" className="text-zinc-400 hover:text-zinc-200">What&apos;s new</a>
        <a href="/privacy" className="hover:text-zinc-300">Privacy</a>
        <a href="/terms" className="hover:text-zinc-300">Terms</a>
      </footer>
    </div>
  );
}
