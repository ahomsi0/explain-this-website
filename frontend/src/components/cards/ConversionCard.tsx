import { Progress } from "@/components/ui/progress";
import type { UXResult } from "../../types/analysis";

interface SignalRow { label: string; present: boolean; detail: string }

function Signal({ label, present, detail }: SignalRow) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${present ? "bg-emerald-400" : "bg-slate-600"}`} />
      <span className="text-sm text-slate-300 w-36 shrink-0">{label}</span>
      <span className="text-xs text-slate-500 truncate">{detail}</span>
    </div>
  );
}

export function ConversionCard({ ux }: { ux: UXResult }) {
  const signals = [ux.hasCTA, ux.hasForms, ux.hasSocialProof, ux.hasTrustSignals, ux.hasContactInfo, ux.mobileReady];
  const score   = Math.round((signals.filter(Boolean).length / signals.length) * 100);
  const barColor = score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-amber-500" : "bg-rose-500";

  return (
    <div className="rounded-xl border border-white/8 bg-white/4 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-200">Conversion & UX</h3>
        <span className="text-sm font-bold text-slate-100">{score}<span className="text-xs font-normal text-slate-500">/100</span></span>
      </div>

      <Progress value={score} className="mb-4 h-1.5" indicatorClassName={barColor} />

      <Signal label="Call-to-Action"   present={ux.hasCTA}          detail={ux.hasCTA    ? `${ux.ctaCount} CTAs detected`     : "None found"} />
      <Signal label="Lead Capture"     present={ux.hasForms}         detail={ux.hasForms  ? `${ux.formCount} form(s)`          : "No forms"} />
      <Signal label="Social Proof"     present={ux.hasSocialProof}   detail={ux.hasSocialProof   ? "Reviews / ratings detected" : "None found"} />
      <Signal label="Trust Signals"    present={ux.hasTrustSignals}  detail={ux.hasTrustSignals  ? "Guarantee / secure"         : "None found"} />
      <Signal label="Contact Info"     present={ux.hasContactInfo}   detail={ux.hasContactInfo   ? "Phone / email present"      : "None found"} />
      <Signal label="Mobile Ready"     present={ux.mobileReady}      detail={ux.mobileReady      ? "Viewport tag present"       : "Missing viewport"} />
    </div>
  );
}
