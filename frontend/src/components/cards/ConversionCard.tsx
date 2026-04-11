import type { UXResult } from "../../types/analysis";

function Row({ label, present, detail }: { label: string; present: boolean; detail: string }) {
  return (
    <div className="flex items-center gap-2.5 py-2 border-b border-zinc-800/60 last:border-0">
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${present ? "bg-emerald-500" : "bg-zinc-700"}`} />
      <span className="text-xs text-zinc-400 w-32 shrink-0">{label}</span>
      <span className="text-xs text-zinc-500 truncate">{detail}</span>
    </div>
  );
}

export function ConversionCard({ ux }: { ux: UXResult }) {
  const coreSigs = [ux.hasCTA, ux.hasForms, ux.hasSocialProof, ux.hasTrustSignals, ux.hasContactInfo, ux.mobileReady];
  const score    = Math.round((coreSigs.filter(Boolean).length / coreSigs.length) * 100);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Conversion & UX</p>
        <span className={`font-semibold text-sm ${score >= 70 ? "text-emerald-400" : score >= 40 ? "text-amber-400" : "text-red-400"}`}>
          {score}<span className="text-zinc-600 font-normal text-xs">/100</span>
        </span>
      </div>

      <Row label="Call-to-Action"   present={ux.hasCTA}          detail={ux.hasCTA    ? `${ux.ctaCount} detected`    : "None found"} />
      <Row label="Lead Form"        present={ux.hasForms}         detail={ux.hasForms  ? `${ux.formCount} form(s)`    : "None found"} />
      <Row label="Social Proof"     present={ux.hasSocialProof}   detail={ux.hasSocialProof   ? "Detected" : "None found"} />
      <Row label="Trust Signals"    present={ux.hasTrustSignals}  detail={ux.hasTrustSignals  ? "Detected" : "None found"} />
      <Row label="Contact Info"     present={ux.hasContactInfo}   detail={ux.hasContactInfo   ? "Present"  : "None found"} />
      <Row label="Mobile Ready"     present={ux.mobileReady}      detail={ux.mobileReady      ? "Viewport tag present" : "Missing"} />

      <div className="mt-3 pt-3 border-t border-zinc-800">
        <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Trust & Engagement</p>
        <Row label="Cookie Banner"    present={ux.hasCookieBanner}     detail={ux.hasCookieBanner     ? "Consent UI detected"      : "None found"} />
        <Row label="Live Chat"        present={ux.hasLiveChat}         detail={ux.hasLiveChat         ? "Widget detected"          : "None found"} />
        <Row label="Video Content"    present={ux.hasVideoContent}     detail={ux.hasVideoContent     ? "Video detected"           : "None found"} />
        <Row label="Newsletter"       present={ux.hasNewsletterSignup} detail={ux.hasNewsletterSignup ? "Signup form detected"      : "None found"} />
        <Row label="Privacy Policy"   present={ux.hasPrivacyPolicy}   detail={ux.hasPrivacyPolicy    ? "Policy link found"         : "None found"} />
      </div>
    </div>
  );
}
