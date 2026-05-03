import { CardShell } from "../ui/CardShell";
import { CardHeader } from "../ui/CardHeader";
import type { DomainInfo } from "../../types/analysis";

function ageBadgeColor(years: number): "green" | "amber" | "red" {
  if (years >= 5) return "green";
  if (years >= 2) return "amber";
  return "red";
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(m) - 1]} ${d}, ${y}`;
}

export function DomainInfoCard({ domainInfo }: { domainInfo: DomainInfo }) {
  const ageBadge = domainInfo.ageYears > 0
    ? `${domainInfo.ageYears} yr${domainInfo.ageYears !== 1 ? "s" : ""} old`
    : "Age unknown";
  const badgeColor = domainInfo.ageYears > 0
    ? ageBadgeColor(domainInfo.ageYears)
    : "violet" as const;

  return (
    <CardShell>
      <CardHeader title="Domain Info" badge={ageBadge} badgeColor={badgeColor} />
      <div className="p-4 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">Registered</p>
            <p className="text-sm font-semibold text-zinc-200">{formatDate(domainInfo.registeredAt)}</p>
          </div>
          {domainInfo.expiresAt && (
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">Expires</p>
              <p className="text-sm font-semibold text-zinc-200">{formatDate(domainInfo.expiresAt)}</p>
            </div>
          )}
        </div>
        {domainInfo.registrar && (
          <div className="border-t border-zinc-800/60 pt-3">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">Registrar</p>
            <p className="text-xs text-zinc-300">{domainInfo.registrar}</p>
          </div>
        )}
        {domainInfo.ageYears > 0 && domainInfo.ageYears < 2 && (
          <p className="text-[11px] text-amber-400 bg-amber-950/50 border border-amber-800/40 rounded px-3 py-2">
            ⚠ New domain — search engines may rank established domains higher
          </p>
        )}
      </div>
    </CardShell>
  );
}
