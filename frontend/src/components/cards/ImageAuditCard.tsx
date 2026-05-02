import type { ImageFormatAudit } from "../../types/analysis";

function ratingFromPct(pct: number, total: number) {
  if (total === 0) return { label: "N/A", cls: "text-zinc-500 bg-zinc-800 border-zinc-700" };
  if (pct >= 80) return { label: "Great",   cls: "text-emerald-400 bg-emerald-950 border-emerald-800" };
  if (pct >= 40) return { label: "OK",      cls: "text-amber-400  bg-amber-950  border-amber-800"  };
  return           { label: "Improve",  cls: "text-red-400    bg-red-950    border-red-800"    };
}

function FormatBar({ label, count, total, colorClass }: {
  label: string; count: number; total: number; colorClass: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-zinc-500 w-10 shrink-0">{label}</span>
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] text-zinc-400 tabular-nums w-6 text-right">{count}</span>
    </div>
  );
}

function Flag({ label, count, severity }: { label: string; count: number; severity: "warn" | "info" }) {
  if (count === 0) return null;
  const dot = severity === "warn" ? "bg-amber-500" : "bg-zinc-600";
  const text = severity === "warn" ? "text-amber-400" : "text-zinc-400";
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-zinc-800/60 last:border-0">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
      <span className="text-xs text-zinc-300 flex-1">{label}</span>
      <span className={`text-xs font-semibold tabular-nums ${text}`}>{count}</span>
    </div>
  );
}

export function ImageAuditCard({ audit }: { audit: ImageFormatAudit }) {
  if (audit.total === 0) return null;

  const { label, cls } = ratingFromPct(audit.modernPct, audit.total);
  const legacy = audit.jpg + audit.png + audit.gif;

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Image Formats</p>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-zinc-500">{audit.total} images</span>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${cls}`}>{label}</span>
        </div>
      </div>

      {/* Modern % progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] text-zinc-500">Modern formats (WebP / AVIF)</span>
          <span className={`text-sm font-bold tabular-nums ${audit.modernPct >= 80 ? "text-emerald-400" : audit.modernPct >= 40 ? "text-amber-400" : "text-red-400"}`}>
            {audit.modernPct}%
          </span>
        </div>
        <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${audit.modernPct >= 80 ? "bg-emerald-500" : audit.modernPct >= 40 ? "bg-amber-500" : "bg-red-500"}`}
            style={{ width: `${audit.modernPct}%` }}
          />
        </div>
      </div>

      {/* Format breakdown bars */}
      <div className="flex flex-col gap-2 mb-4">
        {audit.webp > 0  && <FormatBar label="WebP"  count={audit.webp}  total={audit.total} colorClass="bg-emerald-500" />}
        {audit.avif > 0  && <FormatBar label="AVIF"  count={audit.avif}  total={audit.total} colorClass="bg-emerald-400" />}
        {audit.png > 0   && <FormatBar label="PNG"   count={audit.png}   total={audit.total} colorClass="bg-amber-500"   />}
        {audit.jpg > 0   && <FormatBar label="JPG"   count={audit.jpg}   total={audit.total} colorClass="bg-amber-400"   />}
        {audit.gif > 0   && <FormatBar label="GIF"   count={audit.gif}   total={audit.total} colorClass="bg-red-500"     />}
        {audit.svg > 0   && <FormatBar label="SVG"   count={audit.svg}   total={audit.total} colorClass="bg-zinc-500"    />}
      </div>

      {/* Flags */}
      {(audit.missingDims > 0 || audit.missingLazy > 0 || legacy > 0) && (
        <div className="border-t border-zinc-800 pt-3">
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-1">Issues</p>
          <Flag label="Legacy formats (JPG/PNG/GIF) — convert to WebP/AVIF" count={legacy}             severity="warn" />
          <Flag label="Missing width + height (causes layout shift)"         count={audit.missingDims}  severity="warn" />
          <Flag label="Missing loading=lazy"                                  count={audit.missingLazy}  severity="info" />
        </div>
      )}
    </div>
  );
}
