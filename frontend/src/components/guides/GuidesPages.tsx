import { useEffect, useState, useMemo } from "react";
import { CATEGORY_ORDER, GUIDES, guideForIssue, type Guide, type GuideCategory } from "../../guides/guides";

// Tool name → URL for clickable links
const TOOL_URLS: Record<string, string> = {
  "PageSpeed Insights":       "https://pagespeed.web.dev/",
  "Squoosh":                  "https://squoosh.app/",
  "WebPageTest":              "https://www.webpagetest.org/",
  "TinyPNG":                  "https://tinypng.com/",
  "Lighthouse":               "https://developer.chrome.com/docs/lighthouse/overview/",
  "Google Search Console":    "https://search.google.com/search-console/",
  "Google Rich Results Test": "https://search.google.com/test/rich-results",
  "Schema.org generator":     "https://schema.org/",
  "Facebook Sharing Debugger":"https://developers.facebook.com/tools/debug/",
  "LinkedIn Post Inspector":  "https://www.linkedin.com/post-inspector/",
  "Let's Encrypt":            "https://letsencrypt.org/",
  "SSL Labs Server Test":     "https://www.ssllabs.com/ssltest/",
  "Cloudflare":               "https://www.cloudflare.com/",
  "securityheaders.com":      "https://securityheaders.com/",
  "Mozilla Observatory":      "https://observatory.mozilla.org/",
  "Screaming Frog":           "https://www.screamingfrog.co.uk/seo-spider/",
  "Ahrefs":                   "https://ahrefs.com/",
  "Hemingway Editor":         "https://hemingwayapp.com/",
  "Termly":                   "https://termly.io/",
  "iubenda":                  "https://www.iubenda.com/",
  "Hotjar":                   "https://www.hotjar.com/",
  "Why No Padlock":           "https://www.whynopadlock.com/",
  "WAVE accessibility extension": "https://wave.webaim.org/",
};

function toolUrl(name: string): string | null {
  for (const [key, url] of Object.entries(TOOL_URLS)) {
    if (name.startsWith(key)) return url;
  }
  return null;
}

// Per-category accent color (hex) used for dots and dividers
function categoryColor(c: GuideCategory): string {
  switch (c) {
    case "Performance":     return "#f59e0b";
    case "SEO":             return "#22c55e";
    case "UX & Conversion": return "#a855f7";
    case "Security":        return "#ef4444";
    case "Content":         return "#3b82f6";
  }
}

// Badge classes — solid dark pattern matching app convention
function categoryBadge(c: GuideCategory): string {
  switch (c) {
    case "Performance":     return "text-amber-400 bg-amber-950 border-amber-800";
    case "SEO":             return "text-emerald-400 bg-emerald-950 border-emerald-800";
    case "UX & Conversion": return "text-violet-400 bg-violet-950 border-violet-800";
    case "Security":        return "text-red-400 bg-red-950 border-red-800";
    case "Content":         return "text-blue-400 bg-blue-950 border-blue-800";
  }
}

function CategoryIcon({ category, className = "w-3.5 h-3.5" }: { category: GuideCategory; className?: string }) {
  switch (category) {
    case "Performance":
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
    case "SEO":
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
    case "UX & Conversion":
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
    case "Security":
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
    case "Content":
      return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
  }
}

// ── Index page card ───────────────────────────────────────────────────────────

function GuideCard({ guide }: { guide: Guide }) {
  const color = categoryColor(guide.category);
  return (
    <a
      href={`/guides/${guide.slug}`}
      className="group block rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 hover:border-zinc-700 hover:bg-zinc-900 transition-all duration-150"
    >
      <h3 className="text-[13.5px] font-medium text-zinc-100 group-hover:text-white leading-snug mb-2 transition-colors">
        {guide.title}
      </h3>
      <p className="text-[12px] text-zinc-500 leading-relaxed mb-3 line-clamp-2">{guide.summary}</p>
      <span className="inline-flex items-center gap-1 text-[11.5px] font-medium transition-colors" style={{ color }}>
        Read guide
        <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
        </svg>
      </span>
    </a>
  );
}

