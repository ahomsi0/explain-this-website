import { useEffect, useState, useMemo } from "react";
import { CATEGORY_ORDER, GUIDES, guideForIssue, type Guide, type GuideCategory } from "../../guides/guides";

// Shared shell bits — the pages render inside PageShell (header/footer come
// from the app shell), so these only own their content column.

function Container({ children }: { children: React.ReactNode }) {
  return <div className="flex-1 px-4 sm:px-6 lg:px-8 py-8 sm:py-12"><div className="max-w-5xl mx-auto">{children}</div></div>;
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

function CategoryIcon({ category, className = "w-4 h-4" }: { category: GuideCategory; className?: string }) {
  switch (category) {
    case "Performance":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
        </svg>
      );
    case "SEO":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      );
    case "UX & Conversion":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
        </svg>
      );
    case "Security":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      );
    case "Content":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
        </svg>
      );
  }
}

function GuideCard({ guide }: { guide: Guide }) {
  return (
    <a
      href={`/guides/${guide.slug}`}
      className="group block rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-5 sm:p-6 hover:border-zinc-700/80 hover:bg-zinc-900/80 transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="text-base sm:text-lg font-semibold text-zinc-100 group-hover:text-white transition-colors leading-snug">{guide.title}</h3>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider ${categoryTone(guide.category)}`}>
          {guide.category}
        </span>
      </div>
      <p className="mt-2.5 text-sm sm:text-[15px] text-zinc-400 leading-relaxed">{guide.summary}</p>
      <div className="mt-4 flex items-center gap-1.5 text-violet-400 group-hover:text-violet-300 transition-colors">
        <span className="text-xs sm:text-sm font-medium">Read guide</span>
        <svg className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
        </svg>
      </div>
    </a>
  );
}

/** /guides — the full catalog, grouped by category. */
export function GuidesIndexPage() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return Object.values(GUIDES);
    return Object.values(GUIDES).filter((g) =>
      g.title.toLowerCase().includes(q) ||
      g.summary.toLowerCase().includes(q) ||
      g.category.toLowerCase().includes(q) ||
      g.steps.some((s) => s.toLowerCase().includes(q))
    );
  }, [query]);

  const grouped = CATEGORY_ORDER
    .map((c) => ({ category: c, guides: filtered.filter((g) => g.category === c) }))
    .filter((g) => g.guides.length > 0);

  return (
    <Container>
      <div className="max-w-2xl">
        <h1 className="text-3xl sm:text-4xl font-bold text-zinc-100 tracking-tight">Fix guides</h1>
        <p className="mt-3 text-base sm:text-lg text-zinc-400 leading-relaxed">
          Every issue our scanner can find, with plain-English steps to fix it. Reports link straight to the
          relevant guide — start here to browse.
        </p>
      </div>

      <div className="mt-8 relative max-w-lg">
        <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-zinc-500 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search guides..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-800 bg-zinc-900/50 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 focus:ring-1 focus:ring-zinc-700 transition-colors"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      {filtered.length === 0 && (
        <p className="mt-8 text-sm text-zinc-500">No guides match "{query}". Try a different search.</p>
      )}

      <div className="mt-8 sm:mt-10 flex flex-col gap-10 sm:gap-12">
        {grouped.map(({ category, guides }) => (
          <section key={category}>
            <div className="flex items-center gap-2.5 mb-4">
              <CategoryIcon category={category} className="w-4 h-4 text-zinc-400" />
              <h2 className="text-sm sm:text-[15px] font-semibold uppercase tracking-wider text-zinc-300">{category}</h2>
              <span className="text-xs text-zinc-500 font-medium">({guides.length})</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
        <div className="text-center py-20">
          <p className="text-lg text-zinc-300">Guide not found</p>
          <p className="mt-2 text-sm text-zinc-500">It may have been renamed.</p>
          <a href="/guides" className="mt-6 inline-flex text-sm text-violet-400 hover:text-violet-300 underline underline-offset-2">
            Browse all guides
          </a>
        </div>
      </Container>
    );
  }

  const related = Object.values(GUIDES).filter((g) => g.category === guide.category && g.slug !== guide.slug).slice(0, 3);

  return (
    <div className="flex-1 px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="max-w-3xl mx-auto">
        <a href="/guides" className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">← All guides</a>

        <div className="mt-4 flex items-center gap-2.5 flex-wrap">
          <span className={`rounded-full border px-2.5 py-1 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider ${categoryTone(guide.category)}`}>
            {guide.category}
          </span>
        </div>
        <h1 className="mt-3 text-2xl sm:text-3xl font-bold text-zinc-100 tracking-tight">{guide.title}</h1>
        <p className="mt-2.5 text-base sm:text-lg text-zinc-400 leading-relaxed">{guide.summary}</p>

        <section className="mt-8 rounded-2xl border border-zinc-800/80 bg-zinc-900/50 p-6 sm:p-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">What this means</h2>
          <p className="mt-3 text-[15px] text-zinc-300 leading-relaxed">{guide.whatItMeans}</p>
          <h2 className="mt-6 text-sm font-semibold uppercase tracking-wider text-zinc-300">Why it matters</h2>
          <p className="mt-3 text-[15px] text-zinc-300 leading-relaxed">{guide.whyItMatters}</p>
        </section>

        <section className="mt-6 rounded-2xl border border-violet-500/25 bg-violet-500/5 p-6 sm:p-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-violet-300">How to fix it</h2>
          <ol className="mt-4 flex flex-col gap-4">
            {guide.steps.map((step, i) => {
              const image = guide.stepImages?.[i];
              return (
                <li key={i} className="flex flex-col gap-3">
                  <div className="flex gap-3.5">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-violet-500/20 text-violet-300 text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                    <span className="text-[15px] text-zinc-300 leading-relaxed">{step}</span>
                  </div>
                  {image && (
                    <figure className="ml-9 rounded-xl border border-zinc-800 bg-zinc-950/60 overflow-hidden">
                      <img src={image.src} alt={image.caption} loading="lazy" className="w-full" />
                      {image.caption && (
                        <figcaption className="px-4 py-2.5 text-xs text-zinc-500 leading-snug border-t border-zinc-800/70">{image.caption}</figcaption>
                      )}
                    </figure>
                  )}
                </li>
              );
            })}
          </ol>
        </section>

        {guide.tools && guide.tools.length > 0 && (
          <section className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300">Helpful tools</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {guide.tools.map((t) => (
                <span key={t} className="rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-1.5 text-sm text-zinc-400">{t}</span>
              ))}
            </div>
          </section>
        )}

        {related.length > 0 && (
          <section className="mt-10">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-300 mb-4">Related guides</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((g) => <GuideCard key={g.slug} guide={g} />)}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

/** Small link used inside report issue cards: "How to fix →". */
export function HowToFixLink({ issueId, className = "" }: { issueId: string; className?: string }) {
  const guide = guideForIssue(issueId);
  if (!guide) return null;
  return (
    <a
      href={`/guides/${guide.slug}`}
      className={`inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors ${className}`}
      aria-label={`How to fix: ${guide.title}`}
    >
      How to fix
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
      </svg>
    </a>
  );
}
