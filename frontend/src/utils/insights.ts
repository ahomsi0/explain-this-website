import type { AnalysisResult } from "../types/analysis";
import { computePriorityIssues, getFixFirst, getQuickWins } from "./priorityIssues";
import type { PriorityIssue } from "./priorityIssues";

export interface InsightItem {
  id: string;
  title: string;
  impact: "high" | "medium" | "low";
  description: string;
}

export interface Insights {
  overallScore: number;
  seoScore: number;
  perfScore: number;
  perfScoreMobile: number;   // -1 when unavailable
  perfScoreDesktop: number;  // -1 when unavailable
  perfUnavailable: boolean;  // true when no PageSpeed data is available
  uxScore: number;
  conversionScore: number;
  /** Up to 3 highest-priority issues. May be empty if no issues are detected. */
  topIssues: InsightItem[];
  /** Up to 3 low-effort quick wins. May be empty if no low-effort issues are detected. */
  quickWins: InsightItem[];
  summarySentence: string;
  allIssues: PriorityIssue[];
}

function clamp(n: number) {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function computeSeoScore(result: AnalysisResult): number {
  const pass = result.seoChecks.filter((c) => c.status === "pass").length;
  return result.seoChecks.length ? clamp((pass / result.seoChecks.length) * 100) : 0;
}

/** Returns the Lighthouse performance score, or -1 when no data is available. */
function computePerfScore(result: AnalysisResult): number {
  return result.performance?.mobile?.lighthouse?.performance
    ?? result.performance?.desktop?.lighthouse?.performance
    ?? -1;
}

function computeUxScore(result: AnalysisResult): number {
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

export function computeInsights(result: AnalysisResult): Insights {
  const seoScore        = computeSeoScore(result);
  const perfScore       = computePerfScore(result);
  const uxScore         = computeUxScore(result);
  const conversionScore = result.conversionScores.overall;

  // When perfScore is -1 (no data), exclude it from the weighted average
  const perfAvailable = perfScore >= 0;
  const perfUnavailable = !perfAvailable;
  const overallScore = perfAvailable
    ? clamp(seoScore * 0.25 + perfScore * 0.25 + uxScore * 0.25 + conversionScore * 0.25)
    : clamp((seoScore + uxScore + conversionScore) / 3);

  const allIssues = computePriorityIssues(result);
  const fixFirst  = getFixFirst(allIssues);
  const qwList    = getQuickWins(allIssues);

  const topIssues: InsightItem[] = fixFirst.slice(0, 3).map(i => ({
    id: i.id,
    title: i.title,
    impact: i.impact,
    description: i.whyItMatters,
  }));

  const quickWins: InsightItem[] = qwList.map(i => ({
    id: i.id,
    title: i.title,
    impact: i.impact,
    description: i.whyItMatters,
  }));

  const summarySentence = buildSummary({ seoScore, perfScore, uxScore, conversionScore, result });

  const perfScoreMobile  = result.performance?.mobile?.lighthouse?.performance  ?? -1;
  const perfScoreDesktop = result.performance?.desktop?.lighthouse?.performance ?? -1;

  return { overallScore, seoScore, perfScore: perfAvailable ? perfScore : 0, perfScoreMobile, perfScoreDesktop, perfUnavailable, uxScore, conversionScore, topIssues, quickWins, summarySentence, allIssues };
}

function buildSummary({
  seoScore, perfScore, uxScore, conversionScore, result,
}: {
  seoScore: number; perfScore: number; uxScore: number; conversionScore: number;
  result: AnalysisResult;
}): string {
  const strong: string[] = [];
  const weak: string[]   = [];

  if (seoScore >= 75)        strong.push("solid SEO structure");
  else if (seoScore < 50)    weak.push("weak SEO fundamentals");

  if (perfScore >= 75)              strong.push("fast load times");
  else if (perfScore >= 0 && perfScore < 50) weak.push("slow page speed");

  if (uxScore >= 75)         strong.push("good UX signals");
  else if (uxScore < 50)     weak.push("missing UX elements");

  if (conversionScore >= 65) strong.push("clear conversion path");
  else if (conversionScore < 45) weak.push("weak CTA clarity");

  if (!result.ux.mobileReady) weak.push("poor mobile experience");
  if (result.linkCheck.broken > 0) weak.push(`${result.linkCheck.broken} broken link${result.linkCheck.broken > 1 ? "s" : ""}`);

  if (strong.length === 0 && weak.length === 0) {
    return "Your site has room for improvement across all key areas.";
  }
  if (strong.length === 0) {
    return `Your site needs work — key issues include ${weak.join(", ")}.`;
  }
  if (weak.length === 0) {
    return `Your site performs well with ${strong.join(" and ")}.`;
  }
  return `Your site has ${strong.join(" and ")}, but suffers from ${weak.join(", ")}.`;
}
