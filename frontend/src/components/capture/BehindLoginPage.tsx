import { useEffect, useRef, useState } from "react";
import { bookmarkletHref } from "../../lib/bookmarklet";
import {
  BEHIND_LOGIN_INTRO,
  BEHIND_LOGIN_LIMITS,
  BEHIND_LOGIN_PRIVACY,
  BEHIND_LOGIN_REPORT,
  BEHIND_LOGIN_STEPS,
  BEHIND_LOGIN_TITLE,
} from "../../seo/behindLoginContent";

const eyebrow = "text-[11px] font-bold uppercase tracking-widest text-zinc-600";
const link = "text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors";

// The button people drag to their bookmarks bar. React refuses to render a
// `javascript:` href, so it is set on the element after it mounts. That also
// keeps the script out of the prerendered HTML.
function BookmarkButton() {
  const ref = useRef<HTMLAnchorElement>(null);
  const [clicked, setClicked] = useState(false);

  useEffect(() => {
    ref.current?.setAttribute("href", bookmarkletHref(window.location.origin));
  }, []);

  return (
    <span className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
      <a
        ref={ref}
        // Clicking it here would run it on this page, which has nothing to analyze.
        onClick={(e) => { e.preventDefault(); setClicked(true); }}
        draggable
        title="Drag me to your bookmarks bar"
        className="inline-flex cursor-grab items-center rounded-md border border-dashed border-violet-500/60 px-3.5 py-2 text-[13px] font-semibold text-violet-300 transition-colors hover:border-violet-400 hover:text-violet-200 active:cursor-grabbing"
      >
        Explain this page
      </a>
      <span role="status" className="text-[12.5px] text-zinc-500">
        {clicked
          ? "Drag it up to the bookmarks bar. Clicking only works once it is there."
          : "Bookmarks bar hidden? Press Ctrl+Shift+B, or Cmd+Shift+B on a Mac."}
      </span>
    </span>
  );
}

function RuledList({ items }: { items: string[] }) {
  return (
    <ul className="border-t border-zinc-800">
      {items.map((text) => (
        <li key={text} className="border-b border-zinc-800 py-3 text-[13.5px] leading-relaxed text-zinc-300">{text}</li>
      ))}
    </ul>
  );
}

export function BehindLoginPage() {
  return (
    <main className="flex-1 px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <nav aria-label="Breadcrumb" className="mb-5 text-[12px] text-zinc-500">
          <a href="/" className="hover:text-zinc-300 transition-colors">Home</a>
          <span className="mx-1.5 text-zinc-700">›</span>
          <span className="text-zinc-400">Behind a login</span>
        </nav>

        <h1 className="text-3xl sm:text-4xl font-semibold leading-tight text-zinc-100">{BEHIND_LOGIN_TITLE}</h1>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-zinc-400">{BEHIND_LOGIN_INTRO}</p>

        <section className="mt-10" aria-labelledby="bl-steps">
          <h2 id="bl-steps" className={`${eyebrow} mb-3`}>How to do it</h2>
          <ol className="border-t border-zinc-800">
            {BEHIND_LOGIN_STEPS.map((step, i) => (
              <li key={step} className="grid grid-cols-[28px_1fr] items-baseline gap-x-3 border-b border-zinc-800 py-4">
                <span className="font-mono text-[11px] tabular-nums tracking-[0.06em] text-zinc-500" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="text-[14px] leading-relaxed text-zinc-200">
                  {step}
                  {i === 0 && <BookmarkButton />}
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-10" aria-labelledby="bl-report">
          <h2 id="bl-report" className={`${eyebrow} mb-3`}>What the report covers</h2>
          <dl className="border-t border-zinc-800">
            {BEHIND_LOGIN_REPORT.map((row) => (
              <div key={row.label} className="grid grid-cols-1 sm:grid-cols-[88px_1fr] items-baseline gap-x-4 gap-y-1 border-b border-zinc-800 py-3">
                <dt className="font-mono text-[11px] uppercase tracking-[0.08em] text-zinc-500">{row.label}</dt>
                <dd className="text-[13.5px] leading-relaxed text-zinc-300">{row.text}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="mt-10" aria-labelledby="bl-privacy">
          <h2 id="bl-privacy" className={`${eyebrow} mb-3`}>What leaves your browser</h2>
          <RuledList items={BEHIND_LOGIN_PRIVACY} />
        </section>

        <section className="mt-10" aria-labelledby="bl-limits">
          <h2 id="bl-limits" className={`${eyebrow} mb-3`}>Good to know</h2>
          <RuledList items={BEHIND_LOGIN_LIMITS} />
        </section>

        <p className="mt-10 text-[13.5px] leading-relaxed text-zinc-500">
          Clicked the bookmark and nothing arrived?{" "}
          <a href="/capture" className={link}>Paste the page source instead</a>. For a page anyone can open,{" "}
          <a href="/" className={link}>use the analyzer</a>.
        </p>
      </div>
    </main>
  );
}
