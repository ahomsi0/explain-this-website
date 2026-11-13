import type { SecurityHeaderCheck } from "../../types/analysis";
import { CardShell } from "../ui/CardShell";
import { CardHeader } from "../ui/CardHeader";
import { HowToFixLink } from "../guides/GuidesPages";

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

export function SecurityHeadersCard({ checks, unavailableReason }: {
  checks: SecurityHeaderCheck[];
  /** Shown in place of the audit when the page's headers were never seen. */
  unavailableReason?: string;
}) {
  const pass = checks.filter(c => c.status === "pass").length;

  // Reporting every header as "missing" without having seen them would be a
  // guess presented as a finding.
  if (checks.length === 0) {
    return (
      <CardShell>
        <CardHeader title="Security Headers" />
        <div className="p-5">
          <p className="text-xs text-zinc-500">{unavailableReason ?? "Security headers were not available for this page."}</p>
        </div>
      </CardShell>
    );
  }

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
      <div className="p-5">
        <div className="flex flex-col gap-0">
          {checks.map((c) => (
            <div key={c.id} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-b-0 gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-zinc-300 font-mono">{c.label}</p>
                <p className="text-[11px] text-zinc-500 mt-0.5 truncate">{c.detail}</p>
              </div>
              <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${statusBadge(c.status)}`}>
                {statusLabel(c.status)}
              </span>
            </div>
          ))}
        </div>
        {checks.some(c => c.status !== "pass") && (
          <HowToFixLink issueId="security-headers" className="mt-3" />
        )}
      </div>
    </CardShell>
  );
}
