import {
  BEHIND_LOGIN_INTRO,
  BEHIND_LOGIN_JS_TIP,
  BEHIND_LOGIN_LIMITS,
  BEHIND_LOGIN_PRIVACY,
  BEHIND_LOGIN_REPORT,
  BEHIND_LOGIN_STEPS,
  BEHIND_LOGIN_TITLE,
} from "../../seo/behindLoginContent";
import { Callout, IconBadge, IconList, PageHero, PageMain, Panel, PanelTitle, SectionLabel, linkCls, primaryBtn, secondaryBtn } from "../ui/Panel";
import type { IconName } from "../ui/icons";

// One icon per privacy promise, in the order the copy lists them.
const PRIVACY_ICONS: IconName[] = ["lock", "eye", "user", "trash"];

export function BehindLoginPage() {
  const included = BEHIND_LOGIN_REPORT.find((r) => r.label === "Included");
  const leftOut = BEHIND_LOGIN_REPORT.find((r) => r.label === "Left out");

  const howItWorks = (
    <Panel className="shadow-xl shadow-black/20">
      <PanelTitle>How to do it</PanelTitle>
      <ol className="mt-4 flex flex-col">
        {BEHIND_LOGIN_STEPS.map((step, i) => (
          <li key={step} className="flex gap-3 py-3 border-t border-zinc-800 first:border-t-0 first:pt-0">
            <span className="flex w-6 h-6 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-[11px] font-semibold tabular-nums text-violet-300">{i + 1}</span>
            <p className="text-[13.5px] leading-relaxed text-zinc-300">{step}</p>
          </li>
        ))}
      </ol>
      <p className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950/40 p-3 text-[12.5px] leading-relaxed text-zinc-500">{BEHIND_LOGIN_JS_TIP}</p>
    </Panel>
  );

  return (
    <PageMain>
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-[12px] text-zinc-500">
        <a href="/" className="hover:text-zinc-300 transition-colors">Home</a>
        <span aria-hidden="true">›</span>
        <span className="text-zinc-400">Behind a login</span>
      </nav>

      <PageHero eyebrow="Private pages" title={BEHIND_LOGIN_TITLE} intro={BEHIND_LOGIN_INTRO} aside={howItWorks}>
        <div className="mt-7 flex flex-wrap gap-3">
          <a href="/capture" className={primaryBtn}>Paste a page</a>
          <a href="/" className={secondaryBtn}>Analyze a public page instead</a>
        </div>
      </PageHero>

      <section className="mt-16 sm:mt-20" aria-labelledby="bl-report">
        <SectionLabel id="bl-report">What the report covers</SectionLabel>
        <div className="grid gap-6 md:grid-cols-2">
          {included && (
            <Panel>
              <div className="flex items-center gap-3">
                <IconBadge icon="check" tone="emerald" size="sm" />
                <h3 className="text-[15px] font-semibold text-zinc-100">Included</h3>
              </div>
              <p className="mt-3 text-[13.5px] leading-relaxed text-zinc-400">{included.text}</p>
            </Panel>
          )}
          {leftOut && (
            <Panel>
              <div className="flex items-center gap-3">
                <IconBadge icon="minus" tone="amber" size="sm" />
                <h3 className="text-[15px] font-semibold text-zinc-100">Left out</h3>
              </div>
              <p className="mt-3 text-[13.5px] leading-relaxed text-zinc-400">{leftOut.text}</p>
            </Panel>
          )}
        </div>
      </section>

      <section className="mt-14" aria-labelledby="bl-privacy">
        <SectionLabel id="bl-privacy">What you send</SectionLabel>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {BEHIND_LOGIN_PRIVACY.map((text, i) => (
            <li key={text}>
              <Panel className="h-full !p-5">
                <IconBadge icon={PRIVACY_ICONS[i] ?? "shield"} />
                <p className="mt-4 text-[13.5px] leading-relaxed text-zinc-300">{text}</p>
              </Panel>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr] lg:items-start">
        <Panel>
          <PanelTitle>Good to know</PanelTitle>
          <IconList items={BEHIND_LOGIN_LIMITS} icon="info" tone="zinc" />
        </Panel>
        <Callout tone="violet" icon="search" title={<h2>Is the page public?</h2>}>
          For a page anyone can open, the normal analyzer fetches it for you and adds speed scores and security headers.{" "}
          <a href="/" className={linkCls}>Use the analyzer</a>.
        </Callout>
      </div>
    </PageMain>
  );
}
