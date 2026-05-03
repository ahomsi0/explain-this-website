import type { SecurityHeaderCheck } from "../../types/analysis";
import { CardShell } from "../ui/CardShell";
import { CardHeader } from "../ui/CardHeader";

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

  return (
    <CardShell>
      <CardHeader
        title="Security Headers"
        badge={`${pass}/${checks.length}`}
        badgeColor={
          pass >= Math.ceil(checks.length * 0.8) ? "green"
          : pass >= Math.ceil(checks.length * 0.5) ? "amber"
          : "red"
        }
      />
      <div className="p-4">
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
    </CardShell>
  );
}
