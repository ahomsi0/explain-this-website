type Update = {
  date: string;
  label: string;
  title: string;
  description: string;
  details: string[];
};

const UPDATES: Update[] = [
  {
    date: "Nov 13, 2026",
    label: "Reports",
    title: "Every report has its own link",
    description:
      "A finished report now lives at its own address, and anyone can share it. Sharing used to need a Pro plan.",
    details: [
      "Copy a report link from the Actions menu, with or without an account",
      "Links work for 30 days, and signed-in owners can revoke them",
      "Back, Forward and reload now behave the way you expect on a report",
      "Phones get a navigation menu and a New button on every report",
    ],
  },
  {
    date: "Oct 22, 2026",
    label: "Detection",
    title: "See which AI or no-code builder made a site",
    description:
      "Reports already named the builder behind a site. Each of the 21 builders we detect now has a page explaining how to tell.",
    details: [
      "Lovable, Bolt, v0, Framer, Replit and 16 more",
      "The exact signals we look for, and how to check them by hand",
      "The compare page now explains what is compared and why",
    ],
  },
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
  },
];

// A changelog, set like one: a ruled list of dated entries, newest first.
// Every entry shows in full. Same quiet language as the legal pages and the
// landing page's findings list: hairlines, one mono column, no cards.
function Entry({ update }: { update: Update }) {
  return (
    <li className="grid grid-cols-1 gap-x-8 gap-y-3 border-b border-zinc-800 py-8 sm:grid-cols-[112px_1fr]">
      <div className="flex items-baseline gap-3 font-mono text-[11px] tracking-[0.06em] sm:flex-col sm:gap-1.5">
        <time className="text-zinc-400">{update.date}</time>
        <span className="uppercase text-zinc-500">{update.label}</span>
      </div>
      <article>
        <h2 className="text-lg font-semibold tracking-tight text-zinc-100">{update.title}</h2>
        <p className="mt-2 text-sm leading-7 text-zinc-400">{update.description}</p>
        <ul className="mt-3 list-disc space-y-1.5 pl-4 text-sm leading-6 text-zinc-300 marker:text-zinc-600">
          {update.details.map((detail) => (
            <li key={detail}>{detail}</li>
          ))}
        </ul>
      </article>
    </li>
  );
}

export function WhatsNewPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-400">Explain This Website</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">What&apos;s new</h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400">
          The latest improvements to Explain This Website, written in plain English.
        </p>

        <ul className="mt-10 border-t border-zinc-700" role="list" aria-label="Product updates">
          {UPDATES.map((update) => (
            <Entry key={update.title} update={update} />
          ))}
        </ul>

        <p className="pt-8 text-sm text-zinc-400">
          Have an idea or found something that needs fixing?{" "}
          <a
            href="mailto:support@explainthiswebsite.com"
            className="text-violet-400 underline decoration-violet-500/30 underline-offset-4 transition-colors hover:text-violet-300"
          >
            Send us a note
          </a>
          , or go{" "}
          <a
            href="/"
            className="text-zinc-300 underline decoration-zinc-700 underline-offset-4 transition-colors hover:text-zinc-100"
          >
            back to the analyzer
          </a>
          .
        </p>
      </main>
    </div>
  );
}
