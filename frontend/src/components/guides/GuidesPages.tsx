import { useEffect } from "react";
import { CATEGORY_ORDER, GUIDES, guideForIssue, type Guide, type GuideCategory } from "../../guides/guides";

// Shared shell bits — the pages render inside PageShell (header/footer come
// from the app shell), so these only own their content column.

function Container({ children }: { children: React.ReactNode }) {
  return <div className="flex-1 px-4 sm:px-6 py-8 sm:py-10"><div className="max-w-3xl mx-auto">{children}</div></div>;
}

function categoryTone(c: GuideCategory): string {
  switch (c) {
    case "Performance":      return "text-amber-300 bg-amber-500/10 border-amber-500/25";
    case "SEO":              return "text-emerald-300 bg-emerald-500/10 border-emerald-500/25";
    case "UX & Conversion":  return "text-violet-300 bg-violet-500/10 border-violet-500/25";
    case "Security":         return "text-red-300 bg-red-500/10 border-red-500/25";
    case "Content":          return "text-blue-300 bg-blue-500/10 border-blue-500/25";
  }
}

function GuideCard({ guide }: { guide: Guide }) {
  return (
    <a
      href={`/guides/${guide.slug}`}
      className="block rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 hover:border-zinc-700 hover:bg-zinc-900/70 transition-colors"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-zinc-100">{guide.title}</h3>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${categoryTone(guide.category)}`}>
          {guide.category}
        </span>
      </div>
      <p className="mt-1 text-xs text-zinc-500 leading-snug">{guide.summary}</p>
    </a>
  );
}

/** /guides — the full catalog, grouped by category. */
export function GuidesIndexPage() {
  const grouped = CATEGORY_ORDER
    .map((c) => ({ category: c, guides: Object.values(GUIDES).filter((g) => g.category === c) }))
    .filter((g) => g.guides.length > 0);

  return (
    <Container>
      <h1 className="text-xl font-bold text-zinc-100">Fix guides</h1>
      <p className="mt-1 text-xs text-zinc-500 max-w-xl leading-relaxed">
        Every issue our scanner can find, with plain-English steps to fix it. Reports link straight to the
        relevant guide — start here to browse.
      </p>
      <div className="mt-6 flex flex-col gap-7">
        {grouped.map(({ category, guides }) => (
          <section key={category}>
            <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">{category}</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {guides.map((g) => <GuideCard key={g.slug} guide={g} />)}
            </div>
          </section>
        ))}
      </div>
    </Container>
  );
}

/** /guides/:slug — one guide. Unknown slugs render a friendly miss. */
export function GuideDetailPage({ slug }: { slug: string }) {
  const guide = GUIDES[slug];

  useEffect(() => {
    if (guide) window.scrollTo({ top: 0 });
  }, [slug, guide]);

  if (!guide) {
    return (
      <Container>
        <div className="text-center py-16">
          <p className="text-sm text-zinc-300">Guide not found</p>
          <p className="mt-1 text-xs text-zinc-500">It may have been renamed.</p>
          <a href="/guides" className="mt-4 inline-flex text-xs text-violet-400 hover:text-violet-300 underline underline-offset-2">
            Browse all guides
          </a>
        </div>
      </Container>
    );
  }

  const related = Object.values(GUIDES).filter((g) => g.category === guide.category && g.slug !== guide.slug).slice(0, 3);

  return (
    <Container>
      <a href="/guides" className="text-[11px] text-zinc-500 hover:text-zinc-300 transition-colors">← All guides</a>

      <div className="mt-3 flex items-center gap-2 flex-wrap">
        <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${categoryTone(guide.category)}`}>
          {guide.category}
        </span>
      </div>
      <h1 className="mt-2 text-xl font-bold text-zinc-100">{guide.title}</h1>
      <p className="mt-1 text-sm text-zinc-400">{guide.summary}</p>

      <section className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">What this means</h2>
        <p className="mt-2 text-sm text-zinc-300 leading-relaxed">{guide.whatItMeans}</p>
        <h2 className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Why it matters</h2>
        <p className="mt-2 text-sm text-zinc-300 leading-relaxed">{guide.whyItMatters}</p>
      </section>

      <section className="mt-4 rounded-xl border border-violet-500/25 bg-violet-500/5 p-5">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-violet-300">How to fix it</h2>
        <ol className="mt-3 flex flex-col gap-2.5">
          {guide.steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="shrink-0 w-5 h-5 rounded-full bg-violet-500/20 text-violet-300 text-[10px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
              <span className="text-sm text-zinc-300 leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      {guide.tools && guide.tools.length > 0 && (
        <section className="mt-4">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Helpful tools</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {guide.tools.map((t) => (
              <span key={t} className="rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-1 text-[11px] text-zinc-400">{t}</span>
            ))}
          </div>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-8">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">Related guides</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {related.map((g) => <GuideCard key={g.slug} guide={g} />)}
          </div>
        </section>
      )}
    </Container>
  );
}

/** Small link used inside report issue cards: "How to fix →". */
export function HowToFixLink({ issueId, className = "" }: { issueId: string; className?: string }) {
  const guide = guideForIssue(issueId);
  if (!guide) return null;
  return (
    <a
      href={`/guides/${guide.slug}`}
      className={`inline-flex items-center gap-1 text-[11px] font-semibold text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors ${className}`}
      aria-label={`How to fix: ${guide.title}`}
    >
      How to fix
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
      </svg>
    </a>
  );
}
