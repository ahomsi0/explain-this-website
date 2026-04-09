import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { SEOCheck } from "../../types/analysis";

function statusVariant(s: string) {
  if (s === "pass")    return "emerald" as const;
  if (s === "warning") return "amber" as const;
  return "rose" as const;
}

function CheckRow({ check }: { check: SEOCheck }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-white/5 last:border-0">
      <Badge variant={statusVariant(check.status)} className="mt-0.5 shrink-0 uppercase text-[10px] tracking-wide">
        {check.status === "pass" ? "Pass" : check.status === "warning" ? "Warn" : "Fail"}
      </Badge>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-200">{check.label}</p>
        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{check.detail}</p>
      </div>
    </div>
  );
}

export function SeoAuditCard({ seoChecks }: { seoChecks: SEOCheck[] }) {
  const pass    = seoChecks.filter((c) => c.status === "pass").length;
  const warning = seoChecks.filter((c) => c.status === "warning").length;
  const fail    = seoChecks.filter((c) => c.status === "fail").length;
  const score   = seoChecks.length ? Math.round((pass / seoChecks.length) * 100) : 0;
  const barColor = score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-rose-500";

  return (
    <div className="rounded-xl border border-white/8 bg-white/4 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-200">SEO Audit</h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            <span className="text-emerald-400 font-medium">{pass}p</span>{" "}
            <span className="text-amber-400 font-medium">{warning}w</span>{" "}
            <span className="text-rose-400 font-medium">{fail}f</span>
          </span>
          <span className="text-sm font-bold text-slate-100">{score}<span className="text-xs font-normal text-slate-500">/100</span></span>
        </div>
      </div>

      <Progress value={score} className="mb-5 h-1.5" indicatorClassName={barColor} />

      <div>{seoChecks.map((c) => <CheckRow key={c.id} check={c} />)}</div>
    </div>
  );
}
