import { useState } from "react";
import type { SEOCheck } from "../../types/analysis";
import { CardShell } from "../ui/CardShell";
import { CardHeader } from "../ui/CardHeader";
import { ScoreInsight } from "../ui/ScoreInsight";

interface FixGuide { why: string; fix: string }

const FIX_GUIDES: Record<string, FixGuide> = {
  title:             { why: "Title tags are the #1 on-page SEO signal Google reads.", fix: "Add a unique, descriptive <title> under 60 characters to every page." },
  "meta-desc":       { why: "Meta descriptions improve click-through rate from search results.", fix: "Write a compelling meta description between 120–160 characters." },
  h1:                { why: "A single H1 signals the page's main topic to search engines.", fix: "Add exactly one H1 tag that matches your primary keyword." },
  canonical:         { why: "Canonical tags prevent duplicate content penalties.", fix: "Add <link rel=\"canonical\"> pointing to the authoritative URL." },
  "og-tags":         { why: "Open Graph tags control how your page appears when shared on social media.", fix: "Add og:title, og:description, and og:image meta tags." },
  sitemap:           { why: "A sitemap helps search engines discover and index all your pages.", fix: "Submit an XML sitemap at /sitemap.xml to Google Search Console." },
  robots:            { why: "A robots.txt file controls what search engines can crawl.", fix: "Add a robots.txt file at the root of your domain." },
  "structured-data": { why: "Structured data enables rich results (ratings, FAQs) in Google.", fix: "Add JSON-LD schema markup relevant to your content type." },
  "alt-text":        { why: "Missing alt text means Google can't understand your images.", fix: "Add descriptive alt attributes to all meaningful images." },
  https:             { why: "HTTPS is a Google ranking signal and required for user trust.", fix: "Redirect all HTTP traffic to HTTPS and install a valid SSL certificate." },
  "lang-attr":       { why: "The lang attribute helps search engines serve the right language version.", fix: "Add lang=\"en\" (or appropriate code) to your <html> tag." },
  "broken-links":    { why: "Broken links signal poor site quality to Google and frustrate users.", fix: "Audit links regularly and fix or remove 404s." },
  viewport:          { why: "A viewport meta tag is required for proper mobile rendering.", fix: "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">." },
};

function getFixGuide(checkId: string): FixGuide | null {
  if (FIX_GUIDES[checkId]) return FIX_GUIDES[checkId];
  const key = Object.keys(FIX_GUIDES).find((k) => checkId.includes(k));
  return key ? FIX_GUIDES[key] : null;
}

function statusStyle(s: string) {
  if (s === "pass")    return { dot: "bg-emerald-500", label: "text-emerald-400", text: "Pass" };
  if (s === "warning") return { dot: "bg-amber-500",   label: "text-amber-400",   text: "Warn" };
  return                      { dot: "bg-red-500",     label: "text-red-400",     text: "Fail" };
}

function CheckRow({ check }: { check: SEOCheck }) {
  const [open, setOpen] = useState(false);
  const s = statusStyle(check.status);
  const hasDetails = check.details && check.details.length > 0;
  const guide = check.status !== "pass" ? getFixGuide(check.id) : null;
  const isExpandable = hasDetails || !!guide;

  return (
    <div className="border-b border-zinc-800/60 last:border-0">
      <div
        className={`flex items-start gap-2.5 py-2.5 ${isExpandable ? "cursor-pointer select-none" : ""}`}
        onClick={() => isExpandable && setOpen((o) => !o)}
      >
        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${s.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-200">{check.label}</span>
            <span className={`text-[10px] font-semibold ${s.label}`}>{s.text}</span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{check.detail}</p>
        </div>
        {isExpandable && (
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className={`shrink-0 mt-1 text-zinc-600 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        )}
      </div>

      {isExpandable && open && (
        <div className="mb-2.5 ml-4 pl-2.5 border-l border-zinc-800 flex flex-col gap-2">
          {hasDetails && check.details!.map((item, i) => (
            <span key={i} className="text-[11px] text-zinc-500 leading-relaxed break-all">{item}</span>
          ))}
          {guide && (
            <div className="flex flex-col gap-1.5 py-1">
              <div className="flex gap-2 items-start">
                <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wide shrink-0">Why it matters</span>
                <span className="text-[11px] text-zinc-400 leading-snug">{guide.why}</span>
              </div>
              <div className="flex gap-2 items-start">
                <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wide shrink-0">How to fix</span>
                <span className="text-[11px] text-zinc-400 leading-snug">{guide.fix}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function seoInsightText(score: number): { meaning: string; nextStep: string } {
  if (score >= 80) return {
    meaning: "Your SEO fundamentals are strong — most key signals are properly set up.",
    nextStep: "Focus on content quality and building backlinks to keep improving rankings.",
  };
  if (score >= 50) return {
    meaning: "Your SEO is decent but missing several optimizations that affect visibility.",
    nextStep: "Fix the failing checks above — meta tags and headings have the biggest impact.",
  };
  return {
    meaning: "Critical SEO issues are likely preventing your site from ranking well.",
    nextStep: "Start with title tags and meta descriptions — they take minutes to fix and matter most.",
  };
}

export function SEOAuditCard({ seoChecks }: { seoChecks: SEOCheck[] }) {
  const pass    = seoChecks.filter((c) => c.status === "pass").length;
  const warning = seoChecks.filter((c) => c.status === "warning").length;
  const fail    = seoChecks.filter((c) => c.status === "fail").length;
  const score   = seoChecks.length ? Math.round((pass / seoChecks.length) * 100) : 0;
  const insight = seoInsightText(score);

  return (
    <CardShell>
      <CardHeader
        title="SEO Audit"
        badge={`${pass}/${seoChecks.length}`}
        badgeColor={pass / seoChecks.length >= 0.8 ? "green" : pass / seoChecks.length >= 0.5 ? "amber" : "red"}
      />
      <div className="p-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-zinc-600"><span className="text-emerald-400 font-semibold">{pass}</span> pass</span>
            <span className="text-zinc-600"><span className="text-amber-400 font-semibold">{warning}</span> warn</span>
            <span className="text-zinc-600"><span className="text-red-400 font-semibold">{fail}</span> fail</span>
            <span className="font-semibold text-zinc-200">{score}<span className="text-zinc-600 font-normal">/100</span></span>
          </div>
        </div>

        <p className="text-[11px] text-zinc-600 mb-3 leading-snug">
          Our 13-point check covering OG tags, structured data, sitemap and more — click any fail/warn row for guidance.
        </p>

        <div className="h-0.5 w-full bg-zinc-800 rounded-full mb-4 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-red-500"
            }`}
            style={{ width: `${score}%` }}
          />
        </div>

        <div>{seoChecks.map((c) => <CheckRow key={c.id} check={c} />)}</div>

        <ScoreInsight meaning={insight.meaning} nextStep={insight.nextStep} />
      </div>
    </CardShell>
  );
}
