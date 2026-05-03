import type { SecurityHeaderCheck } from "../../types/analysis";

function statusBadge(status: string) {
  if (status === "pass")    return "text-emerald-400 bg-emerald-950 border-emerald-800";
  if (status === "warning") return "text-amber-400 bg-amber-950 border-amber-800";
  return "text-red-400 bg-red-950 border-red-800";
}

function statusLabel(status: string) {
  if (status === "pass")    return "PASS";
  if (status === "warning") return "WARN";
  return "MISSING";
}

export function SecurityHeadersCard({ checks }: { checks: SecurityHeaderCheck[] }) {
  const pass = checks.filter(c => c.status === "pass").length;
  const scoreColor = pass >= Math.ceil(checks.length * 0.8) ? "text-emerald-400" : pass >= Math.ceil(checks.length * 0.5) ? "text-amber-400" : "text-red-400";

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Security Headers</p>
        <span className={`text-lg font-bold ${scoreColor}`}>{pass}<span className="text-xs text-zinc-600 font-medium">/{checks.length}</span></span>
      </div>

      <div className="flex flex-col gap-0">
        {checks.map((c) => (
          <div key={c.id} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-b-0 gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-zinc-300 font-mono">{c.label}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5 truncate">{c.detail}</p>
            </div>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${statusBadge(c.status)}`}>
              {statusLabel(c.status)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
