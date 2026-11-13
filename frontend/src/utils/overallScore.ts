// ".js" specifier: this file is bundled into a Vercel function (see api/report-preview.ts).
import type { AnalysisResult } from "../types/analysis.js";

// The headline scores of a report. Kept free of any other import so the
// link-preview function (api/report-preview.ts) can bundle it on its own and
// always shows the same numbers as the report page.

export interface ScoreParts {
  overall: number;
  seo: number;
  /** Lighthouse performance, mobile first. -1 when PageSpeed returned nothing. */
  performance: number;
  ux: number;
  conversion: number;
}

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function seoScore(result: AnalysisResult): number {
  const requiredChecks = result.seoChecks.filter((c) => !c.optional);
  const pass = requiredChecks.filter((c) => c.status === "pass").length;
  return requiredChecks.length ? clamp((pass / requiredChecks.length) * 100) : 0;
}

function performanceScore(result: AnalysisResult): number {
  return result.performance?.mobile?.lighthouse?.performance
    ?? result.performance?.desktop?.lighthouse?.performance
    ?? -1;
}

function uxScore(result: AnalysisResult): number {
  // Conversion-relevant signals only (hasCookieBanner, hasLiveChat, etc. excluded)
  const sigs = [
    result.ux.hasCTA,
    result.ux.hasForms,
    result.ux.hasSocialProof,
    result.ux.hasTrustSignals,
    result.ux.hasContactInfo,
    result.ux.mobileReady,
  ];
  return clamp((sigs.filter(Boolean).length / sigs.length) * 100);
}

export function computeScoreParts(result: AnalysisResult): ScoreParts {
  const seo = seoScore(result);
  const performance = performanceScore(result);
  const ux = uxScore(result);
  // Legacy saved audits may predate conversionScores — treat as neutral 50.
  const conversion = result.conversionScores?.overall ?? 50;
  // When performance is -1 (no data), exclude it from the average.
  const overall = performance >= 0
    ? clamp(seo * 0.25 + performance * 0.25 + ux * 0.25 + conversion * 0.25)
    : clamp((seo + ux + conversion) / 3);
  return { overall, seo, performance, ux, conversion };
}
