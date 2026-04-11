import type { PageStats } from "../../types/analysis";

function Metric({ label, value, sub, valueClass = "text-zinc-100" }: {
  label: string;
  value: string | number;
  sub?: string;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{label}</span>
      <span className={`text-xl font-semibold leading-none ${valueClass}`}>{value}</span>
      {sub && <span className="text-[11px] text-zinc-500">{sub}</span>}
    </div>
  );
}

export function PageStatsCard({ pageStats }: { pageStats: PageStats }) {
  const readMins   = Math.max(1, Math.round(pageStats.wordCount / 200));
  const totalLinks = pageStats.internalLinks + pageStats.externalLinks;

  const metrics = [
    { label: "Words",    value: pageStats.wordCount.toLocaleString(), sub: `~${readMins} min read` },
    { label: "Images",   value: pageStats.imageCount, sub: pageStats.imageCount > 0 ? `${pageStats.lazyImageCount} lazy` : undefined },
    { label: "Scripts",  value: pageStats.scriptCount, sub: pageStats.scriptCount > 15 ? "high load" : pageStats.scriptCount > 8 ? "moderate" : "lean",
      valueClass: pageStats.scriptCount > 15 ? "text-amber-400" : "text-zinc-100" },
    { label: "Links",    value: totalLinks, sub: `${pageStats.internalLinks} in · ${pageStats.externalLinks} ext` },
    { label: "Headings", value: pageStats.h1Count + pageStats.h2Count + pageStats.h3Count, sub: `H2:${pageStats.h2Count} · H3:${pageStats.h3Count}` },
    { label: "H1 Tag",   value: pageStats.h1Count,
      sub: pageStats.h1Count === 1 ? "ideal" : pageStats.h1Count === 0 ? "missing" : "too many",
      valueClass: pageStats.h1Count === 1 ? "text-emerald-400" : pageStats.h1Count === 0 ? "text-red-400" : "text-amber-400" },
  ];

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-4">Page Stats</p>
      <div className="grid grid-cols-3 gap-x-4 gap-y-5">
        {metrics.map((m) => <Metric key={m.label} {...m} />)}
      </div>
    </div>
  );
}

type Status = "good" | "warn" | "bad";

function statusDot(s: Status) {
  return s === "good" ? "bg-emerald-500" : s === "warn" ? "bg-amber-500" : "bg-red-500";
}
function statusText(s: Status) {
  return s === "good" ? "text-emerald-400" : s === "warn" ? "text-amber-400" : "text-red-400";
}

function EfficiencyRow({ label, value, note, status }: {
  label: string; value: string | number; note: string; status: Status;
}) {
  return (
    <div className="flex items-center gap-2.5 py-2 border-b border-zinc-800/60 last:border-0">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot(status)}`} />
      <span className="text-xs text-zinc-300 flex-1">{label}</span>
      <span className={`text-xs font-semibold tabular-nums ${statusText(status)}`}>{value}</span>
      <span className="text-[11px] text-zinc-500 w-28 text-right">{note}</span>
    </div>
  );
}

export function PagePerfCard({ pageStats }: { pageStats: PageStats }) {
  const rows: { label: string; value: string | number; note: string; status: Status }[] = [
    {
      label: "Render-blocking scripts",
      value: pageStats.renderBlockingScripts,
      note: pageStats.renderBlockingScripts === 0 ? "none — great" : pageStats.renderBlockingScripts <= 3 ? "slows first paint" : "delays page load",
      status: pageStats.renderBlockingScripts === 0 ? "good" : pageStats.renderBlockingScripts <= 3 ? "warn" : "bad",
    },
    {
      label: "Stylesheets loaded",
      value: pageStats.stylesheetCount,
      note: pageStats.stylesheetCount <= 5 ? "lean" : pageStats.stylesheetCount <= 10 ? "moderate" : "too many requests",
      status: pageStats.stylesheetCount <= 5 ? "good" : pageStats.stylesheetCount <= 10 ? "warn" : "bad",
    },
    {
      label: "Web fonts",
      value: pageStats.fontCount,
      note: pageStats.fontCount === 0 ? "system fonts only" : pageStats.fontCount <= 3 ? "reasonable" : "heavy font load",
      status: pageStats.fontCount <= 3 ? "good" : "warn",
    },
    {
      label: "Inline styles",
      value: pageStats.inlineStyleCount,
      note: pageStats.inlineStyleCount <= 20 ? "minimal" : pageStats.inlineStyleCount <= 50 ? "moderate" : "bloated markup",
      status: pageStats.inlineStyleCount <= 20 ? "good" : pageStats.inlineStyleCount <= 50 ? "warn" : "bad",
    },
    {
      label: "Content-to-code ratio",
      value: `${pageStats.contentToCodeRatio}%`,
      note: pageStats.contentToCodeRatio >= 30 ? "lean markup" : pageStats.contentToCodeRatio >= 15 ? "acceptable" : "markup-heavy page",
      status: pageStats.contentToCodeRatio >= 30 ? "good" : pageStats.contentToCodeRatio >= 15 ? "warn" : "bad",
    },
  ];

  const goodCount = rows.filter((r) => r.status === "good").length;

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Load Efficiency</p>
        <span className="text-[11px] text-zinc-600">
          <span className={goodCount === rows.length ? "text-emerald-400" : goodCount >= 3 ? "text-amber-400" : "text-red-400"}>
            {goodCount}/{rows.length}
          </span> passing
        </span>
      </div>
      <div>
        {rows.map((r) => <EfficiencyRow key={r.label} {...r} />)}
      </div>
    </div>
  );
}
