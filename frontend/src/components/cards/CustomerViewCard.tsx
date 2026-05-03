import type { CustomerView } from "../../types/analysis";
import { CardShell } from "../ui/CardShell";
import { CardHeader } from "../ui/CardHeader";

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
          {customerView.statements.map((stmt, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-zinc-500 mt-0.5 shrink-0 text-[10px]">›</span>
              <p className="text-xs text-zinc-400 leading-relaxed">{stmt}</p>
            </div>
          ))}
        </div>
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
