import type { AnalysisResult } from "../types/analysis";

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
  uxScore: number;
  conversionScore: number;
  topIssues: InsightItem[];
  quickWins: InsightItem[];
  summarySentence: string;
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

interface Candidate {
  id: string;
  title: string;
  description: string;
  score: number; // impact × severity: higher = worse = higher priority issue
  effort: "low" | "high" | "medium"; // low effort = quick win candidate
}

export function computeInsights(result: AnalysisResult): Insights {
  const seoScore        = computeSeoScore(result);
  const perfScore       = computePerfScore(result);
  const uxScore         = computeUxScore(result);
  const conversionScore = result.conversionScores.overall;

  // When perfScore is -1 (no data), exclude it from the weighted average
  const perfAvailable = perfScore >= 0;
  const overallScore = perfAvailable
    ? clamp(seoScore * 0.25 + perfScore * 0.25 + uxScore * 0.25 + conversionScore * 0.25)
    : clamp((seoScore + uxScore + conversionScore) / 3);

  const candidates: Candidate[] = [];

  // SEO: FAIL checks
  result.seoChecks.filter((c) => c.status === "fail").forEach((c) => {
    candidates.push({
      id: `seo-fail-${c.id}`,
      title: `Fix SEO: ${c.label}`,
      description: c.detail,
      score: 84,
      effort: "low",
    });
  });

  // SEO: WARNING checks
  result.seoChecks.filter((c) => c.status === "warning").forEach((c) => {
    candidates.push({
      id: `seo-warn-${c.id}`,
      title: `Improve SEO: ${c.label}`,
      description: c.detail,
      score: 55,
      effort: "low",
    });
  });

  // Performance (only when data is available)
  if (perfAvailable && perfScore < 50) {
    candidates.push({
      id: "slow-performance",
      title: "Improve page speed",
      description: `Lighthouse performance score is ${perfScore}/100 — users are likely experiencing slow loads.`,
      score: 95,
      effort: "high",
    });
  } else if (perfAvailable && perfScore < 75) {
    candidates.push({
      id: "moderate-performance",
      title: "Optimize page speed",
      description: `Performance score is ${perfScore}/100 — moderate load times may hurt conversions.`,
      score: 65,
      effort: "high",
    });
  }

  // Images
  if (result.imageAudit.modernPct < 50) {
    candidates.push({
      id: "image-format",
      title: "Convert images to WebP/AVIF",
      description: `Only ${result.imageAudit.modernPct}% of images use modern formats. Switching saves significant bandwidth.`,
      score: 70,
      effort: "low",
    });
  }
  if (result.imageAudit.missingLazy > 3) {
    candidates.push({
      id: "lazy-loading",
      title: "Add lazy loading to images",
      description: `${result.imageAudit.missingLazy} images lack lazy loading — add loading="lazy" to defer off-screen images.`,
      score: 60,
      effort: "low",
    });
  }

  // CTA
  if (!result.ux.hasCTA) {
    candidates.push({
      id: "no-cta",
      title: "Add a clear call-to-action",
      description: "No CTA button detected. A strong CTA is the single biggest conversion lever.",
      score: 98,
      effort: "low",
    });
  } else if (result.conversionScores.ctaStrength < 50) {
    candidates.push({
      id: "weak-cta",
      title: "Strengthen the call-to-action",
      description: `CTA strength is ${result.conversionScores.ctaStrength}/100. Make the primary action obvious and specific.`,
      score: 75,
      effort: "low",
    });
  }

  // Trust
  if (!result.ux.hasTrustSignals) {
    candidates.push({
      id: "no-trust",
      title: "Add trust signals",
      description: "No trust signals detected (reviews, badges, testimonials). These significantly boost conversion.",
      score: 80,
      effort: "medium",
    });
  }

  // Mobile
  if (!result.ux.mobileReady) {
    candidates.push({
      id: "not-mobile-ready",
      title: "Improve mobile readiness",
      description: "The page shows mobile readiness issues. Over 60% of web traffic is mobile.",
      score: 78,
      effort: "high",
    });
  }

  // Broken links
  if (result.linkCheck.broken > 0) {
    candidates.push({
      id: "broken-links",
      title: `Fix ${result.linkCheck.broken} broken link${result.linkCheck.broken > 1 ? "s" : ""}`,
      description: "Broken links hurt SEO rankings and damage user trust.",
      score: 88,
      effort: "low",
    });
  }

  // Security headers
  const secFails = result.securityHeaders.filter((h) => h.status === "fail").length;
  if (secFails >= 3) {
    candidates.push({
      id: "security-headers",
      title: "Add missing security headers",
      description: `${secFails} security headers are missing. These protect users and improve trust scores.`,
      score: 72,
      effort: "low",
    });
  }

  // Vague copy
  if (result.copyAnalysis.vaguePhrases.length > 2) {
    candidates.push({
      id: "vague-copy",
      title: "Replace vague marketing language",
      description: `${result.copyAnalysis.vaguePhrases.length} generic phrases detected. Specific copy converts better.`,
      score: 65,
      effort: "low",
    });
  }

  // Stale content — scored high because it signals abandonment and hurts trust/SEO
  if (result.siteFreshness.rating === "stale") {
    candidates.push({
      id: "stale-content",
      title: "Update stale content",
      description: "Site content appears outdated. Fresh content signals trust and relevance.",
      score: 91,
      effort: "high",
    });
  }

  // Privacy policy
  if (!result.ux.hasPrivacyPolicy) {
    candidates.push({
      id: "no-privacy-policy",
      title: "Add a privacy policy",
      description: "No privacy policy found. Required by GDPR/CCPA and builds user trust.",
      score: 62,
      effort: "low",
    });
  }

  // Sort by descending priority score
  candidates.sort((a, b) => b.score - a.score);

  const topIssues: InsightItem[] = candidates.slice(0, 3).map((c) => ({
    id: c.id,
    title: c.title,
    impact: c.score >= 80 ? "high" : c.score >= 55 ? "medium" : "low",
    description: c.description,
  }));

  // Quick wins = low effort candidates, sorted by score
  const quickWinCandidates = candidates
    .filter((c) => c.effort === "low")
    .slice(0, 3);

  const quickWins: InsightItem[] = quickWinCandidates.map((c) => ({
    id: c.id,
    title: c.title,
    impact: c.score >= 80 ? "high" : c.score >= 55 ? "medium" : "low",
    description: c.description,
  }));

  const summarySentence = buildSummary({ seoScore, perfScore, uxScore, conversionScore, result });

  return { overallScore, seoScore, perfScore: perfAvailable ? perfScore : 0, uxScore, conversionScore, topIssues, quickWins, summarySentence };
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
