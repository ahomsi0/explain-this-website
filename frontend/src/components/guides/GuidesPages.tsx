import { useEffect, useState, useMemo } from "react";
import { CATEGORY_ORDER, GUIDES, guideForIssue, relatedGuides, type Guide, type GuideCategory } from "../../guides/guides";
import { Callout, Chip, FaqGrid, IconList, PageHero, PageMain, Panel, PanelTitle, SectionLabel, inputCls, linkCls, primaryBtn, secondaryBtn, type Tone } from "../ui/Panel";
import { Icon } from "../ui/icons";

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

// ── Shared bits ────────────────────────────────────────────────────────────────

const CATEGORY_TONE: Record<GuideCategory, Tone> = {
  "Performance": "amber",
  "SEO": "emerald",
  "UX & Conversion": "violet",
  "Security": "red",
  "Content": "blue",
};

const CATEGORY_BLURB: Record<GuideCategory, string> = {
  "Performance": "Load faster on phones and desktops.",
  "SEO": "Help search engines find and rank the page.",
  "UX & Conversion": "Turn more visits into sign-ups and sales.",
  "Security": "Protect visitors and earn their trust.",
  "Content": "Copy that is current, clear and specific.",
};

function CategoryBadge({ category, size = "md" }: { category: GuideCategory; size?: "sm" | "md" }) {
  const tone = CATEGORY_TONE[category];
  const box = size === "sm" ? "w-7 h-7 rounded-md" : "w-9 h-9 rounded-lg";
  const glyph = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  const colors = { amber: "bg-amber-500/10 text-amber-300", emerald: "bg-emerald-500/10 text-emerald-300", violet: "bg-violet-500/10 text-violet-300", red: "bg-red-500/10 text-red-300", blue: "bg-blue-500/10 text-blue-300", zinc: "bg-zinc-800 text-zinc-300" }[tone];
  return (
    <span className={`inline-flex shrink-0 items-center justify-center ${box} ${colors}`} aria-hidden="true">
      <CategoryIcon category={category} className={glyph} />
    </span>
  );
}

function GuideCard({ guide, headingLevel = "h3" }: { guide: Guide; headingLevel?: "h2" | "h3" }) {
  const H = headingLevel;
  return (
    <a
      href={`/guides/${guide.slug}`}
      className="group flex h-full flex-col rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 hover:border-zinc-700 hover:bg-zinc-900/70 transition-colors"
    >
      <div className="flex items-center justify-between gap-3">
        <CategoryBadge category={guide.category} size="sm" />
        <span className="text-[11px] text-zinc-500">{guide.steps.length} steps</span>
      </div>
      <H className="mt-4 text-[14px] font-semibold leading-snug text-zinc-100">{guide.title}</H>
      <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500 line-clamp-2">{guide.summary}</p>
      <span className="mt-auto pt-4 inline-flex items-center gap-1.5 text-[12px] font-medium text-zinc-400 group-hover:text-violet-300 transition-colors">
        Read guide
        <Icon name="arrowRight" className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
      </span>
    </a>
  );
}

// ── Index page ─────────────────────────────────────────────────────────────────

