import { Separator } from "@/components/ui/separator";
import type { PageStats } from "../../types/analysis";

function Stat({ label, value, sub, valueClass = "text-slate-100" }: {
  label: string; value: string | number; sub?: string; valueClass?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">{label}</span>
      <span className={`text-xl font-bold leading-none ${valueClass}`}>{value}</span>
      {sub && <span className="text-xs text-slate-600">{sub}</span>}
    </div>
  );
}

export function PageStatsCard({ pageStats }: { pageStats: PageStats }) {
  const readMins   = Math.max(1, Math.round(pageStats.wordCount / 200));
  const totalLinks = pageStats.internalLinks + pageStats.externalLinks;

  return (
    <div className="rounded-xl border border-white/8 bg-white/4 p-5">
      <h3 className="text-sm font-semibold text-slate-200 mb-5">Page Stats</h3>

      <div className="flex items-start gap-0">
        <Stat label="Words"    value={pageStats.wordCount.toLocaleString()} sub={`~${readMins} min read`} />
        <Separator orientation="vertical" className="mx-6 h-10 self-center" />
        <Stat label="Images"   value={pageStats.imageCount} />
        <Separator orientation="vertical" className="mx-6 h-10 self-center" />
        <Stat label="Scripts"  value={pageStats.scriptCount}
          valueClass={pageStats.scriptCount > 15 ? "text-amber-400" : "text-slate-100"}
          sub={pageStats.scriptCount > 15 ? "high load" : "lean"} />
        <Separator orientation="vertical" className="mx-6 h-10 self-center" />
        <Stat label="Links"    value={totalLinks}
          sub={`${pageStats.internalLinks} in · ${pageStats.externalLinks} ext`} />
        <Separator orientation="vertical" className="mx-6 h-10 self-center" />
        <Stat label="Headings" value={pageStats.h1Count + pageStats.h2Count + pageStats.h3Count}
          sub={`H1:${pageStats.h1Count} H2:${pageStats.h2Count} H3:${pageStats.h3Count}`} />
        <Separator orientation="vertical" className="mx-6 h-10 self-center" />
        <Stat label="H1"       value={pageStats.h1Count}
          valueClass={pageStats.h1Count === 1 ? "text-emerald-400" : pageStats.h1Count === 0 ? "text-rose-400" : "text-amber-400"}
          sub={pageStats.h1Count === 1 ? "ideal" : pageStats.h1Count === 0 ? "missing" : "too many"} />
      </div>
    </div>
  );
}