// ── Index page ─────────────────────────────────────────────────────────────────

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
    <div className="flex-1 px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-8 border-b border-zinc-800">
          <div>
            <h1 className="text-3xl sm:text-4xl font-semibold text-zinc-100 leading-tight">
              Fix guides
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              {Object.keys(GUIDES).length} step-by-step repair guides, grouped by topic
            </p>
          </div>

          {/* Search */}
          <div className="relative shrink-0 w-full sm:w-56">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search guides…"
              aria-label="Search guides"
              className="w-full pl-9 pr-8 py-2.5 rounded-lg border border-zinc-800 bg-zinc-900/60 text-[12.5px] text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 transition-colors"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {filtered.length === 0 && (
          <p className="mt-10 text-sm text-zinc-500">No guides match "{query}". Try a different search.</p>
        )}

        {/* Category sections */}
        <div className="mt-10 flex flex-col gap-12">
          {grouped.map(({ category, guides }) => {
            const color = categoryColor(category);
            return (
              <section key={category}>
                {/* Section header */}
                <div className="flex items-center gap-3 pb-3 mb-5" style={{ borderBottom: `1.5px solid ${color}22` }}>
                  <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: color }} />
                  <h2 className="text-[13px] font-semibold" style={{ color }}>
                    {category}
                  </h2>
                  <span className="text-[11px] text-zinc-600">{guides.length} guide{guides.length !== 1 ? "s" : ""}</span>
                </div>

                {/* Cards */}
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {guides.map((g) => <GuideCard key={g.slug} guide={g} />)}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Detail page ────────────────────────────────────────────────────────────────

export function GuideDetailPage({ slug }: { slug: string }) {
  const guide = GUIDES[slug];

  useEffect(() => {
    if (guide) window.scrollTo({ top: 0 });
  }, [slug, guide]);

  if (!guide) {
    return (
      <div className="flex-1 px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-6xl mx-auto text-center py-20">
          <p className="text-lg text-zinc-300">Guide not found</p>
          <p className="mt-2 text-sm text-zinc-500">It may have been renamed.</p>
          <a href="/guides" className="mt-6 inline-flex text-sm text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors">
            Browse all guides
          </a>
        </div>
      </div>
    );
  }

  const color = categoryColor(guide.category);
  const related = Object.values(GUIDES)
    .filter((g) => g.category === guide.category && g.slug !== guide.slug)
    .slice(0, 3);

  return (
    <div className="flex-1">
      {/* ── Hero header ── */}
      <div className="border-b border-zinc-800 bg-zinc-950/60 px-4 sm:px-6 lg:px-8 pt-8 pb-0">
        <div className="max-w-6xl mx-auto">
          <a href="/guides" className="inline-flex items-center gap-1.5 text-[12px] text-zinc-500 hover:text-zinc-300 transition-colors mb-5">
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            All guides
          </a>

          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-5">
            <div className="min-w-0">
              <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded border mb-3 ${categoryBadge(guide.category)}`}>
                <CategoryIcon category={guide.category} className="w-3 h-3" />
                {guide.category}
              </span>
              <h1 className="text-2xl sm:text-[28px] font-semibold text-zinc-100 leading-snug mb-2">
                {guide.title}
              </h1>
              <p className="text-[13.5px] text-zinc-500 leading-relaxed max-w-xl">
                {guide.summary}
              </p>
            </div>

          </div>

          {/* Spacer so border-b appears below the content */}
          <div className="mt-7" />
        </div>
      </div>

      {/* ── Body: left info / right timeline ── */}
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-0">

          {/* Left column */}
          <div className="w-full lg:w-72 flex-shrink-0 lg:border-r lg:border-zinc-800 lg:pr-8 lg:mr-8 flex flex-col gap-4 mb-8 lg:mb-0">
            {/* What this means */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">What this means</p>
              <p className="text-[13px] text-zinc-400 leading-relaxed">{guide.whatItMeans}</p>
            </div>

            {/* Why it matters */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-2">Why it matters</p>
              <p className="text-[13px] text-zinc-400 leading-relaxed">{guide.whyItMatters}</p>
            </div>

            {/* Tools */}
            {guide.tools && guide.tools.length > 0 && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-3">Helpful tools</p>
                <div className="flex flex-col gap-0 divide-y divide-zinc-800">
                  {guide.tools.map((tool) => {
                    const url = toolUrl(tool);
                    return url ? (
                      <a
                        key={tool}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between py-2 group"
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 flex-shrink-0" />
                          <span className="text-[12.5px] text-zinc-500 group-hover:text-zinc-300 transition-colors leading-snug">{tool}</span>
                        </span>
                        <svg className="w-3 h-3 text-zinc-700 group-hover:text-violet-400 transition-colors flex-shrink-0 ml-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                        </svg>
                      </a>
                    ) : (
                      <div key={tool} className="flex items-center gap-2 py-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-700 flex-shrink-0" />
                        <span className="text-[12.5px] text-zinc-500 leading-snug">{tool}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right column — timeline */}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-5">
              How to fix it — {guide.steps.length} step{guide.steps.length !== 1 ? "s" : ""}
            </p>

            {/* Steps */}
            <div className="flex flex-col gap-3">
              {guide.steps.map((step, i) => {
                const image = guide.stepImages?.[i];
                return (
                  <div key={i} className="flex gap-4 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
                    <span className="shrink-0 text-[11px] font-bold tabular-nums text-zinc-600 w-5 pt-0.5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] text-zinc-300 leading-relaxed">{step}</p>
                      {image && (
                        <figure className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/60 overflow-hidden">
                          <img src={image.src} alt={image.caption} loading="lazy" className="w-full" />
                          {image.caption && (
                            <figcaption className="px-3 py-2 text-[11px] text-zinc-500 border-t border-zinc-800/70">{image.caption}</figcaption>
                          )}
                        </figure>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Related guides */}
            {related.length > 0 && (
              <div className="mt-10 pt-8 border-t border-zinc-800">
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 mb-4">Related guides</p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {related.map((g) => <GuideCard key={g.slug} guide={g} />)}
                </div>
              </div>
            )}
          </div>
        </div>
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
