import { Chip, IconBadge, IconList, PageHero, PageMain, Panel, primaryBtn, secondaryBtn } from "../ui/Panel";
import type { IconName } from "../ui/icons";

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
    label: "Private pages",
    title: "Analyze a page behind a login",
    description:
      "Dashboards, account pages and password-protected staging sites can now be audited by pasting the page's source. Your password never leaves your browser.",
    details: [
      "Copy the page source while signed in, paste it, and confirm what you are sending",
      "The report is saved to your account and only you can open it",
      "Links inside the page are never requested, and the page is not sent to an AI provider",
      "Reports now say so when a URL turned out to be a sign-in page",
    ],
  },
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

// Map each entry's label to an icon, so the timeline is scannable at a glance.
const LABEL_ICONS: Record<string, IconName> = {
  "Private pages": "lock",
  "Reports": "file",
  "Detection": "code",
  "Reliability": "check",
  "Transparency": "eye",
  "Privacy": "shield",
  "Product flow": "layers",
};

// A changelog as a timeline of panels, newest first. Every entry shows in full.
function Entry({ update, last }: { update: Update; last: boolean }) {
  return (
    <li className="relative grid grid-cols-[2.25rem_1fr] gap-x-4 sm:gap-x-5">
      {/* The rail: an icon per entry, joined by a line */}
      <div className="flex flex-col items-center">
        <IconBadge icon={LABEL_ICONS[update.label] ?? "sparkle"} />
        {!last && <span className="mt-2 w-px flex-1 bg-zinc-800" aria-hidden="true" />}
      </div>
      <article className="pb-6 min-w-0">
        <Panel>
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone="violet">{update.label}</Chip>
            <time className="text-[12px] text-zinc-500">{update.date}</time>
          </div>
          <h2 className="mt-3 text-lg font-semibold tracking-tight text-zinc-100">{update.title}</h2>
          <p className="mt-2 text-[14px] leading-relaxed text-zinc-400">{update.description}</p>
          <IconList items={update.details} icon="check" tone="emerald" />
        </Panel>
      </article>
    </li>
  );
}

export function WhatsNewPage() {
  return (
    <PageMain width="max-w-4xl">
      <PageHero eyebrow="Changelog" title="What's new" intro="The latest improvements to Explain This Website, written in plain English." />

      <ul className="mt-12" role="list" aria-label="Product updates">
        {UPDATES.map((update, i) => (
          <Entry key={update.title} update={update} last={i === UPDATES.length - 1} />
        ))}
      </ul>

      <Panel className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-[14px] font-semibold text-zinc-100">Have an idea or found something that needs fixing?</h2>
          <p className="mt-1 text-[13px] text-zinc-500">Send us a note, or go back and analyze a site.</p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <a href="mailto:support@explainthiswebsite.com" className={secondaryBtn}>Send us a note</a>
          <a href="/" className={primaryBtn}>Back to the analyzer</a>
        </div>
      </Panel>
    </PageMain>
  );
}
