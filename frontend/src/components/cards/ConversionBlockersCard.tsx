import type { ConversionScores, UXResult } from "../../types/analysis";
import { CardShell } from "../ui/CardShell";

type BlockerSeverity = "critical" | "warning" | "info";

interface Blocker {
  id: string;
  title: string;
  description: string;
  severity: BlockerSeverity;
}

function deriveBlockers(scores: ConversionScores, ux: UXResult): Blocker[] {
  const blockers: Blocker[] = [];

  if (scores.clarity < 40)
    blockers.push({
      id: "clarity",
      title: "Value proposition is unclear",
      description: scores.clarityNote || "Visitors can't understand what you offer within 5 seconds.",
      severity: "critical",
    });

  if (scores.trust < 40)
    blockers.push({
      id: "trust",
      title: "Visitors don't trust the page",
      description: scores.trustNote || "Trust signals are too weak to motivate action.",
      severity: "critical",
    });

  if (!ux.hasCTA || scores.ctaStrength < 40)
    blockers.push({
      id: "cta",
      title: "No clear path to action",
      description: ux.hasCTA
        ? (scores.ctaNote || "CTA is present but too weak to drive clicks.")
        : "No call-to-action button detected on the page.",
      severity: "critical",
    });

  if (scores.friction > 65)
    blockers.push({
      id: "friction",
      title: "High conversion friction",
      description: scores.frictionNote || "Visitors are hitting too many obstacles before converting.",
      severity: "warning",
    });

  if (!ux.hasSocialProof)
    blockers.push({
      id: "social-proof",
      title: "Missing social proof",
      description: "No reviews, testimonials, or user count detected.",
      severity: "warning",
    });

  if (!ux.hasPrivacyPolicy)
    blockers.push({
      id: "privacy",
      title: "No privacy policy",
      description: "Cautious visitors will not submit forms or purchase without one.",
      severity: "warning",
    });

  if (!ux.hasTrustSignals && scores.trust >= 40)
    blockers.push({
      id: "trust-signals",
      title: "No structural trust signals",
      description: "Add a security badge, testimonial, or press mention to reassure visitors.",
      severity: "info",
    });

  const severityOrder: Record<BlockerSeverity, number> = { critical: 0, warning: 1, info: 2 };
  blockers.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return blockers;
}

function SeverityIcon({ severity }: { severity: BlockerSeverity }) {
  if (severity === "critical") {
    return (
      <svg
        aria-hidden="true"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-red-400 shrink-0 mt-0.5"
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    );
  }

  if (severity === "warning") {
    return (
      <svg
        aria-hidden="true"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-amber-400 shrink-0 mt-0.5"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    );
  }

  return (
    <svg
      aria-hidden="true"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-zinc-500 shrink-0 mt-0.5"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}

function blockerRowStyles(severity: BlockerSeverity): string {
  if (severity === "critical") return "border-red-500/25 bg-red-950/20";
  if (severity === "warning")  return "border-amber-500/25 bg-amber-950/20";
  return "border-zinc-700/40 bg-zinc-900/30";
}

interface ConversionBlockersCardProps {
  scores: ConversionScores;
  ux: UXResult;
}

export function ConversionBlockersCard({ scores, ux }: ConversionBlockersCardProps) {
  const blockers      = deriveBlockers(scores, ux);
  const criticalCount = blockers.filter((b) => b.severity === "critical").length;
  const topBlocker    = blockers[0];

  return (
    <CardShell>
      {/* Header */}
      <div className="p-5 pb-0">
        <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-[0.2em]">
          Conversion Blockers
        </p>
        {criticalCount === 0 ? (
          <p className="text-sm font-semibold text-emerald-400 mt-1">No critical blockers found</p>
        ) : (
          <p className="text-sm font-semibold text-red-400 mt-1">
            {criticalCount} thing{criticalCount > 1 ? "s" : ""} blocking conversions
          </p>
        )}
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col gap-2.5">
        {blockers.length === 0 ? (
          <div className="flex items-center gap-2 py-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <p className="text-xs text-emerald-400/80">
              No conversion blockers detected — your page is well-optimised for conversions.
            </p>
          </div>
        ) : (
          <>
            {blockers.map((blocker) => (
              <div
                key={blocker.id}
                className={`rounded-lg border p-3 flex items-start gap-3 ${blockerRowStyles(blocker.severity)}`}
              >
                <SeverityIcon severity={blocker.severity} />
                <div>
                  <p className="text-xs font-semibold text-zinc-100">{blocker.title}</p>
                  <p className="text-[11px] text-zinc-400 leading-snug mt-0.5">{blocker.description}</p>
                </div>
              </div>
            ))}

            {/* What to improve first */}
            <div className="mt-1 pt-3 border-t border-zinc-800/60">
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
                What to improve first
              </p>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {topBlocker.severity === "critical"
                  ? `Start with "${topBlocker.title.toLowerCase()}" — it's actively stopping conversions.`
                  : `Focus on "${topBlocker.title.toLowerCase()}" for the quickest improvement.`}
              </p>
            </div>
          </>
        )}
      </div>
    </CardShell>
  );
}
