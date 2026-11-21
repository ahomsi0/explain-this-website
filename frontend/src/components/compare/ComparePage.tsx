import { useState, useRef, useEffect, type FormEvent } from "react";
import { useAuth } from "../../context/useAuth";
import { compareLive, type AuditComparison } from "../../services/authApi";
import { normalizeInputUrl } from "../../lib/urls";
import { authHref } from "../../lib/authLinks";
import { AuditComparison as AuditComparisonView } from "../auth/AuditComparison";
import { COMPARE_CONTENT, COMPARE_INTRO, COMPARE_TITLE } from "../../seo/compareContent";
import { Callout, CheckList, FaqGrid, IconBadge, IconList, PageHero, PageMain, Panel, PanelTitle, SectionLabel, StepList, inputCls, linkCls, primaryBtn } from "../ui/Panel";
import { splitLead } from "../ui/splitLead";
import { Icon, type IconName } from "../ui/icons";

const section = (heading: string) => COMPARE_CONTENT.find((s) => s.heading === heading);
const COMPARED_ICONS: IconName[] = ["search", "bolt", "code", "target", "shield"];
const ORDINALS = ["1st", "2nd", "3rd", "4th", "5th", "6th"];

function SiteField({
  id,
  label,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex-1 min-w-0">
      <label htmlFor={id} className="block text-[12px] font-medium text-zinc-400 mb-1.5">
        {label}
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="example.com"
        disabled={disabled}
        autoComplete="off"
        spellCheck={false}
        autoCapitalize="none"
        autoCorrect="off"
        className={inputCls}
      />
    </div>
  );
}

