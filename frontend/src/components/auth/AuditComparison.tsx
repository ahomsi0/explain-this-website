import { useEffect } from "react";
import type { AuditComparison as AuditComparisonData, AuditComparisonSnapshot } from "../../services/authApi";

// ── Metric model ──────────────────────────────────────────────────────────────

interface MetricDef {
  label: string;
  get: (s: AuditComparisonSnapshot) => number;
  /** When true, the smaller value wins. */
  lowerIsBetter?: boolean;
}

const SCORE_METRICS: MetricDef[] = [
  { label: "SEO", get: (s) => s.seoScore },
  { label: "Performance", get: (s) => s.performanceScore ?? -1 },
  { label: "UX", get: (s) => s.uxScore },
  { label: "Conversion", get: (s) => s.conversionScore },
];

const ISSUE_METRICS: MetricDef[] = [
  { label: "Priority issues", get: (s) => s.priorityIssueCount, lowerIsBetter: true },
  { label: "Broken links", get: (s) => s.brokenLinkCount, lowerIsBetter: true },
  { label: "Security headers failing", get: (s) => s.securityFailureCount, lowerIsBetter: true },
];

type Side = "left" | "right";

function valueOf(def: MetricDef, s: AuditComparisonSnapshot): number {
  return def.get(s);
}

/** Returns the winning side, or null on a tie / missing data (-1 sentinel). */
function winnerOf(def: MetricDef, left: number, right: number): Side | null {
  if (left < 0 || right < 0 || left === right) return null;
  const rightWins = def.lowerIsBetter ? right < left : right > left;
  return rightWins ? "right" : "left";
}

function hostOf(s: AuditComparisonSnapshot) {
  try {
    return new URL(s.url).hostname.replace(/^www\./, "");
  } catch {
    return s.url;
  }
}

// ── Visual pieces ─────────────────────────────────────────────────────────────

function scoreTone(score: number) {
  if (score >= 75) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-red-400";
}

function SiteCard({ snapshot, label }: { snapshot: AuditComparisonSnapshot; label: string }) {
  return (
    <div className="flex-1 min-w-0 rounded-lg border border-zinc-800 bg-zinc-950/50 px-3 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
      <div className="mt-1.5 flex items-baseline justify-between gap-2">
        <p className="truncate text-sm font-medium text-zinc-200">{snapshot.title || hostOf(snapshot)}</p>
        <span className={`shrink-0 text-xl font-bold tabular-nums ${scoreTone(snapshot.overallScore)}`}>
          {snapshot.overallScore}
        </span>
      </div>
      <p className="mt-0.5 truncate text-[11px] text-zinc-500">{hostOf(snapshot)}</p>
      <p className="text-[10px] text-zinc-600">{new Date(snapshot.createdAt).toLocaleString()}</p>
    </div>
  );
}

