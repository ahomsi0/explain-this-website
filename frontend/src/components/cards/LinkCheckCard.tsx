import type { LinkCheckItem, LinkCheckResult } from "../../types/analysis";
import { CardShell } from "../ui/CardShell";
import { CardHeader } from "../ui/CardHeader";
import { HowToFixLink } from "../guides/GuidesPages";

function LinkRow({ item, dotClass, statusClass, status }: {
  item: LinkCheckItem;
  dotClass: string;
  statusClass: string;
  status: string;
}) {
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-zinc-800 last:border-b-0">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotClass}`} />
      <div className="flex-1 min-w-0">
        {item.text && <p className="text-[11px] text-zinc-300 truncate">{item.text}</p>}
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-[11px] text-zinc-400 hover:text-zinc-200 underline truncate"
        >
          {item.url}
        </a>
      </div>
      <span className={`text-[10px] font-bold ${statusClass}`}>{status}</span>
    </div>
  );
}

export function LinkCheckCard({ linkCheck }: { linkCheck: LinkCheckResult }) {
  if (linkCheck.checked === 0) {
    return (
      <CardShell>
        <CardHeader
          title="Link Health"
          badge={linkCheck.checked === 0 ? undefined : linkCheck.broken === 0 ? "All OK" : linkCheck.broken + " broken"}
          badgeColor={linkCheck.broken === 0 ? "green" : linkCheck.broken <= 2 ? "amber" : "red"}
        />
        <div className="p-5">
          <p className="text-xs text-zinc-500">No external links found on this page.</p>
        </div>
      </CardShell>
    );
  }

  const brokenItems   = linkCheck.items.filter(i => i.isBroken);
  const redirectItems = linkCheck.items.filter(i => i.isRedirect && !i.isBroken);
  const unverifiedItems = linkCheck.items.filter(i => !i.isBroken && (i.reason === "blocked" || i.reason === "unreachable"));

  return (
    <CardShell>
      <CardHeader
        title="Link Health"
        badge={linkCheck.checked === 0 ? undefined : linkCheck.broken === 0 ? "All OK" : linkCheck.broken + " broken"}
        badgeColor={linkCheck.broken === 0 ? "green" : linkCheck.broken <= 2 ? "amber" : "red"}
      />
      <div className="p-5">
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
            ...((linkCheck.unverified ?? 0) > 0
              ? [{ n: linkCheck.unverified ?? 0, label: "Unverified", cls: "text-zinc-400" }]
              : []),
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
              <LinkRow key={i} item={item} dotClass="bg-red-500" statusClass="text-red-400" status={String(item.status || "ERR")} />
            ))}
          </div>
        )}

        {/* Redirects */}
        {redirectItems.length > 0 && (
          <div className="border-t border-zinc-800 pt-3 mt-1">
            <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-2">Redirects</p>
            {redirectItems.slice(0, 5).map((item, i) => (
              <LinkRow key={i} item={item} dotClass="bg-amber-500" statusClass="text-amber-400 font-semibold" status={String(item.status)} />
            ))}
          </div>
        )}

        {unverifiedItems.length > 0 && (
          <div className="border-t border-zinc-800 pt-3 mt-1">
            <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-1">Could not verify</p>
            <p className="text-[10px] text-zinc-600 mb-2">These sites didn&apos;t respond or blocked our check. They may still work in a browser.</p>
            {unverifiedItems.map((item, i) => (
              <LinkRow key={i} item={item} dotClass="bg-zinc-500" statusClass="text-zinc-400" status={item.status ? String(item.status) : "No reply"} />
            ))}
          </div>
        )}

        <p className="text-[10px] text-zinc-600 mt-3">Checked {linkCheck.checked} external links</p>
        {linkCheck.broken > 0 && <HowToFixLink issueId="broken-links" className="mt-2" />}
      </div>
    </CardShell>
  );
}
