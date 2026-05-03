import type { SiteFreshness } from "../../types/analysis";
import { CardShell } from "../ui/CardShell";
import { CardHeader } from "../ui/CardHeader";

const ratingConfig = {
  fresh:   { label: "Fresh",   cls: "text-emerald-400 bg-emerald-950 border-emerald-800", bar: "bg-emerald-500", pct: 100 },
  aging:   { label: "Aging",   cls: "text-amber-400  bg-amber-950  border-amber-800",  bar: "bg-amber-500",  pct: 55  },
  stale:   { label: "Stale",   cls: "text-red-400    bg-red-950    border-red-800",    bar: "bg-red-500",    pct: 20  },
  unknown: { label: "Unknown", cls: "text-zinc-400   bg-zinc-800   border-zinc-700",   bar: "bg-zinc-600",   pct: 0   },
};

export function SiteFreshnessCard({ freshness }: { freshness: SiteFreshness }) {
  const cfg = ratingConfig[freshness.rating];

  const displayDate = freshness.latestDate
    ? new Date(freshness.latestDate + "T00:00:00Z").toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : freshness.copyrightYear
    ? `© ${freshness.copyrightYear}`
    : null;

  return (
    <CardShell>
      <CardHeader
        title="Site Freshness"
        badge={freshness.rating}
        badgeColor={
          freshness.rating === "fresh" ? "green"
          : freshness.rating === "aging" ? "amber"
          : freshness.rating === "stale" ? "red"
          : "violet"
        }
      />
      <div className="p-4">
        {/* Bar */}
        <div className="mb-4">
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${cfg.bar}`} style={{ width: `${cfg.pct}%` }} />
          </div>
          {displayDate && (
            <p className="text-[11px] text-zinc-500 mt-1.5">
              Most recent content detected: <span className="text-zinc-300 font-medium">{displayDate}</span>
            </p>
          )}
          {freshness.rating === "unknown" && (
            <p className="text-[11px] text-zinc-600 mt-1.5">No date signals found on this page.</p>
          )}
        </div>

        {/* Evidence signals */}
        {(freshness.signals ?? []).length > 0 && (
          <div className="border-t border-zinc-800 pt-3 flex flex-col gap-1.5">
            <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-0.5">Detected signals</p>
            {(freshness.signals ?? []).map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-1 h-1 rounded-full bg-zinc-600 shrink-0" />
                <span className="text-[11px] text-zinc-400">{s}</span>
              </div>
            ))}
          </div>
        )}

        {freshness.rating === "stale" && (
          <p className="mt-3 text-[11px] text-amber-500/80 border-t border-zinc-800 pt-3">
            Outdated content can hurt SEO rankings and reduce visitor trust.
          </p>
        )}
      </div>
    </CardShell>
  );
}
