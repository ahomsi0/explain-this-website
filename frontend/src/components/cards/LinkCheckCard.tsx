import type { LinkCheckResult } from "../../types/analysis";
import { CardShell } from "../ui/CardShell";
import { CardHeader } from "../ui/CardHeader";

export function LinkCheckCard({ linkCheck }: { linkCheck: LinkCheckResult }) {
  if (linkCheck.checked === 0) {
    return (
      <CardShell>
        <CardHeader
          title="Link Health"
          badge={linkCheck.checked === 0 ? undefined : linkCheck.broken === 0 ? "All OK" : linkCheck.broken + " broken"}
          badgeColor={linkCheck.broken === 0 ? "green" : linkCheck.broken <= 2 ? "amber" : "red"}
        />
        <div className="p-4">
          <p className="text-xs text-zinc-500">No external links found on this page.</p>
        </div>
      </CardShell>
    );
  }

  const brokenItems   = linkCheck.items.filter(i => i.isBroken);
  const redirectItems = linkCheck.items.filter(i => i.isRedirect && !i.isBroken);

  return (
    <CardShell>
      <CardHeader
        title="Link Health"
        badge={linkCheck.checked === 0 ? undefined : linkCheck.broken === 0 ? "All OK" : linkCheck.broken + " broken"}
        badgeColor={linkCheck.broken === 0 ? "green" : linkCheck.broken <= 2 ? "amber" : "red"}
      />
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          {linkCheck.broken > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border text-red-400 bg-red-950 border-red-800">
              {linkCheck.broken} BROKEN
            </span>
          )}
        </div>

        {/* Summary strip */}
        <div className="flex gap-2 mb-4">
          {[
            { n: linkCheck.ok,        label: "OK",       cls: "text-emerald-400" },
            { n: linkCheck.broken,    label: "Broken",   cls: "text-red-400"     },
            { n: linkCheck.redirects, label: "Redirect", cls: "text-amber-400"   },
          ].map(({ n, label, cls }) => (
            <div key={label} className="flex-1 text-center bg-zinc-950 rounded-md py-2">
              <p className={`text-xl font-bold leading-none ${cls}`}>{n}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Broken links list */}
        {brokenItems.length > 0 && (
          <div className="border-t border-zinc-800 pt-3">
            <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-2">Broken</p>
            {brokenItems.map((item, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5 border-b border-zinc-800 last:border-b-0">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                <span className="text-[11px] text-zinc-400 flex-1 truncate">{item.url}</span>
                <span className="text-[10px] font-bold text-red-400">{item.status || "ERR"}</span>
              </div>
            ))}
          </div>
        )}

        {/* Redirects */}
        {redirectItems.length > 0 && (
          <div className="border-t border-zinc-800 pt-3 mt-1">
            <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-2">Redirects</p>
            {redirectItems.slice(0, 5).map((item, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5 border-b border-zinc-800 last:border-b-0">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <span className="text-[11px] text-zinc-400 flex-1 truncate">{item.url}</span>
                <span className="text-[10px] font-semibold text-amber-400">{item.status}</span>
              </div>
            ))}
          </div>
        )}

        <p className="text-[10px] text-zinc-600 mt-3">Checked {linkCheck.checked} external links</p>
      </div>
    </CardShell>
  );
}
