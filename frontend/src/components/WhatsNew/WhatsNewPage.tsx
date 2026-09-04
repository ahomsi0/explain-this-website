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

function SpotlightCard({ update }: { update: Update }) {
  const t = TONE[update.tone];
  return (
    <article className="relative overflow-hidden rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-violet-900/[0.04] p-6 sm:p-7">
      <div
        className="pointer-events-none absolute -left-8 -top-8 h-40 w-40 rounded-full bg-violet-500/[0.07] blur-2xl"
        aria-hidden="true"
      />
      <div className="relative">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span
            className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${t.tag} ${t.tagBg} ${t.tagBorder}`}
          >
            {update.label}
          </span>
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
            Latest
          </span>
          <time className="ml-auto text-[11px] text-zinc-600">{update.date}</time>
        </div>

        <h2 className="mb-3 text-2xl font-bold tracking-tight text-zinc-100 sm:text-[1.6rem]">
          {update.title}
        </h2>
        <p className="mb-5 text-sm leading-7 text-zinc-400">{update.description}</p>

        <ul className="grid grid-cols-2 gap-1.5">
          {update.details.map((detail, i) => {
            const isOddLast =
              update.details.length % 2 !== 0 && i === update.details.length - 1;
            return (
              <li
                key={detail}
                className={`flex items-start gap-2 rounded-lg border border-violet-500/[0.12] bg-violet-500/[0.06] px-3 py-2 text-[11.5px] leading-snug text-violet-400 ${isOddLast ? "col-span-2" : ""}`}
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mt-0.5 shrink-0"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {detail}
              </li>
            );
          })}
        </ul>
      </div>
    </article>
  );
}

function FeedRow({ update }: { update: Update }) {
  const t = TONE[update.tone];
  return (
    <li className="flex items-center gap-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3.5 py-2.5">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${t.dot}`} aria-hidden="true" />
      <span className="flex-1 truncate text-sm font-medium text-zinc-400">{update.title}</span>
      <span
        className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] ${t.tag} ${t.tagBg} ${t.tagBorder}`}
      >
        {update.label}
      </span>
      <time className="shrink-0 text-[11px] text-zinc-600">{update.date}</time>
    </li>
  );
}

export function WhatsNewPage() {
  const [latest, ...rest] = UPDATES;
  return (
    <div className="relative min-h-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] hero-grid" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[480px] hero-noise" aria-hidden="true" />

      <div className="relative z-10">
        <main className="mx-auto max-w-2xl px-4 sm:px-6">
          <section className="pb-10 pt-14 fade-up sm:pb-12 sm:pt-20">
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

          <section className="fade-up" aria-label="Latest update">
            <SpotlightCard update={latest} />
          </section>

          {rest.length > 0 && (
            <section className="mt-5 fade-up" aria-labelledby="prev-updates-label">
              <p
                id="prev-updates-label"
                className="mb-2.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-zinc-600"
              >
                Previous updates
              </p>
              <ul className="flex flex-col gap-1" role="list" aria-labelledby="prev-updates-label">
                {rest.map((update) => (
                  <FeedRow key={update.title} update={update} />
                ))}
              </ul>
            </section>
          )}

          <section className="mt-8 border-t border-zinc-900 py-10 text-center">
            <p className="text-sm text-zinc-500">Have an idea or found something that needs fixing?</p>
            <a
              href="mailto:support@explainthewebsite.com"
              className="mt-2 inline-block text-sm text-violet-400 underline decoration-violet-500/30 underline-offset-4 transition-colors hover:text-violet-300"
            >
              Send us a note
            </a>
            <div className="mt-5">
              <a
                href="/"
                className="text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-200"
              >
                ← Back to the analyzer
              </a>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
