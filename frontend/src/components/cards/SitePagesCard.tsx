import type { SitePagesAudit } from "../../types/analysis";
import { CardShell } from "../ui/CardShell";
import { CardHeader } from "../ui/CardHeader";
import { scoreColor } from "../../utils/scoreColors";

function pageLabel(raw: string) {
  try {
    const u = new URL(raw);
    return u.hostname.replace(/^www\./, "") + (u.pathname === "/" ? "" : u.pathname);
  } catch {
    return raw;
  }
}

// SitePagesCard shows the per-page rollup produced by a deep scan: which key
// pages were audited, their individual SEO scores, and any fetch failures.
export function SitePagesCard({ sitePages }: { sitePages: SitePagesAudit }) {
  if (!sitePages.pages.length) return null;

  return (
    <CardShell>
      <CardHeader
        title="Site Pages"
        badge={`${sitePages.avgSeoScore}/100 avg SEO`}
        badgeColor={sitePages.avgSeoScore >= 75 ? "green" : sitePages.avgSeoScore >= 50 ? "amber" : "red"}
      />
      <div className="p-5">
        <p className="text-[11px] text-zinc-600 mb-3 leading-snug">
          Deep scan of {sitePages.pages.length} key page{sitePages.pages.length > 1 ? "s" : ""} beyond the homepage.
          The average includes the analyzed page itself.
        </p>
        <div className="flex flex-col gap-2">
          {sitePages.pages.map((page) => (
            <div key={page.url} className="rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <a
                  href={page.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-zinc-200 hover:text-violet-300 truncate min-w-0"
                  title={page.title || page.url}
                >
                  {pageLabel(page.url)}
                </a>
                {page.status === "ok" ? (
                  <span className={`shrink-0 text-xs font-semibold tabular-nums ${scoreColor(page.seoScore)}`}>
                    {page.seoScore}/100
                  </span>
                ) : (
                  <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-950 text-red-400 border border-red-800">
                    failed
                  </span>
                )}
              </div>
              {page.status === "ok" && page.title && (
                <p className="mt-1 text-[10px] text-zinc-600 truncate">{page.title}</p>
              )}
              {page.status === "error" && page.error && (
                <p className="mt-1 text-[10px] text-zinc-600 truncate">{page.error}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </CardShell>
  );
}
