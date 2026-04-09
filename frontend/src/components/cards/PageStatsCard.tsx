import type { PageStats } from "../../types/analysis";

function Metric({ label, value, sub, valueClass = "text-slate-100" }: {
  label: string;
  value: string | number;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{label}</span>
      <span className={`text-2xl font-bold leading-none ${valueClass}`}>{value}</span>
      {sub && <span className="text-xs text-slate-600">{sub}</span>}
    </div>
  );
}

export function PageStatsCard({ pageStats }: { pageStats: PageStats }) {
  const readMins   = Math.max(1, Math.round(pageStats.wordCount / 200));
  const totalLinks = pageStats.internalLinks + pageStats.externalLinks;

  const metrics = [
    {
      label: "Words",
      value: pageStats.wordCount.toLocaleString(),
      sub: `~${readMins} min read`,
    },
    {
      label: "Images",
      value: pageStats.imageCount,
    },
    {
      label: "Scripts",
      value: pageStats.scriptCount,
      sub: pageStats.scriptCount > 15 ? "high load" : pageStats.scriptCount > 8 ? "moderate" : "lean",
      valueClass: pageStats.scriptCount > 15 ? "text-amber-400" : "text-slate-100",
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
      valueClass: pageStats.h1Count === 1 ? "text-emerald-400" : pageStats.h1Count === 0 ? "text-rose-400" : "text-amber-400",
    },
  ];

  return (
    <div className="card card-accent-teal">
      <div className="card-header">
        <span className="card-icon bg-teal-950/60 text-teal-400">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
          </svg>
        </span>
        <span className="card-title">Page Stats</span>
      </div>

      <div className="grid grid-cols-3 gap-x-4 gap-y-5">
        {metrics.map((m) => (
          <Metric key={m.label} {...m} />
        ))}
      </div>
    </div>
  );
}
