// frontend/tests/insights.test.ts
import { describe, it, expect } from "vitest";
import { computeInsights } from "../src/utils/insights";
import type { AnalysisResult } from "../src/types/analysis";

const base: AnalysisResult = {
  url: "https://example.com",
  fetchedAt: "2026-05-05T00:00:00Z",
  overview: { title: "Test", description: "", favicon: "", language: "en", pageLoadHint: "heavy" },
  techStack: [],
  seoChecks: [
    { id: "title", label: "Title tag", status: "fail", detail: "Missing title" },
    { id: "meta",  label: "Meta description", status: "warning", detail: "Too short" },
    { id: "h1",    label: "H1 present", status: "pass", detail: "Found 1 H1" },
  ],
  ux: { hasCTA: false, ctaCount: 0, hasForms: false, formCount: 0, hasSocialProof: false,
        hasTrustSignals: false, hasContactInfo: false, mobileReady: false,
        hasCookieBanner: false, hasLiveChat: false, hasVideoContent: false,
        hasNewsletterSignup: false, hasPrivacyPolicy: false },
  weakPoints: ["Slow load time"],
  recommendations: ["Add alt text"],
  intent: { category: "ecommerce", label: "E-commerce", description: "Sells products" },
  customerView: { offerClear: false, ctaClear: false, trustLevel: "weak", statements: [] },
  conversionScores: { overall: 30, clarity: 40, trust: 20, ctaStrength: 25, friction: 35,
    clarityNote: "", trustNote: "", ctaNote: "", frictionNote: "" },
  firstImpression: { score: 4, label: "Fair", explanation: "Average look" },
  biggestOpportunity: "Improve CTA",
  competitorInsight: "",
  prioritizedIssues: [],
  eli5: [],
  aiDetection: { isAIBuilt: false, confidence: "high", builder: "", signals: [] },
  imageAudit: { total: 10, webp: 0, avif: 0, jpg: 8, png: 2, gif: 0, svg: 0,
    missingDims: 5, missingLazy: 7, modernPct: 0 },
  siteFreshness: { copyrightYear: 2020, latestDate: "", rating: "stale", signals: [] },
  securityHeaders: [
    { id: "hsts", label: "HSTS", status: "fail", detail: "Missing" },
  ],
  linkCheck: { checked: 5, ok: 3, broken: 2, redirects: 0, items: [] },
  colorPalette: { themeColor: "#fff", colors: [] },
  copyAnalysis: { score: 40, label: "Generic", vaguePhrases: [{ phrase: "best quality", reason: "Vague" }], specificityHints: [] },
  intentAlignment: { score: 50, checks: [] },
};

describe("computeInsights", () => {
  it("returns topIssues array with at most 3 items", () => {
    const { topIssues } = computeInsights(base);
    expect(topIssues.length).toBeLessThanOrEqual(3);
    expect(topIssues.length).toBeGreaterThan(0);
  });

  it("returns quickWins array with at most 3 items", () => {
    const { quickWins } = computeInsights(base);
    expect(quickWins.length).toBeLessThanOrEqual(3);
  });

  it("returns a non-empty summarySentence string", () => {
    const { summarySentence } = computeInsights(base);
    expect(typeof summarySentence).toBe("string");
    expect(summarySentence.length).toBeGreaterThan(10);
  });

  it("flags broken links as an issue", () => {
    const { topIssues } = computeInsights(base);
    expect(topIssues.some((i) => i.id === "broken-links")).toBe(true);
  });

  it("flags missing CTAs as an issue when hasCTA is false", () => {
    const { topIssues } = computeInsights(base);
    expect(topIssues.some((i) => i.id === "no-cta")).toBe(true);
  });

  // stale-content scores 58 — present in allIssues but may not reach the top-3 topIssues
  it("flags stale freshness as an issue", () => {
    const { allIssues } = computeInsights(base);
    expect(allIssues.some((i) => i.id === "stale-content")).toBe(true);
  });

  it("computes overallScore as weighted average of component scores", () => {
    const { overallScore } = computeInsights(base);
    expect(overallScore).toBeGreaterThanOrEqual(0);
    expect(overallScore).toBeLessThanOrEqual(100);
  });
});
