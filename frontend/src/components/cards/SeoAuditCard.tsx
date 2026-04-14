import { useState } from "react";
import type { SEOCheck } from "../../types/analysis";

function statusStyle(s: string) {
  if (s === "pass")    return { dot: "bg-emerald-500", label: "text-emerald-400", text: "Pass" };
  if (s === "warning") return { dot: "bg-amber-500",   label: "text-amber-400",   text: "Warn" };
  return                      { dot: "bg-red-500",     label: "text-red-400",     text: "Fail" };
}

function CheckRow({ check }: { check: SEOCheck }) {
  const [open, setOpen] = useState(false);
  const s = statusStyle(check.status);
  const hasDetails = check.details && check.details.length > 0;

  return (
    <div className="border-b border-zinc-800/60 last:border-0">
      <div
        className={`flex items-start gap-2.5 py-2.5 ${hasDetails ? "cursor-pointer select-none" : ""}`}
        onClick={() => hasDetails && setOpen((o) => !o)}
      >
        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${s.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-200">{check.label}</span>
            <span className={`text-[10px] font-semibold ${s.label}`}>{s.text}</span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{check.detail}</p>
        </div>
        {hasDetails && (
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className={`shrink-0 mt-1 text-zinc-600 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        )}
      </div>

      {hasDetails && open && (
        <div className="mb-2.5 ml-4 pl-2.5 border-l border-zinc-800 flex flex-col gap-1">
          {check.details!.map((item, i) => (
            <span key={i} className="text-[11px] text-zinc-500 leading-relaxed break-all">
              {item}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function SEOAuditCard({ seoChecks }: { seoChecks: SEOCheck[] }) {
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
