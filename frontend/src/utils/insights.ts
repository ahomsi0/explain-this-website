import type { AnalysisResult } from "../types/analysis";
import { computePriorityIssues, getFixFirst, getQuickWins } from "./priorityIssues";
import type { PriorityIssue } from "./priorityIssues";
import { computeScoreParts } from "./overallScore";

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

export function computeInsights(result: AnalysisResult): Insights {
  // The formula lives in overallScore.ts so link previews show the same numbers.
  const { overall: overallScore, seo: seoScore, performance: perfScore, ux: uxScore, conversion: conversionScore } =
    computeScoreParts(result);
  const perfUnavailable = perfScore < 0;

  const allIssues = computePriorityIssues(result);
  const fixFirst  = getFixFirst(allIssues);
  const qwList    = getQuickWins(allIssues);

  const topIssues: InsightItem[] = fixFirst.slice(0, 5).map(i => ({
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

  return { overallScore, seoScore, perfScore, perfScoreMobile, perfScoreDesktop, perfUnavailable, uxScore, conversionScore, topIssues, quickWins, summarySentence, allIssues };
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
    return `Your site needs work: key issues include ${weak.join(", ")}.`;
  }
  if (weak.length === 0) {
    return `Your site performs well with ${strong.join(" and ")}.`;
  }
  return `Your site has ${strong.join(" and ")}, but suffers from ${weak.join(", ")}.`;
}
