import type { SEOCheck } from "../../types/analysis";

function statusStyle(s: string) {
  if (s === "pass")    return { dot: "bg-emerald-500", label: "text-emerald-400", text: "Pass" };
  if (s === "warning") return { dot: "bg-amber-500",   label: "text-amber-400",   text: "Warn" };
  return                      { dot: "bg-red-500",     label: "text-red-400",     text: "Fail" };
}

function CheckRow({ check }: { check: SEOCheck }) {
  const s = statusStyle(check.status);
  return (
    <div className="flex items-start gap-2.5 py-2.5 border-b border-zinc-800/60 last:border-0">
      <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${s.dot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-200">{check.label}</span>
          <span className={`text-[10px] font-semibold ${s.label}`}>{s.text}</span>
        </div>
        <p className="text-xs text-zinc-600 mt-0.5 leading-relaxed">{check.detail}</p>
      </div>
    </div>
  );
}

export function SeoAuditCard({ seoChecks }: { seoChecks: SEOCheck[] }) {
  const pass    = seoChecks.filter((c) => c.status === "pass").length;
  const warning = seoChecks.filter((c) => c.status === "warning").length;
  const fail    = seoChecks.filter((c) => c.status === "fail").length;
  const score   = seoChecks.length ? Math.round((pass / seoChecks.length) * 100) : 0;

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider">SEO Audit</p>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="text-zinc-600"><span className="text-emerald-400 font-semibold">{pass}</span> pass</span>
          <span className="text-zinc-600"><span className="text-amber-400 font-semibold">{warning}</span> warn</span>
          <span className="text-zinc-600"><span className="text-red-400 font-semibold">{fail}</span> fail</span>
          <span className="font-semibold text-zinc-200">{score}<span className="text-zinc-600 font-normal">/100</span></span>
        </div>
      </div>

      {/* Score bar */}
      <div className="h-0.5 w-full bg-zinc-800 rounded-full mb-4 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-red-500"
          }`}
          style={{ width: `${score}%` }}
        />
      </div>

      <div>{seoChecks.map((c) => <CheckRow key={c.id} check={c} />)}</div>
    </div>
  );
}