// ComparePage runs fresh analyses of two sites head-to-head. Requires a
// session because each comparison doubles analysis cost.
export function ComparePage() {
  const { user } = useAuth();
  const [yours, setYours] = useState("");
  const [competitor, setCompetitor] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [comparison, setComparison] = useState<AuditComparison | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => {
    controllerRef.current?.abort();
    controllerRef.current = null;
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      window.location.href = authHref("login");
      return;
    }
    const yoursUrl = normalizeInputUrl(yours);
    const compUrl = normalizeInputUrl(competitor);
    if (!yoursUrl) { setError("Enter your site's URL, e.g. example.com"); return; }
    if (!compUrl) { setError("Enter the competitor's URL, e.g. competitor.com"); return; }
    if (yoursUrl.replace(/^https?:\/\//i, "") === compUrl.replace(/^https?:\/\//i, "")) {
      setError("The two URLs must be different");
      return;
    }

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setBusy(true);
    try {
      const result = await compareLive(yoursUrl, compUrl, controller.signal);
      if (controllerRef.current === controller) setComparison(result);
    } catch (err) {
      if (controllerRef.current === controller) setError(err instanceof Error ? err.message : "Comparison failed. Please try again.");
    } finally {
      if (controllerRef.current === controller) {
        controllerRef.current = null;
        setBusy(false);
      }
    }
  };

  const handleCancel = () => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setBusy(false);
  };

  const signInNote = !user && (
    <p className="mt-3 text-center text-[12px] text-zinc-500">
      Comparisons need a free account.{" "}
      <a href={authHref("login")} className={linkCls}>Sign in</a> or{" "}
      <a href={authHref("signup")} className={linkCls}>create one</a>.
    </p>
  );

  const form = (
    <Panel className="shadow-xl shadow-black/20">
      <PanelTitle as="h2">Start a comparison</PanelTitle>
      <form onSubmit={handleSubmit} noValidate className="mt-5">
        <SiteField id="compare-yours" label="Your site" value={yours} onChange={(v) => { setYours(v); setError(null); }} disabled={busy} />
        <div className="my-3 flex items-center gap-3 text-[11px] font-semibold text-zinc-600" aria-hidden="true">
          <span className="h-px flex-1 bg-zinc-800" />VS<span className="h-px flex-1 bg-zinc-800" />
        </div>
        <SiteField id="compare-competitor" label="Competitor" value={competitor} onChange={(v) => { setCompetitor(v); setError(null); }} disabled={busy} />
        {error && <p role="alert" className="mt-3 text-[13px] text-red-400">{error}</p>}
        <button type="submit" disabled={busy} className={`${primaryBtn} mt-5 w-full`}>
          {busy ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Auditing both sites…
            </>
          ) : (
            "Compare sites"
          )}
        </button>
        {busy ? (
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-[12px] text-zinc-500">Two full analyses run in parallel, usually 20–60 seconds per site.</p>
            <button type="button" onClick={handleCancel} className="shrink-0 text-[12px] text-zinc-400 hover:text-zinc-200 underline underline-offset-2 transition-colors">
              Cancel
            </button>
          </div>
        ) : (
          signInNote || <p className="mt-3 text-center text-[12px] text-zinc-500">Both sites are audited live, not from a cache.</p>
        )}
      </form>
    </Panel>
  );

  const compared = section("What gets compared");
  const howTo = section("How to compare your website with a competitor");
  const factors = section("Which SEO factors matter most in a comparison");
  const rankings = section("Can it compare search rankings?");
  const reading = section("How to read the result");
  const uses = section("When a side-by-side comparison helps");
  const fixes = section("Fix the gaps you find");
  const limits = section("Limits and requirements");
  const faq = section("Common questions");

  return (
    <>
      <PageMain>
        <PageHero eyebrow="Head to head" title={COMPARE_TITLE} intro={COMPARE_INTRO} aside={form}>
          <CheckList items={["Same checks on both sites", "Audited live, not cached", "A fix guide for every gap"]} />
        </PageHero>

        {compared?.bullets && (
          <section className="mt-16 sm:mt-20" aria-labelledby="compare-what">
            <SectionLabel id="compare-what">{compared.heading}</SectionLabel>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {compared.bullets.map((b, i) => {
                const { lead, rest } = splitLead(b);
                return (
                  <li key={b}>
                    <Panel className="h-full !p-5">
                      <IconBadge icon={COMPARED_ICONS[i] ?? "layers"} />
                      <h3 className="mt-4 text-[14px] font-semibold text-zinc-100">{lead ?? b}</h3>
                      {lead && <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">{rest}</p>}
                    </Panel>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {howTo?.bullets && (
            <Panel>
              <PanelTitle>{howTo.heading}</PanelTitle>
              <StepList items={howTo.bullets} />
            </Panel>
          )}
          {factors?.bullets && (
            <Panel>
              <PanelTitle>{factors.heading}</PanelTitle>
              {factors.paragraphs?.map((p) => <p key={p} className="mt-1 text-[13px] text-zinc-500">{p}</p>)}
              <ol className="mt-4 flex flex-col">
                {factors.bullets.map((b, i) => {
                  const { lead, rest } = splitLead(b);
                  const width = 100 - i * (70 / Math.max(1, factors.bullets!.length - 1));
                  return (
                    <li key={b} className="py-3 border-t border-zinc-800 first:border-t-0 first:pt-0">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-[14px] font-medium text-zinc-100">{lead ?? `#${i + 1}`}</span>
                        <span className="text-[11px] text-zinc-500 tabular-nums">{ORDINALS[i] ?? `${i + 1}th`}</span>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-zinc-800" aria-hidden="true">
                        <div className="h-1.5 rounded-full bg-violet-500" style={{ width: `${width}%` }} />
                      </div>
                      <p className="mt-2 text-[13px] leading-relaxed text-zinc-500">{lead ? rest : b}</p>
                    </li>
                  );
                })}
              </ol>
            </Panel>
          )}
        </div>

        {rankings && (
          <div className="mt-6">
            <Callout title={<h2>{rankings.heading} Not directly.</h2>}>
              {rankings.paragraphs?.map((p, i) => <p key={p} className={i ? "mt-2" : ""}>{i === 0 ? p.replace(/^Not directly\.\s*/, "") : p}</p>)}
            </Callout>
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {reading && (
            <Panel>
              <PanelTitle>{reading.heading}</PanelTitle>
              {reading.paragraphs?.map((p) => <p key={p} className="mt-1 text-[13px] text-zinc-500">{p}</p>)}
              {reading.bullets && <StepList items={reading.bullets} />}
            </Panel>
          )}
          {uses?.bullets && (
            <Panel>
              <PanelTitle>{uses.heading}</PanelTitle>
              <IconList items={uses.bullets} icon="arrowRight" tone="violet" />
            </Panel>
          )}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          {fixes?.links && (
            <Panel>
              <PanelTitle>{fixes.heading}</PanelTitle>
              {fixes.paragraphs?.map((p) => <p key={p} className="mt-1 text-[13px] text-zinc-500">{p}</p>)}
              <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                {fixes.links.map((l) => (
                  <li key={l.href}>
                    <a href={l.href} className="group flex items-center justify-between gap-3 rounded-lg border border-zinc-800 bg-zinc-950/40 px-3.5 py-3 text-[13px] text-zinc-300 hover:border-violet-500/40 hover:text-zinc-100 transition-colors">
                      {l.label}
                      <Icon name="arrowRight" className="w-3.5 h-3.5 shrink-0 text-zinc-500 group-hover:text-violet-300 transition-colors" />
                    </a>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          {limits?.bullets && (
            <Panel>
              <PanelTitle>{limits.heading}</PanelTitle>
              <IconList items={limits.bullets} icon="info" tone="zinc" />
            </Panel>
          )}
        </div>

        {faq?.faq && (
          <section className="mt-14" aria-labelledby="compare-faq">
            <SectionLabel id="compare-faq">{faq.heading}</SectionLabel>
            <FaqGrid items={faq.faq} />
          </section>
        )}

        <p className="mt-10 text-[13px] text-zinc-500">
          Want to see what a site was built with first?{" "}
          <a href="/built-with" className={linkCls}>AI and no-code builder detection</a>.
        </p>
      </PageMain>

      {comparison && (
        <AuditComparisonView
          comparison={comparison}
          onClose={() => setComparison(null)}
          leftLabel="Yours"
          rightLabel="Competitor"
          title="Head-to-head results"
          subtitle="Your site on the left, the competitor on the right. Green bars mark the winner on each metric."
        />
      )}
    </>
  );
}
