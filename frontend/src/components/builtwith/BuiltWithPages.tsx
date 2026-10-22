import { useEffect } from "react";
import { BUILDERS, buildersOfKind, displayName, relatedBuilders, type Builder, type BuilderKind } from "../../builders/builders";
import { builderTitle } from "../../seo/routes";
import { BUILT_WITH_INTRO, DETECTION_LIMITS, HOW_DETECTION_WORKS } from "../../seo/prerender";

const link = "text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors";
const eyebrow = "text-[11px] font-bold uppercase tracking-widest text-zinc-600";

function kindBadge(kind: BuilderKind) {
  return kind === "ai"
    ? "border-violet-800 text-violet-400 bg-violet-950"
    : "border-zinc-700 text-zinc-400 bg-zinc-900";
}

function kindLabel(kind: BuilderKind) {
  return kind === "ai" ? "AI builder" : "No-code builder";
}

function BuilderCard({ builder }: { builder: Builder }) {
  return (
    <a
      href={`/built-with/${builder.slug}`}
      className="group flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 hover:border-zinc-700 transition-colors"
    >
      <span className="flex items-center justify-between gap-2">
        <span className="text-[14px] font-semibold text-zinc-100 group-hover:text-violet-300 transition-colors">
          {displayName(builder)}
        </span>
        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border ${kindBadge(builder.kind)}`}>
          {kindLabel(builder.kind)}
        </span>
      </span>
      <span className="mt-1.5 text-[12.5px] text-zinc-500 leading-relaxed">{builder.summary}</span>
    </a>
  );
}

function AnalyzeCta({ label }: { label: string }) {
  return (
    <a
      href="/"
      className="inline-flex items-center justify-center rounded-lg bg-violet-600 hover:bg-violet-500 px-4 py-2.5 text-[13px] font-semibold text-white transition-colors"
    >
      {label}
    </a>
  );
}

export function BuiltWithHubPage() {
  const ai = buildersOfKind("ai");
  const noCode = buildersOfKind("no-code");

  return (
    <main className="flex-1 px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <div className="max-w-6xl mx-auto">
        <nav aria-label="Breadcrumb" className="text-[12px] text-zinc-500 mb-5">
          <a href="/" className="hover:text-zinc-300 transition-colors">Home</a>
          <span className="mx-1.5 text-zinc-700">›</span>
          <span className="text-zinc-400">Built with</span>
        </nav>

        <div className="pb-8 border-b border-zinc-800">
          <h1 className="text-3xl sm:text-4xl font-semibold text-zinc-100 leading-tight">
            What is this website built with?
          </h1>
          <p className="mt-3 text-[14px] text-zinc-400 leading-relaxed max-w-2xl">{BUILT_WITH_INTRO}</p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <AnalyzeCta label="Analyze a website" />
            <span className="text-[12.5px] text-zinc-500">
              Free, no login. Builder detection is part of every report.
            </span>
          </div>
        </div>

        <section className="mt-10" aria-labelledby="how-it-works">
          <h2 id="how-it-works" className={`${eyebrow} mb-4`}>How detection works</h2>
          <ul className="grid gap-3 sm:grid-cols-3">
            {HOW_DETECTION_WORKS.map((t) => (
              <li key={t} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-[13.5px] text-zinc-400 leading-relaxed">{t}</li>
            ))}
          </ul>
        </section>

        <section className="mt-10" aria-labelledby="ai-builders">
          <h2 id="ai-builders" className={`${eyebrow} mb-4`}>AI website builders we detect ({ai.length})</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ai.map((b) => <BuilderCard key={b.slug} builder={b} />)}
          </div>
        </section>

        <section className="mt-10" aria-labelledby="nocode-builders">
          <h2 id="nocode-builders" className={`${eyebrow} mb-4`}>No-code website builders we detect ({noCode.length})</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {noCode.map((b) => <BuilderCard key={b.slug} builder={b} />)}
          </div>
        </section>

        <section className="mt-10" aria-labelledby="limits">
          <h2 id="limits" className={`${eyebrow} mb-4`}>What it cannot detect</h2>
          <ul className="flex flex-col gap-2">
            {DETECTION_LIMITS.map((t) => (
              <li key={t} className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-[13.5px] text-zinc-400 leading-relaxed">{t}</li>
            ))}
          </ul>
        </section>

        <p className="mt-10 text-[13.5px] text-zinc-500 leading-relaxed">
          Already know the builder and want to fix what the audit found?{" "}
          <a href="/guides" className={link}>Browse the fix guides</a> or{" "}
          <a href="/compare" className={link}>compare two sites side by side</a>.
        </p>
      </div>
    </main>
  );
}

export function BuilderDetailPage({ slug }: { slug: string }) {
  const builder = BUILDERS[slug];

  useEffect(() => {
    if (builder) window.scrollTo({ top: 0 });
  }, [slug, builder]);

  if (!builder) {
    return (
      <main className="flex-1 px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-6xl mx-auto text-center py-20">
          <p className="text-lg text-zinc-300">Builder not found</p>
          <p className="mt-2 text-sm text-zinc-500">We may not detect this one yet.</p>
          <a href="/built-with" className={`mt-6 inline-flex text-sm ${link}`}>All builders we detect</a>
        </div>
      </main>
    );
  }

  const name = displayName(builder);
  const related = relatedBuilders(builder);

  return (
    <main className="flex-1">
      <div className="border-b border-zinc-800 bg-zinc-950/60 px-4 sm:px-6 lg:px-8 pt-8 pb-7">
        <div className="max-w-6xl mx-auto">
          <nav aria-label="Breadcrumb" className="text-[12px] text-zinc-500 mb-5">
            <a href="/" className="hover:text-zinc-300 transition-colors">Home</a>
            <span className="mx-1.5 text-zinc-700">›</span>
            <a href="/built-with" className="hover:text-zinc-300 transition-colors">Built with</a>
            <span className="mx-1.5 text-zinc-700">›</span>
            <span className="text-zinc-400">{name}</span>
          </nav>
          <span className={`inline-flex items-center text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded border mb-3 ${kindBadge(builder.kind)}`}>
            {kindLabel(builder.kind)}
          </span>
          <h1 className="text-2xl sm:text-[28px] font-semibold text-zinc-100 leading-snug mb-2">{builderTitle(builder)}</h1>
          <p className="text-[13.5px] text-zinc-500 leading-relaxed max-w-xl">{builder.summary}</p>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <AnalyzeCta label="Check a website now" />
            <span className="text-[12.5px] text-zinc-500">
              The Overview card shows “Built with {name}” when the page matches.
            </span>
          </div>
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-0">
          <div className="w-full lg:w-80 flex-shrink-0 lg:border-r lg:border-zinc-800 lg:pr-8 lg:mr-8 flex flex-col gap-4 mb-8 lg:mb-0">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <h2 className={`${eyebrow} mb-2`}>What {name} is</h2>
              <p className="text-[13px] text-zinc-400 leading-relaxed">{builder.whatItIs}</p>
              <a href={builder.website} target="_blank" rel="nofollow noopener noreferrer" className={`mt-3 inline-flex text-[12px] ${link}`}>
                {name} website
              </a>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <h2 className={`${eyebrow} mb-2`}>Signals the analyzer checks</h2>
              <p className="text-[12.5px] text-zinc-500 leading-relaxed mb-3">
                Any one of these strings in the page HTML reports {name} with high confidence.
              </p>
              <ul className="flex flex-col gap-1.5">
                {builder.signals.map((sig) => (
                  <li key={sig}>
                    <code className="block rounded bg-zinc-950 border border-zinc-800 px-2 py-1 text-[12px] text-zinc-300 break-all">{sig}</code>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <section aria-labelledby="manual-checks">
              <h2 id="manual-checks" className={`${eyebrow} mb-5`}>
                How to check it yourself — {builder.manualChecks.length} steps
              </h2>
              <ol className="flex flex-col gap-3">
                {builder.manualChecks.map((step, i) => (
                  <li key={i} className="flex gap-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                    <span className="shrink-0 text-[11px] font-bold tabular-nums text-zinc-600 w-5 pt-0.5">{i + 1}</span>
                    <p className="text-[14px] text-zinc-300 leading-relaxed">{step}</p>
                  </li>
                ))}
              </ol>
            </section>

            <section className="mt-8" aria-labelledby="implications">
              <h2 id="implications" className={`${eyebrow} mb-3`}>What {name} sites usually show in an audit</h2>
              <ul className="flex flex-col gap-2">
                {builder.implications.map((t) => (
                  <li key={t} className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-4 py-3 text-[13.5px] text-zinc-400 leading-relaxed">{t}</li>
                ))}
              </ul>
              <p className="mt-4 text-[13.5px] text-zinc-500 leading-relaxed">
                These are tendencies from audits, not rules.{" "}
                <a href="/" className={link}>Run the analyzer</a> on the site in question, then use the{" "}
                <a href="/guides" className={link}>fix guides</a> for anything it flags, or{" "}
                <a href="/compare" className={link}>compare it with a competitor</a>.
              </p>
            </section>

            {related.length > 0 && (
              <section className="mt-10 pt-8 border-t border-zinc-800" aria-labelledby="related-builders">
                <h2 id="related-builders" className={`${eyebrow} mb-4`}>Related builders</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {related.map((b) => <BuilderCard key={b.slug} builder={b} />)}
                </div>
                <a href="/built-with" className={`mt-5 inline-flex text-[12.5px] ${link}`}>
                  All {Object.keys(BUILDERS).length} builders we detect
                </a>
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
