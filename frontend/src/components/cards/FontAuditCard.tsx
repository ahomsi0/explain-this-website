import { CardShell } from "../ui/CardShell";
import { CardHeader } from "../ui/CardHeader";
import type { FontAudit } from "../../types/analysis";

const SOURCE_BADGE: Record<string, string> = {
  "Google Fonts":        "text-blue-400 bg-blue-500/10 border border-blue-500/25",
  "Bunny Fonts":         "text-emerald-400 bg-emerald-500/10 border border-emerald-500/25",
  "Adobe Fonts":         "text-red-400 bg-red-500/10 border border-red-500/25",
  "Custom/Self-hosted":  "text-zinc-400 bg-zinc-700/40 border border-zinc-600",
};

function sourceBadgeClass(source: string): string {
  return SOURCE_BADGE[source] ?? "text-zinc-400 bg-zinc-700/40 border border-zinc-600";
}

export function FontAuditCard({ fontAudit }: { fontAudit: FontAudit }) {
  const badgeColor = fontAudit.hasPerfIssue ? "amber" : "green" as const;

  if (fontAudit.totalFamilies === 0) {
    return (
      <CardShell>
        <CardHeader title="Font Audit" badge="System fonts" badgeColor="green" />
        <div className="p-4">
          <p className="text-xs text-zinc-500">No external web fonts detected — system fonts in use. Good for performance.</p>
        </div>
      </CardShell>
    );
  }

  return (
    <CardShell>
      <CardHeader
        title="Font Audit"
        badge={fontAudit.totalFamilies + (fontAudit.totalFamilies === 1 ? " family" : " families")}
        badgeColor={badgeColor}
      />
      <div className="p-4 flex flex-col gap-3">
        {fontAudit.hasPerfIssue && (
          <div className="text-[11px] text-amber-400 bg-amber-950/50 border border-amber-800/40 rounded px-3 py-2">
            ⚠ {fontAudit.totalFamilies > 3 ? `${fontAudit.totalFamilies} font families` : `${fontAudit.totalWeights} weight variants`} detected — consider consolidating to improve load time
          </div>
        )}
        <div className="flex flex-col gap-2">
          {fontAudit.families.map((f) => (
            <div key={f.family} className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-zinc-200">{f.family}</span>
                {f.weights.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {f.weights.map((w) => (
                      <span key={w} className="text-[9px] font-mono text-zinc-500 bg-zinc-800/60 rounded px-1 py-px">{w}</span>
                    ))}
                  </div>
                )}
              </div>
              <span className={`text-[9px] font-semibold rounded px-1.5 py-px whitespace-nowrap shrink-0 ${sourceBadgeClass(f.source)}`}>
                {f.source}
              </span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-zinc-600 pt-1 border-t border-zinc-800/60">
          {fontAudit.totalWeights} total weight variant{fontAudit.totalWeights !== 1 ? "s" : ""} · each variant is a separate network request
        </p>
      </div>
    </CardShell>
  );
}
