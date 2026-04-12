import type { ConversionScores } from "../../types/analysis";

function scoreColor(n: number) {
  if (n >= 70) return { bar: "bg-emerald-500", text: "text-emerald-400" };
  if (n >= 45) return { bar: "bg-amber-500",   text: "text-amber-400"   };
  return             { bar: "bg-red-500",       text: "text-red-400"     };
}

function ScoreRow({
  label,
  score,
  note,
}: {
  label: string;
  score: number;
  note: string;
}) {
  const c = scoreColor(score);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-300">{label}</span>
        <span className={`text-xs font-semibold ${c.text}`}>{score}<span className="text-zinc-600 font-normal">/100</span></span>
      </div>
      <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${c.bar}`}
          style={{ width: `${score}%` }}
        />
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

export function ConversionScoreCard({ scores }: { scores: ConversionScores }) {
  const overall = scoreColor(scores.overall);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Conversion Readiness</p>
        <div className="flex items-baseline gap-1.5">
          <span className={`text-xs font-medium ${overall.text}`}>{overallLabel(scores.overall)}</span>
          <span className={`text-2xl font-bold ${overall.text}`}>{scores.overall}</span>
          <span className="text-xs text-zinc-600">/100</span>
        </div>
      </div>

      {/* Overall bar */}
      <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden mb-5">
        <div
          className={`h-full rounded-full transition-all duration-700 ${overall.bar}`}
          style={{ width: `${scores.overall}%` }}
        />
      </div>

      <div className="flex flex-col gap-3.5">
        <ScoreRow label="Clarity"      score={scores.clarity}     note={scores.clarityNote}  />
        <ScoreRow label="Trust"        score={scores.trust}       note={scores.trustNote}    />
        <ScoreRow label="CTA Strength" score={scores.ctaStrength} note={scores.ctaNote}      />
        {/* "Ease" = inverse of friction — higher score means less friction, better UX */}
        <ScoreRow label="Ease"         score={scores.friction}    note={scores.frictionNote} />
      </div>
    </div>
  );
}