function Bar({ caption, value, isWinner, max, kind }: {
  caption: string;
  value: number;
  isWinner: boolean;
  max: number;
  kind: "score" | "count";
}) {
  const pct = Math.max(kind === "count" && value === 0 ? 0 : 6, Math.min(100, (value / max) * 100));
  const fill =
    kind === "score"
      ? isWinner ? "bg-emerald-500" : "bg-zinc-600"
      : value > 0 && !isWinner ? "bg-red-500" : "bg-zinc-600";
  const textTone =
    kind === "score"
      ? isWinner ? "text-emerald-400 font-semibold" : "text-zinc-400"
      : value > 0 && !isWinner ? "text-red-400 font-semibold" : "text-zinc-400";

  return (
    <div className="flex items-center gap-2">
      <span className="w-[68px] shrink-0 truncate text-right text-[10px] text-zinc-500">{caption}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-800">
        <div className={`h-full rounded-full ${fill}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`w-8 shrink-0 text-right text-xs tabular-nums ${textTone}`}>{value}</span>
    </div>
  );
}

function MetricRow({ def, before, after, leftLabel, rightLabel }: {
  def: MetricDef;
  before: AuditComparisonSnapshot;
  after: AuditComparisonSnapshot;
  leftLabel: string;
  rightLabel: string;
}) {
  const lv = valueOf(def, before);
  const rv = valueOf(def, after);

  // Missing Lighthouse data is marked with -1 — render an honest placeholder.
  if (lv < 0 || rv < 0) {
    return (
      <div className="py-2 border-b border-zinc-800/60 last:border-0">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium text-zinc-300">{def.label}</span>
          <span className="text-[10px] text-zinc-600">no data</span>
        </div>
      </div>
    );
  }

  const winner = winnerOf(def, lv, rv);
  const kind = def.lowerIsBetter ? "count" : "score";
  const diff = Math.abs(rv - lv);
  const deltaChip =
    winner === null ? (
      <span className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide bg-zinc-800 text-zinc-500">tie</span>
    ) : winner === "right" ? (
      <span className="rounded px-1.5 py-0.5 text-[9px] font-semibold text-emerald-400 bg-emerald-500/10">
        +{diff} {rightLabel.toLowerCase()}
      </span>
    ) : (
      <span className="rounded px-1.5 py-0.5 text-[9px] font-semibold text-violet-300 bg-violet-500/10">
        +{diff} {leftLabel.toLowerCase()}
      </span>
    );

  const max = kind === "score" ? 100 : Math.max(lv, rv, 1);

  return (
    <div className="py-2 border-b border-zinc-800/60 last:border-0">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium text-zinc-300">{def.label}</span>
        {deltaChip}
      </div>
      <div className="flex flex-col gap-1">
        <Bar caption={leftLabel} value={lv} isWinner={winner === "left"} max={max} kind={kind} />
        <Bar caption={rightLabel} value={rv} isWinner={winner === "right"} max={max} kind={kind} />
      </div>
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export function AuditComparison({
  comparison,
  onClose,
  leftLabel = "Before",
  rightLabel = "After",
  title = "How this site changed over time",
  subtitle = "Older audit on the left, newer audit on the right.",
}: {
  comparison: AuditComparisonData;
  onClose: () => void;
  /** Caption above the first snapshot ("Before", "Yours", …). */
  leftLabel?: string;
  /** Caption above the second snapshot ("After", "Competitor", …). */
  rightLabel?: string;
  title?: string;
  subtitle?: string;
}) {
  const { before, after } = comparison;

  // Lock background scrolling and close on Escape while open.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // Tally like-for-like wins across all defined metrics.
  let leftWins = 0;
  let rightWins = 0;
  for (const def of [...SCORE_METRICS, ...ISSUE_METRICS]) {
    const w = winnerOf(def, valueOf(def, before), valueOf(def, after));
    if (w === "left") leftWins++;
    else if (w === "right") rightWins++;
  }

  const verdict = (() => {
    if (leftWins === 0 && rightWins === 0) return "The two audits are evenly matched on every tracked metric.";
    if (leftWins === rightWins) return `Dead even — each side leads in ${leftWins} metric${leftWins > 1 ? "s" : ""}.`;
    const leader = leftWins > rightWins ? { n: leftWins, l: rightWins, name: hostOf(before) || leftLabel } : { n: rightWins, l: leftWins, name: hostOf(after) || rightLabel };
    return `${leader.name} comes out ahead, leading ${leader.n}–${leader.l} across tracked metrics.`;
  })();

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-zinc-800 px-5 py-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-400">Audit comparison</p>
            <h2 className="mt-1 text-base font-semibold text-zinc-100">{title}</h2>
            <p className="mt-1 text-xs text-zinc-500">{subtitle}</p>
          </div>
          <button onClick={onClose} aria-label="Close comparison" className="text-xl leading-none text-zinc-500 hover:text-zinc-200">×</button>
        </div>

        {/* Site cards */}
        <div className="flex flex-col sm:flex-row gap-3 px-5 pt-4">
          <SiteCard snapshot={before} label={leftLabel} />
          <SiteCard snapshot={after} label={rightLabel} />
        </div>

        {/* Verdict */}
        <div className="mx-5 mt-3 rounded-lg border border-violet-500/25 bg-violet-500/5 px-3 py-2.5 flex items-start gap-2">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400 shrink-0 mt-0.5">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          <p className="text-xs leading-snug text-zinc-300">{verdict}</p>
        </div>

        {/* Metrics */}
        <div className="px-5 pb-5 pt-2">
          <p className="mt-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Scores</p>
          {SCORE_METRICS.map((def) => (
            <MetricRow key={def.label} def={def} before={before} after={after} leftLabel={leftLabel} rightLabel={rightLabel} />
          ))}

          <p className="mt-4 mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Issue counts — lower is better</p>
          {ISSUE_METRICS.map((def) => (
            <MetricRow key={def.label} def={def} before={before} after={after} leftLabel={leftLabel} rightLabel={rightLabel} />
          ))}
        </div>
      </div>
    </div>
  );
}
