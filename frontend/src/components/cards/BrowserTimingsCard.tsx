import type { BrowserTimings } from "../../types/analysis";
import { CardShell } from "../ui/CardShell";
import { CardHeader } from "../ui/CardHeader";
import {
  formatBytes, formatDuration, rateCls, rateLcp, rateTtfb, ratingLabel, ratingText, type Rating,
} from "../../lib/browserTimings";

interface TimingRow {
  label: string;
  hint: string;
  value: string;
  rating?: Rating;
}

function rowsFor(t: BrowserTimings): TimingRow[] {
  const rows: TimingRow[] = [];
  if (t.ttfbMs) rows.push({ label: "Server response", hint: "Time to first byte", value: formatDuration(t.ttfbMs), rating: rateTtfb(t.ttfbMs) });
  if (t.lcpMs) rows.push({ label: "Largest paint", hint: "LCP: when the main content appeared", value: formatDuration(t.lcpMs), rating: rateLcp(t.lcpMs) });
  if (t.hasCls && t.cls !== undefined) rows.push({ label: "Layout shift", hint: "CLS: how much the page jumped while loading", value: t.cls.toFixed(2), rating: rateCls(t.cls) });
  if (t.domContentLoadedMs) rows.push({ label: "Page ready", hint: "HTML parsed and scripts run", value: formatDuration(t.domContentLoadedMs) });
  if (t.loadMs) rows.push({ label: "Fully loaded", hint: "Every image, script and stylesheet finished", value: formatDuration(t.loadMs) });
  if (t.requests) rows.push({ label: "Requests", hint: "Files the page asked for", value: String(t.requests) });
  if (t.transferBytes) rows.push({ label: "Transferred", hint: "Bytes over the network, where the browser reports them", value: formatBytes(t.transferBytes) });
  return rows;
}

// Stands in for the Lighthouse card on a page captured from behind a login:
// Google cannot reach the page, so these are the visitor's own browser's
// numbers for the one load they captured.
export function BrowserTimingsCard({ timings }: { timings?: BrowserTimings }) {
  const rows = timings ? rowsFor(timings) : [];

  return (
    <CardShell>
      <CardHeader title="Load timings from your browser" />
      <div className="px-5 pb-4 pt-2">
        {rows.length === 0 ? (
          <p className="py-3 text-xs text-zinc-500">
            Speed was not measured. Timings come with pages sent by the bookmark button, not with pasted source.
          </p>
        ) : (
          <dl>
            {rows.map((row) => (
              <div key={row.label} className="grid grid-cols-[1fr_auto_44px] items-baseline gap-x-4 border-b border-zinc-800 py-3 last:border-b-0">
                <dt>
                  <span className="text-[13px] text-zinc-200">{row.label}</span>
                  <span className="block text-[11.5px] text-zinc-500 sm:ml-2 sm:inline">{row.hint}</span>
                </dt>
                <dd className={`text-right font-mono text-[13px] tabular-nums ${row.rating ? ratingText[row.rating] : "text-zinc-100"}`}>
                  {row.value}
                </dd>
                <dd className={`text-right font-mono text-[10.5px] tracking-[0.08em] ${row.rating ? ratingText[row.rating] : ""}`}>
                  {row.rating ? ratingLabel[row.rating] : ""}
                </dd>
              </div>
            ))}
          </dl>
        )}
        <p className="mt-3 text-[11.5px] leading-relaxed text-zinc-500">
          One load, measured in your browser on your connection. There is no Lighthouse score: Google cannot reach a page behind a login.
        </p>
      </div>
    </CardShell>
  );
}
