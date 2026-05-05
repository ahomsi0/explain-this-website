// frontend/src/components/cards/ConversionScoreCard.tsx
import type { ConversionScores } from "../../types/analysis";
import { CardShell } from "../ui/CardShell";
import { CardHeader } from "../ui/CardHeader";
import { ScoreInsight } from "../ui/ScoreInsight";

function scoreColor(n: number) {
  if (n >= 70) return { bar: "bg-emerald-500", text: "text-emerald-400" };
  if (n >= 45) return { bar: "bg-amber-500",   text: "text-amber-400"   };
  return             { bar: "bg-red-500",       text: "text-red-400"     };
}

function ScoreRow({ label, score, note }: { label: string; score: number; note: string }) {
  const c = scoreColor(score);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-300">{label}</span>
        <span className={`text-xs font-semibold ${c.text}`}>{score}<span className="text-zinc-600 font-normal">/100</span></span>
      </div>
      <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${c.bar}`} style={{ width: `${score}%` }} />
      </div>
      {note && <p className="text-[11px] text-zinc-500 leading-snug">{note}</p>}
    </div>
  );
}

function overallLabel(n: number) {
  if (n >= 80) return "Strong";
  if (n >= 65) return "Good";
  if (n >= 45) return "Fair";
  if (n >= 25) return "Weak";
  return "Poor";
}

function buildBlockers(scores: ConversionScores): string[] {
  const blockers: string[] = [];
  if (scores.ctaStrength < 50)  blockers.push("Weak or absent call-to-action — visitors don't know what to do next.");
  if (scores.trust < 50)        blockers.push("Low trust signals — no reviews, badges, or social proof detected.");
  if (scores.clarity < 50)      blockers.push("Unclear offer — the value proposition is not immediately obvious.");
  if (scores.friction < 40)     blockers.push("Ease of action is low — the conversion path has unnecessary obstacles.");
  return blockers;
}

function whatToImproveFirst(scores: ConversionScores): string {
  const worst = [
    { label: "CTA strength", score: scores.ctaStrength },
    { label: "trust",        score: scores.trust        },
    { label: "clarity",      score: scores.clarity      },
  ].sort((a, b) => a.score - b.score)[0];
  return `Focus on improving ${worst.label} first — at ${worst.score}/100 it's your biggest drag on conversions.`;
}

function conversionInsightText(score: number): { meaning: string; nextStep: string } {
  if (score >= 70) return {
    meaning: "Strong conversion readiness — your offer is clear, trustworthy, and easy to act on.",
    nextStep: "A/B test your CTA copy and button placement to push conversion rates even higher.",
  };
  if (score >= 45) return {
    meaning: "Moderate conversion potential — some friction or trust gaps are leaving revenue on the table.",
    nextStep: "Address the blockers listed above; even one fix can meaningfully lift conversion rate.",
  };
  return {
    meaning: "Low conversion readiness — significant barriers are preventing visitors from taking action.",
    nextStep: "Start with a single, specific CTA and one trust signal. Don't optimize other areas first.",
  };
}

export function ConversionScoreCard({ scores }: { scores: ConversionScores }) {
  const overall  = scoreColor(scores.overall);
  const blockers = buildBlockers(scores);
  const priority = whatToImproveFirst(scores);
  const insight  = conversionInsightText(scores.overall);

  return (
    <CardShell>
      <CardHeader
        title="Conversion Score"
        badge={`${scores.overall}/100`}
        badgeColor={scores.overall >= 70 ? "green" : scores.overall >= 45 ? "amber" : "red"}
      />
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-baseline gap-1">
            <span className={`text-xs font-medium ${overall.text}`}>{overallLabel(scores.overall)}</span>
            <span className={`text-sm font-bold ${overall.text}`}>{scores.overall}</span>
            <span className="text-xs text-zinc-600">/100</span>
          </div>
        </div>

        <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden mb-5">
          <div className={`h-full rounded-full transition-all duration-700 ${overall.bar}`} style={{ width: `${scores.overall}%` }} />
        </div>

        <div className="flex flex-col gap-3.5 mb-5">
          <ScoreRow label="Clarity"      score={scores.clarity}     note={scores.clarityNote}  />
          <ScoreRow label="Trust"        score={scores.trust}       note={scores.trustNote}    />
          <ScoreRow label="CTA Strength" score={scores.ctaStrength} note={scores.ctaNote}      />
          <ScoreRow label="Ease"         score={scores.friction}    note={scores.frictionNote} />
        </div>

        {/* Conversion blockers */}
        {blockers.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/20 border border-red-900/30">
            <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-2">Conversion Blockers</p>
            <div className="flex flex-col gap-1.5">
              {blockers.map((b, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 mt-1.5" />
                  <span className="text-xs text-zinc-400">{b}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* What to improve first */}
        <div className="mb-1 p-3 rounded-lg bg-violet-950/20 border border-violet-900/30">
          <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-wider mb-1">What to Improve First</p>
          <p className="text-xs text-zinc-400">{priority}</p>
        </div>

        <ScoreInsight meaning={insight.meaning} nextStep={insight.nextStep} />
      </div>
    </CardShell>
  );
}
