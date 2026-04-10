import type { PageStats } from "../../types/analysis";

function Metric({ label, value, sub, valueClass = "text-zinc-100" }: {
  label: string;
  value: string | number;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider">{label}</span>
      <span className={`text-xl font-semibold leading-none ${valueClass}`}>{value}</span>
      {sub && <span className="text-[11px] text-zinc-600">{sub}</span>}
    </div>
  );
}

export function PageStatsCard({ pageStats }: { pageStats: PageStats }) {
  const readMins   = Math.max(1, Math.round(pageStats.wordCount / 200));
  const totalLinks = pageStats.internalLinks + pageStats.externalLinks;

  const structureMetrics = [
    {
      label: "Words",
      value: pageStats.wordCount.toLocaleString(),
      sub: `~${readMins} min read`,
    },
    {
      label: "Images",
      value: pageStats.imageCount,
      sub: pageStats.imageCount > 0 ? `${pageStats.lazyImageCount} lazy` : undefined,
    },
    {
      label: "Scripts",
      value: pageStats.scriptCount,
      sub: pageStats.scriptCount > 15 ? "high load" : pageStats.scriptCount > 8 ? "moderate" : "lean",
      valueClass: pageStats.scriptCount > 15 ? "text-amber-400" : "text-zinc-100",
    },
    {
      label: "Links",
      value: totalLinks,
      sub: `${pageStats.internalLinks} in · ${pageStats.externalLinks} ext`,
    },
    {
      label: "Headings",
      value: pageStats.h1Count + pageStats.h2Count + pageStats.h3Count,
      sub: `H2:${pageStats.h2Count} · H3:${pageStats.h3Count}`,
    },
    {
      label: "H1 Tag",
      value: pageStats.h1Count,
      sub: pageStats.h1Count === 1 ? "ideal" : pageStats.h1Count === 0 ? "missing" : "too many",
      valueClass: pageStats.h1Count === 1 ? "text-emerald-400" : pageStats.h1Count === 0 ? "text-red-400" : "text-amber-400",
    },
  ];

  const performanceMetrics = [
    {
      label: "Stylesheets",
      value: pageStats.stylesheetCount,
      sub: pageStats.stylesheetCount > 10 ? "high" : "ok",
      valueClass: pageStats.stylesheetCount > 10 ? "text-amber-400" : "text-zinc-100",
    },
    {
      label: "Fonts",
      value: pageStats.fontCount,
      sub: pageStats.fontCount > 4 ? "many loaded" : pageStats.fontCount === 0 ? "system only" : "ok",
      valueClass: pageStats.fontCount > 4 ? "text-amber-400" : "text-zinc-100",
    },
    {
      label: "Inline Styles",
      value: pageStats.inlineStyleCount,
      sub: pageStats.inlineStyleCount > 50 ? "high" : "ok",
      valueClass: pageStats.inlineStyleCount > 50 ? "text-amber-400" : "text-zinc-100",
    },
    {
      label: "Render Blocking",
      value: pageStats.renderBlockingScripts,
      sub: "scripts in <head>",
      valueClass: pageStats.renderBlockingScripts > 3 ? "text-red-400" : pageStats.renderBlockingScripts > 0 ? "text-amber-400" : "text-emerald-400",
    },
    {
      label: "Content Ratio",
      value: `${pageStats.contentToCodeRatio}%`,
      sub: pageStats.contentToCodeRatio < 10 ? "low — heavy markup" : pageStats.contentToCodeRatio > 40 ? "great" : "ok",
      valueClass: pageStats.contentToCodeRatio < 10 ? "text-amber-400" : "text-zinc-100",
    },
  ];

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-4">Page Stats</p>

      <div className="grid grid-cols-3 gap-x-4 gap-y-5">
        {structureMetrics.map((m) => (
          <Metric key={m.label} {...m} />
        ))}
      </div>

      <div className="mt-5 pt-4 border-t border-zinc-800">
        <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-3">Performance</p>
        <div className="grid grid-cols-3 gap-x-4 gap-y-5">
          {performanceMetrics.map((m) => (
            <Metric key={m.label} {...m} />
          ))}
        </div>
      </div>
    </div>
  );
}