export function GuidesIndexPage() {
  const [query, setQuery] = useState("");
  const [only, setOnly] = useState<GuideCategory | null>(null);
  const all = Object.values(GUIDES);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return all;
    return all.filter((g) =>
      g.title.toLowerCase().includes(q) ||
      g.summary.toLowerCase().includes(q) ||
      g.category.toLowerCase().includes(q) ||
      g.steps.some((s) => s.toLowerCase().includes(q))
    );
  }, [query, all]);

  const grouped = CATEGORY_ORDER
    .filter((c) => !only || c === only)
    .map((c) => ({ category: c, guides: filtered.filter((g) => g.category === c) }))
    .filter((g) => g.guides.length > 0);

  const filterChip = (active: boolean) =>
    `inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${active ? "border-violet-500/40 bg-violet-500/10 text-violet-300" : "border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"}`;

  const search = (
    <Panel>
      <label htmlFor="guide-search" className="text-[13px] font-semibold text-zinc-200">Find a guide</label>
      <div className="relative mt-3">
        <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
        <input
          id="guide-search"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search guides, e.g. canonical"
          aria-label="Search guides"
          className={`${inputCls} pl-9 pr-9`}
        />
        {query && (
          <button onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors">
            <Icon name="x" className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter by topic">
        <button type="button" onClick={() => setOnly(null)} aria-pressed={!only} className={filterChip(!only)}>
          All <span className="text-zinc-500">{all.length}</span>
        </button>
        {CATEGORY_ORDER.map((c) => (
          <button key={c} type="button" onClick={() => setOnly(only === c ? null : c)} aria-pressed={only === c} className={filterChip(only === c)}>
            {c} <span className="text-zinc-500">{all.filter((g) => g.category === c).length}</span>
          </button>
        ))}
      </div>
    </Panel>
  );

  return (
    <PageMain>
      <PageHero
        eyebrow="Fix guides"
        title="Fix what the audit found"
        intro={`${all.length} plain-English, step-by-step repair guides, grouped by topic. Each one says what the problem is, why it matters and exactly how to fix it.`}
        aside={search}
      />

      {grouped.length === 0 && (
        <Panel className="mt-12 text-center">
          <p className="text-[14px] text-zinc-300">No guides match “{query}”.</p>
          <p className="mt-1 text-[13px] text-zinc-500">Try a different word, or clear the search.</p>
        </Panel>
      )}

      <div className="mt-14 flex flex-col gap-12">
        {grouped.map(({ category, guides }) => (
          <section key={category} aria-labelledby={`cat-${CATEGORY_TONE[category]}`}>
            <div className="mb-5 flex items-center gap-3">
              <CategoryBadge category={category} />
              <div>
                <h2 id={`cat-${CATEGORY_TONE[category]}`} className="text-[15px] font-semibold text-zinc-100">
                  {category} <span className="ml-1 text-[12px] font-normal text-zinc-500">{guides.length} guide{guides.length !== 1 ? "s" : ""}</span>
                </h2>
                <p className="text-[13px] text-zinc-500">{CATEGORY_BLURB[category]}</p>
              </div>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {guides.map((g) => <li key={g.slug}><GuideCard guide={g} /></li>)}
            </ul>
          </section>
        ))}
      </div>
    </PageMain>
  );
}

// ── AI Prompt card ─────────────────────────────────────────────────────────────

function AiPromptButton({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <div className="rounded-xl border border-violet-500/30 bg-violet-500/10 p-4">
      <p className="flex items-center gap-2 text-[13px] font-semibold text-zinc-100">
        <Icon name="sparkle" className="w-4 h-4 text-violet-300" />
        Fix this with AI
      </p>
      <p className="mt-1 text-[12px] leading-relaxed text-zinc-400">Copy a ready-made prompt and paste it into ChatGPT or Claude.</p>
      <button type="button" onClick={copy} className={`${primaryBtn} mt-3 w-full !py-2 text-[13px]`}>
        <Icon name="clipboard" className="w-3.5 h-3.5" />
        {copied ? "Copied!" : "Copy prompt"}
      </button>
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
      <PageMain width="max-w-xl">
        <Panel className="text-center">
          <h1 className="text-lg font-semibold text-zinc-100">Guide not found</h1>
          <p className="mt-2 text-sm text-zinc-500">It may have been renamed.</p>
          <a href="/guides" className={`${secondaryBtn} mt-5`}>Browse all guides</a>
        </Panel>
      </PageMain>
    );
  }

  const related = relatedGuides(guide);
  const tone = CATEGORY_TONE[guide.category];

  const glance = (
    <Panel>
      <p className="text-[13px] font-semibold text-zinc-200">At a glance</p>
      <dl className="mt-3 divide-y divide-zinc-800 text-[13px]">
        <div className="flex justify-between gap-3 py-2.5"><dt className="text-zinc-500">Topic</dt><dd className="text-zinc-200">{guide.category}</dd></div>
        <div className="flex justify-between gap-3 py-2.5"><dt className="text-zinc-500">Steps</dt><dd className="text-zinc-200">{guide.steps.length}</dd></div>
        {guide.tools && guide.tools.length > 0 && (
          <div className="flex justify-between gap-3 py-2.5"><dt className="text-zinc-500">Free tools</dt><dd className="text-zinc-200">{guide.tools.length}</dd></div>
        )}
      </dl>
      {guide.aiPrompt && <div className="mt-3"><AiPromptButton prompt={guide.aiPrompt} /></div>}
    </Panel>
  );

  return (
    <PageMain>
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-1.5 text-[12px] text-zinc-500">
        <a href="/" className="hover:text-zinc-300 transition-colors">Home</a>
        <span aria-hidden="true">›</span>
        <a href="/guides" className="hover:text-zinc-300 transition-colors">Fix guides</a>
        <span aria-hidden="true">›</span>
        <span className="text-zinc-400">{guide.category}</span>
      </nav>

      <PageHero title={guide.title} intro={guide.summary} aside={glance}>
        <div className="mt-5 flex flex-wrap gap-2">
          <Chip tone={tone}><CategoryIcon category={guide.category} className="w-3 h-3" />{guide.category}</Chip>
          <Chip>{guide.steps.length} steps</Chip>
        </div>
      </PageHero>

      <div className="mt-12 grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
        {/* Main column */}
        <div className="flex flex-col gap-6 min-w-0">
          <Panel>
            <PanelTitle>How to fix it</PanelTitle>
            <ol className="mt-4 flex flex-col">
              {guide.steps.map((step, i) => {
                const image = guide.stepImages?.[i];
                return (
                  <li key={i} className="flex gap-3 py-3.5 border-t border-zinc-800 first:border-t-0 first:pt-0">
                    <span className="flex w-6 h-6 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-[11px] font-semibold tabular-nums text-zinc-300">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] leading-relaxed text-zinc-400">{step}</p>
                      {image && (
                        <figure className="mt-3 rounded-lg border border-zinc-800 bg-zinc-950/60 overflow-hidden">
                          <img src={image.src} alt={image.caption} loading="lazy" className="w-full" />
                          {image.caption && <figcaption className="px-3 py-2 text-[11px] text-zinc-500 border-t border-zinc-800/70">{image.caption}</figcaption>}
                        </figure>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </Panel>

          {guide.commonMistakes && guide.commonMistakes.length > 0 && (
            <Panel>
              <PanelTitle>Common mistakes</PanelTitle>
              <IconList items={guide.commonMistakes} icon="x" tone="red" />
            </Panel>
          )}

          {guide.howToVerify && (
            <Callout tone="emerald" icon="check" title={<h2>How to check it worked</h2>}>
              {guide.howToVerify}
            </Callout>
          )}

          {guide.deepDive?.map((sec) => (
            <Panel key={sec.heading}>
              <PanelTitle>{sec.heading}</PanelTitle>
              {sec.paragraphs?.map((p) => <p key={p} className="mt-3 text-[13.5px] leading-relaxed text-zinc-400">{p}</p>)}
              {sec.bullets && <IconList items={sec.bullets} icon="arrowRight" tone="violet" />}
            </Panel>
          ))}

          {guide.faq && guide.faq.length > 0 && (
            <section aria-labelledby="guide-faq">
              <SectionLabel id="guide-faq">Common questions</SectionLabel>
              <FaqGrid items={guide.faq} />
            </section>
          )}
        </div>

        {/* Side column */}
        <aside className="flex flex-col gap-6 lg:sticky lg:top-20">
          <Panel>
            <h2 className="text-[13px] font-semibold text-zinc-200">What this means</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">{guide.whatItMeans}</p>
          </Panel>
          <Panel>
            <h2 className="text-[13px] font-semibold text-zinc-200">Why it matters</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">{guide.whyItMatters}</p>
          </Panel>
          {guide.tools && guide.tools.length > 0 && (
            <Panel>
              <h2 className="text-[13px] font-semibold text-zinc-200">Helpful tools</h2>
              <ul className="mt-2 divide-y divide-zinc-800">
                {guide.tools.map((tool) => {
                  const url = toolUrl(tool);
                  return (
                    <li key={tool}>
                      {url ? (
                        <a href={url} target="_blank" rel="noopener noreferrer" className="group flex items-center justify-between gap-2 py-2.5 text-[13px] text-zinc-400 hover:text-zinc-100 transition-colors">
                          {tool}
                          <Icon name="arrowRight" className="w-3.5 h-3.5 shrink-0 -rotate-45 text-zinc-600 group-hover:text-violet-300 transition-colors" />
                        </a>
                      ) : (
                        <span className="block py-2.5 text-[13px] text-zinc-400">{tool}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </Panel>
          )}
          <Panel>
            <h2 className="text-[13px] font-semibold text-zinc-200">Does your site have this?</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-zinc-400">Run a free audit to find out, or see how you compare with a competitor.</p>
            <div className="mt-4 flex flex-col gap-2">
              <a href="/" className={`${primaryBtn} !py-2 text-[13px]`}>Analyze your website</a>
              <a href="/compare" className={`${secondaryBtn} !py-2 text-[13px]`}>Compare with a competitor</a>
            </div>
          </Panel>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-14" aria-labelledby="guide-related">
          <div className="mb-4 flex items-end justify-between gap-3">
            <SectionLabel id="guide-related">Related guides</SectionLabel>
            <a href="/guides" className={`mb-4 text-[12.5px] ${linkCls}`}>Browse all {Object.keys(GUIDES).length} fix guides</a>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((g) => <li key={g.slug}><GuideCard guide={g} /></li>)}
          </ul>
        </section>
      )}
    </PageMain>
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
