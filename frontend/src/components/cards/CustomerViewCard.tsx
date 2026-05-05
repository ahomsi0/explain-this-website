import type { CustomerView } from "../../types/analysis";
import { CardShell } from "../ui/CardShell";
import { CardHeader } from "../ui/CardHeader";
import { ScoreInsight } from "../ui/ScoreInsight";

function uxVerdictData(trustLevel: "strong" | "moderate" | "weak", offerClear: boolean, ctaClear: boolean) {
  const signals = [trustLevel === "strong", offerClear, ctaClear].filter(Boolean).length;
  if (signals === 3) return {
    label: "Strong",
    cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
    meaning: "Strong first impression — visitors quickly understand the offer and trust the brand.",
    nextStep: "Keep refining copy freshness and social proof to maintain this standard.",
  };
  if (signals >= 2) return {
    label: "Moderate",
    cls: "text-amber-400 bg-amber-500/10 border-amber-500/25",
    meaning: "Decent UX but some trust or clarity gaps may cause visitors to hesitate.",
    nextStep: "Improve the weakest signal — unclear offers and missing trust badges are top priorities.",
  };
  return {
    label: "Weak",
    cls: "text-red-400 bg-red-500/10 border-red-500/25",
    meaning: "Visitors are unlikely to convert — the offer is unclear or the site feels untrustworthy.",
    nextStep: "Start with a single clear value proposition and add at least one social proof element.",
  };
}

const trustColor = {
  strong:   "text-emerald-400",
  moderate: "text-amber-400",
  weak:     "text-red-400",
};

const trustLabel = {
  strong:   "Strong",
  moderate: "Moderate",
  weak:     "Weak",
};

export function CustomerViewCard({ customerView }: { customerView: CustomerView }) {
  const statements = customerView.statements ?? [];
  const verdict = uxVerdictData(customerView.trustLevel, customerView.offerClear, customerView.ctaClear);
  return (
    <CardShell>
      <CardHeader
        title="Customer View"
        badge={customerView.trustLevel}
        badgeColor={
          customerView.trustLevel === "strong" ? "green"
          : customerView.trustLevel === "moderate" ? "amber"
          : "red"
        }
      />
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className={`text-[10px] font-semibold uppercase ${trustColor[customerView.trustLevel]}`}>
            Trust: {trustLabel[customerView.trustLevel]}
          </span>
        </div>

        {/* Signal pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Pill label="Offer Clear" active={customerView.offerClear} />
          <Pill label="CTA Visible" active={customerView.ctaClear} />
        </div>

        {/* Statements */}
        <div className="flex flex-col gap-2.5">
          {statements.map((stmt, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-zinc-500 mt-0.5 shrink-0 text-[10px]">›</span>
              <p className="text-xs text-zinc-400 leading-relaxed">{stmt}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2">
          <span className="text-[10px] text-zinc-500 font-medium">UX Verdict</span>
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${verdict.cls}`}>
            {verdict.label}
          </span>
        </div>
        <ScoreInsight meaning={verdict.meaning} nextStep={verdict.nextStep} />
      </div>
    </CardShell>
  );
}

function Pill({ label, active }: { label: string; active: boolean }) {
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
      active
        ? "bg-emerald-950 text-emerald-400 border-emerald-800"
        : "bg-red-950 text-red-400 border-red-800"
    }`}>
      {active ? "Yes" : "No"} - {label}
    </span>
  );
}
