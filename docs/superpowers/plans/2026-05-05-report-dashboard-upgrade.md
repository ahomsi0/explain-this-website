# Report & Dashboard Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the website audit report into a paid-tier SaaS experience with an executive summary, score contexts, actionable insights per section, and a richer admin dashboard.

**Architecture:** We add a pure-frontend `computeInsights` utility that derives top issues / quick wins from the existing `AnalysisResult` data. New UI primitives (`ScoreInsight`, `Tooltip`, `Accordion`) are dropped into existing cards to avoid rewriting them. The admin dashboard is enhanced in place; no new backend endpoints are required for Phase 1 (admin enhancements use data already in `AdminOverview`).

**Tech Stack:** React 18, TypeScript, Tailwind CSS, existing `CardShell`/`CardHeader` primitives, Vite dev server.

---

## File Map

| Action | Path | Purpose |
|--------|------|---------|
| Create | `frontend/src/utils/insights.ts` | `computeInsights(result)` — derives top issues, quick wins, summary sentence |
| Create | `frontend/src/components/ui/ScoreInsight.tsx` | Reusable "What this means / What to do next" block |
| Create | `frontend/src/components/ui/Tooltip.tsx` | Hover tooltip primitive |
| Create | `frontend/src/components/ui/Accordion.tsx` | Collapsible section wrapper |
| Create | `frontend/src/components/cards/ExecutiveSummaryCard.tsx` | Hero card: overall score, 4 sub-scores, top-3 issues/wins, summary sentence |
| Modify | `frontend/src/components/ResultDashboard/sections.tsx` | Wire `ExecutiveSummaryCard` at top of overview; add "executive" section |
| Modify | `frontend/src/components/ResultDashboard/ResultDashboard.tsx` | Add `computeScores` extensions (overall + conversion scores) |
| Modify | `frontend/src/components/cards/SeoAuditCard.tsx` | Add "why it matters / how to fix" per FAIL/WARN row + `ScoreInsight` |
| Modify | `frontend/src/components/cards/PerformanceCard.tsx` | Add perf label (Fast/Moderate/Slow), bottleneck detection, suggestions + `ScoreInsight` |
| Modify | `frontend/src/components/cards/CustomerViewCard.tsx` | Add UX verdict (Strong/Moderate/Weak) + `ScoreInsight` |
| Modify | `frontend/src/components/cards/VagueLanguageCard.tsx` | Surface replacement suggestions per vague phrase |
| Modify | `frontend/src/components/cards/ConversionScoreCard.tsx` | Add "Conversion blockers" list + "What to improve first" + `ScoreInsight` |
| Modify | `frontend/src/components/admin/AdminDashboard.tsx` | Analytics cards, search/filter, reset-usage, env status panel |

---

## Task 1: `computeInsights` utility

**Files:**
- Create: `frontend/src/utils/insights.ts`
- Test: `frontend/tests/insights.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
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

  it("flags stale freshness as an issue", () => {
    const { topIssues } = computeInsights(base);
    expect(topIssues.some((i) => i.id === "stale-content")).toBe(true);
  });

  it("computes overallScore as weighted average of component scores", () => {
    const { overallScore } = computeInsights(base);
    expect(overallScore).toBeGreaterThanOrEqual(0);
    expect(overallScore).toBeLessThanOrEqual(100);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd frontend && npx vitest run tests/insights.test.ts 2>&1 | tail -20
```
Expected: `FAIL` — `computeInsights is not defined` or similar.

- [ ] **Step 3: Create `frontend/src/utils/insights.ts`**

```typescript
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

function computePerfScore(result: AnalysisResult): number {
  return result.performance?.mobile?.lighthouse?.performance
    ?? result.performance?.desktop?.lighthouse?.performance
    ?? 0;
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
  effort: "low" | "high"; // low effort = quick win candidate
}

export function computeInsights(result: AnalysisResult): Insights {
  const seoScore        = computeSeoScore(result);
  const perfScore       = computePerfScore(result);
  const uxScore         = computeUxScore(result);
  const conversionScore = result.conversionScores.overall;

  const overallScore = clamp(
    seoScore        * 0.25 +
    perfScore       * 0.25 +
    uxScore         * 0.25 +
    conversionScore * 0.25
  );

  const candidates: Candidate[] = [];

  // SEO: FAIL checks
  result.seoChecks.filter((c) => c.status === "fail").forEach((c) => {
    candidates.push({
      id: `seo-fail-${c.id}`,
      title: `Fix SEO: ${c.label}`,
      description: c.detail,
      score: 90,
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

  // Performance
  if (perfScore < 50) {
    candidates.push({
      id: "slow-performance",
      title: "Improve page speed",
      description: `Lighthouse performance score is ${perfScore}/100 — users are likely experiencing slow loads.`,
      score: 95,
      effort: "high",
    });
  } else if (perfScore < 75) {
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
      score: 85,
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

  // Stale content
  if (result.siteFreshness.rating === "stale") {
    candidates.push({
      id: "stale-content",
      title: "Update stale content",
      description: "Site content appears outdated. Fresh content signals trust and relevance.",
      score: 60,
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

  return { overallScore, seoScore, perfScore, uxScore, conversionScore, topIssues, quickWins, summarySentence };
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

  if (perfScore >= 75)       strong.push("fast load times");
  else if (perfScore < 50)   weak.push("slow page speed");

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
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd frontend && npx vitest run tests/insights.test.ts 2>&1 | tail -20
```
Expected: all 7 tests `PASS`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils/insights.ts frontend/tests/insights.test.ts
git commit -m "feat: add computeInsights utility for top issues, quick wins, summary"
```

---

## Task 2: `ScoreInsight` UI primitive

**Files:**
- Create: `frontend/src/components/ui/ScoreInsight.tsx`

- [ ] **Step 1: Create component**

```tsx
// frontend/src/components/ui/ScoreInsight.tsx
export function ScoreInsight({ meaning, nextStep }: { meaning: string; nextStep: string }) {
  return (
    <div className="mt-4 pt-4 border-t border-zinc-800 grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div className="flex gap-2.5">
        <div className="w-5 h-5 rounded bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">What this means</p>
          <p className="text-xs text-zinc-400 leading-relaxed">{meaning}</p>
        </div>
      </div>
      <div className="flex gap-2.5">
        <div className="w-5 h-5 rounded bg-zinc-800 flex items-center justify-center shrink-0 mt-0.5">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">What to do next</p>
          <p className="text-xs text-zinc-400 leading-relaxed">{nextStep}</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/ui/ScoreInsight.tsx
git commit -m "feat: add ScoreInsight UI primitive for score context blocks"
```

---

## Task 3: `Tooltip` UI primitive

**Files:**
- Create: `frontend/src/components/ui/Tooltip.tsx`

- [ ] **Step 1: Create component**

```tsx
// frontend/src/components/ui/Tooltip.tsx
import { useState } from "react";

export function Tooltip({ children, text }: { children: React.ReactNode; text: string }) {
  const [visible, setVisible] = useState(false);

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 w-max max-w-[220px] px-2.5 py-1.5 rounded-md bg-zinc-800 border border-zinc-700 text-[11px] text-zinc-300 leading-snug shadow-xl pointer-events-none text-center">
          {text}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-800" />
        </span>
      )}
    </span>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/ui/Tooltip.tsx
git commit -m "feat: add Tooltip UI primitive"
```

---

## Task 4: `ExecutiveSummaryCard`

**Files:**
- Create: `frontend/src/components/cards/ExecutiveSummaryCard.tsx`

This card is the hero of the overview section. It takes the pre-computed `Insights` object.

- [ ] **Step 1: Create component**

```tsx
// frontend/src/components/cards/ExecutiveSummaryCard.tsx
import type { Insights, InsightItem } from "../../utils/insights";
import { CardShell } from "../ui/CardShell";

function scoreColor(n: number) {
  return n >= 75 ? "text-emerald-400" : n >= 50 ? "text-amber-400" : "text-red-400";
}

function scoreBg(n: number) {
  return n >= 75 ? "bg-emerald-500/10 border-emerald-500/20" : n >= 50 ? "bg-amber-500/10 border-amber-500/20" : "bg-red-500/10 border-red-500/20";
}

function overallLabel(n: number) {
  if (n >= 80) return "Excellent";
  if (n >= 65) return "Good";
  if (n >= 50) return "Fair";
  if (n >= 35) return "Poor";
  return "Critical";
}

function ImpactDot({ impact }: { impact: InsightItem["impact"] }) {
  return (
    <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${
      impact === "high" ? "bg-red-500" : impact === "medium" ? "bg-amber-500" : "bg-zinc-500"
    }`} />
  );
}

function ScorePill({ label, score, tooltip }: { label: string; score: number; tooltip: string }) {
  return (
    <div className={`flex flex-col items-center gap-1 px-3 py-2.5 rounded-lg border ${scoreBg(score)}`} title={tooltip}>
      <span className={`text-xl font-bold tabular-nums leading-none ${scoreColor(score)}`}>{score}</span>
      <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-wider text-center leading-tight">{label}</span>
    </div>
  );
}

export function ExecutiveSummaryCard({ insights }: { insights: Insights }) {
  const { overallScore, seoScore, perfScore, uxScore, conversionScore, topIssues, quickWins, summarySentence } = insights;

  return (
    <CardShell>
      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-[0.2em] mb-1">Executive Summary</p>
            <p className="text-sm text-zinc-300 leading-relaxed max-w-xl">{summarySentence}</p>
          </div>
          {/* Overall score ring */}
          <div className="shrink-0 flex flex-col items-center gap-1">
            <div className={`w-16 h-16 rounded-full border-2 flex flex-col items-center justify-center ${
              overallScore >= 75 ? "border-emerald-500/40 bg-emerald-500/5"
              : overallScore >= 50 ? "border-amber-500/40 bg-amber-500/5"
              : "border-red-500/40 bg-red-500/5"
            }`}>
              <span className={`text-xl font-bold leading-none tabular-nums ${scoreColor(overallScore)}`}>{overallScore}</span>
              <span className="text-[9px] text-zinc-600 mt-0.5">/100</span>
            </div>
            <span className={`text-[10px] font-semibold ${scoreColor(overallScore)}`}>{overallLabel(overallScore)}</span>
          </div>
        </div>

        {/* Sub-scores */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          <ScorePill label="SEO"         score={seoScore}        tooltip="Proportion of SEO checks passing" />
          <ScorePill label="Performance" score={perfScore}       tooltip="Lighthouse performance score (mobile)" />
          <ScorePill label="UX"          score={uxScore}         tooltip="UX signals: CTA, trust, mobile, forms, etc." />
          <ScorePill label="Conversion"  score={conversionScore} tooltip="Clarity, trust, CTA strength, friction" />
        </div>

        {/* Top issues + Quick wins */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Top Issues */}
          <div className="rounded-lg bg-red-950/20 border border-red-900/30 p-3.5">
            <div className="flex items-center gap-2 mb-2.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-400 shrink-0">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">Top Issues</span>
            </div>
            {topIssues.length === 0 ? (
              <p className="text-xs text-zinc-500">No critical issues found.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {topIssues.map((item) => (
                  <div key={item.id} className="flex items-start gap-2">
                    <ImpactDot impact={item.impact} />
                    <div>
                      <p className="text-xs font-medium text-zinc-200">{item.title}</p>
                      <p className="text-[11px] text-zinc-500 leading-snug">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Wins */}
          <div className="rounded-lg bg-emerald-950/20 border border-emerald-900/30 p-3.5">
            <div className="flex items-center gap-2 mb-2.5">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400 shrink-0">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Quick Wins</span>
            </div>
            {quickWins.length === 0 ? (
              <p className="text-xs text-zinc-500">No quick wins detected.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {quickWins.map((item) => (
                  <div key={item.id} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 bg-emerald-500" />
                    <div>
                      <p className="text-xs font-medium text-zinc-200">{item.title}</p>
                      <p className="text-[11px] text-zinc-500 leading-snug">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </CardShell>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/cards/ExecutiveSummaryCard.tsx
git commit -m "feat: add ExecutiveSummaryCard with overall score, sub-scores, top issues, quick wins"
```

---

## Task 5: Wire `ExecutiveSummaryCard` into Overview section

**Files:**
- Modify: `frontend/src/components/ResultDashboard/sections.tsx`

- [ ] **Step 1: Add import and wire into overview case**

In `frontend/src/components/ResultDashboard/sections.tsx`, add the import and a `useMemo`-computed insights value. Since `sections.tsx` is a pure render function (no hooks), compute insights inline via a local function call at render time.

Replace the top of the file and the `overview` case as shown:

```diff
 import type { AnalysisResult } from "../../types/analysis";
+import { computeInsights } from "../../utils/insights";
+import { ExecutiveSummaryCard } from "../cards/ExecutiveSummaryCard";
 import { OverviewCard }          from "../cards/OverviewCard";
// ... (keep all other existing imports)
```

In the `SectionView` function, update the `overview` case:

```diff
   case "overview":
+    const insights = computeInsights(result);
     return (
       <div className="flex flex-col gap-2">
+        <ExecutiveSummaryCard insights={insights} />
         <OverviewCard
           overview={result.overview}
           url={result.url}
           fetchedAt={result.fetchedAt}
           aiDetection={result.aiDetection}
         />
```

> Note: `computeInsights` is a pure function — calling it at render time is safe and avoids adding hooks to a switch-case body.

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/ResultDashboard/sections.tsx
git commit -m "feat: wire ExecutiveSummaryCard at top of overview section"
```

---

## Task 6: SEO card — "Why it matters / How to fix" per FAIL/WARN

**Files:**
- Modify: `frontend/src/components/cards/SeoAuditCard.tsx`

We add a `fixGuide` lookup keyed by `SEOCheck.id` and render the guidance below each FAIL/WARN row. We also add `ScoreInsight` at the bottom of the card.

- [ ] **Step 1: Define fix guides and update `CheckRow`**

Replace the entire file:

```tsx
// frontend/src/components/cards/SeoAuditCard.tsx
import { useState } from "react";
import type { SEOCheck } from "../../types/analysis";
import { CardShell } from "../ui/CardShell";
import { CardHeader } from "../ui/CardHeader";
import { ScoreInsight } from "../ui/ScoreInsight";

interface FixGuide { why: string; fix: string }

const FIX_GUIDES: Record<string, FixGuide> = {
  title:             { why: "Title tags are the #1 on-page SEO signal Google reads.", fix: "Add a unique, descriptive <title> under 60 characters to every page." },
  "meta-desc":       { why: "Meta descriptions improve click-through rate from search results.", fix: "Write a compelling meta description between 120–160 characters." },
  h1:                { why: "A single H1 signals the page's main topic to search engines.", fix: "Add exactly one H1 tag that matches your primary keyword." },
  canonical:         { why: "Canonical tags prevent duplicate content penalties.", fix: "Add <link rel=\"canonical\"> pointing to the authoritative URL." },
  "og-tags":         { why: "Open Graph tags control how your page appears when shared on social media.", fix: "Add og:title, og:description, and og:image meta tags." },
  sitemap:           { why: "A sitemap helps search engines discover and index all your pages.", fix: "Submit an XML sitemap at /sitemap.xml to Google Search Console." },
  robots:            { why: "A robots.txt file controls what search engines can crawl.", fix: "Add a robots.txt file at the root of your domain." },
  "structured-data": { why: "Structured data enables rich results (ratings, FAQs) in Google.", fix: "Add JSON-LD schema markup relevant to your content type." },
  "alt-text":        { why: "Missing alt text means Google can't understand your images.", fix: "Add descriptive alt attributes to all meaningful images." },
  https:             { why: "HTTPS is a Google ranking signal and required for user trust.", fix: "Redirect all HTTP traffic to HTTPS and install a valid SSL certificate." },
  "lang-attr":       { why: "The lang attribute helps search engines serve the right language version.", fix: "Add lang=\"en\" (or appropriate code) to your <html> tag." },
  "broken-links":    { why: "Broken links signal poor site quality to Google and frustrate users.", fix: "Audit links regularly and fix or remove 404s." },
  viewport:          { why: "A viewport meta tag is required for proper mobile rendering.", fix: "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">." },
};

function getFixGuide(checkId: string): FixGuide | null {
  // Exact match first, then partial match on any segment
  if (FIX_GUIDES[checkId]) return FIX_GUIDES[checkId];
  const key = Object.keys(FIX_GUIDES).find((k) => checkId.includes(k));
  return key ? FIX_GUIDES[key] : null;
}

function statusStyle(s: string) {
  if (s === "pass")    return { dot: "bg-emerald-500", label: "text-emerald-400", text: "Pass" };
  if (s === "warning") return { dot: "bg-amber-500",   label: "text-amber-400",   text: "Warn" };
  return                      { dot: "bg-red-500",     label: "text-red-400",     text: "Fail" };
}

function CheckRow({ check }: { check: SEOCheck }) {
  const [open, setOpen] = useState(false);
  const s = statusStyle(check.status);
  const hasDetails = check.details && check.details.length > 0;
  const guide = check.status !== "pass" ? getFixGuide(check.id) : null;
  const isExpandable = hasDetails || !!guide;

  return (
    <div className="border-b border-zinc-800/60 last:border-0">
      <div
        className={`flex items-start gap-2.5 py-2.5 ${isExpandable ? "cursor-pointer select-none" : ""}`}
        onClick={() => isExpandable && setOpen((o) => !o)}
      >
        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${s.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-200">{check.label}</span>
            <span className={`text-[10px] font-semibold ${s.label}`}>{s.text}</span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{check.detail}</p>
        </div>
        {isExpandable && (
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            className={`shrink-0 mt-1 text-zinc-600 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        )}
      </div>

      {isExpandable && open && (
        <div className="mb-2.5 ml-4 pl-2.5 border-l border-zinc-800 flex flex-col gap-2">
          {hasDetails && check.details!.map((item, i) => (
            <span key={i} className="text-[11px] text-zinc-500 leading-relaxed break-all">{item}</span>
          ))}
          {guide && (
            <div className="flex flex-col gap-1.5 py-1">
              <div className="flex gap-2 items-start">
                <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wide shrink-0">Why it matters</span>
                <span className="text-[11px] text-zinc-400 leading-snug">{guide.why}</span>
              </div>
              <div className="flex gap-2 items-start">
                <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wide shrink-0">How to fix</span>
                <span className="text-[11px] text-zinc-400 leading-snug">{guide.fix}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function seoInsightText(score: number): { meaning: string; nextStep: string } {
  if (score >= 80) return {
    meaning: "Your SEO fundamentals are strong — most key signals are properly set up.",
    nextStep: "Focus on content quality and building backlinks to keep improving rankings.",
  };
  if (score >= 50) return {
    meaning: "Your SEO is decent but missing several optimizations that affect visibility.",
    nextStep: "Fix the failing checks above — meta tags and headings have the biggest impact.",
  };
  return {
    meaning: "Critical SEO issues are likely preventing your site from ranking well.",
    nextStep: "Start with title tags and meta descriptions — they take minutes to fix and matter most.",
  };
}

export function SEOAuditCard({ seoChecks }: { seoChecks: SEOCheck[] }) {
  const pass    = seoChecks.filter((c) => c.status === "pass").length;
  const warning = seoChecks.filter((c) => c.status === "warning").length;
  const fail    = seoChecks.filter((c) => c.status === "fail").length;
  const score   = seoChecks.length ? Math.round((pass / seoChecks.length) * 100) : 0;
  const insight = seoInsightText(score);

  return (
    <CardShell>
      <CardHeader
        title="SEO Audit"
        badge={`${pass}/${seoChecks.length}`}
        badgeColor={pass / seoChecks.length >= 0.8 ? "green" : pass / seoChecks.length >= 0.5 ? "amber" : "red"}
      />
      <div className="p-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-zinc-600"><span className="text-emerald-400 font-semibold">{pass}</span> pass</span>
            <span className="text-zinc-600"><span className="text-amber-400 font-semibold">{warning}</span> warn</span>
            <span className="text-zinc-600"><span className="text-red-400 font-semibold">{fail}</span> fail</span>
            <span className="font-semibold text-zinc-200">{score}<span className="text-zinc-600 font-normal">/100</span></span>
          </div>
        </div>

        <p className="text-[11px] text-zinc-600 mb-3 leading-snug">
          Our 13-point check covering OG tags, structured data, sitemap and more — click any fail/warn row for guidance.
        </p>

        <div className="h-0.5 w-full bg-zinc-800 rounded-full mb-4 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-red-500"
            }`}
            style={{ width: `${score}%` }}
          />
        </div>

        <div>{seoChecks.map((c) => <CheckRow key={c.id} check={c} />)}</div>

        <ScoreInsight meaning={insight.meaning} nextStep={insight.nextStep} />
      </div>
    </CardShell>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/cards/SeoAuditCard.tsx
git commit -m "feat: add why-it-matters/how-to-fix guidance and ScoreInsight to SEO card"
```

---

## Task 7: Performance card — label, bottleneck, suggestions, `ScoreInsight`

**Files:**
- Modify: `frontend/src/components/cards/PerformanceCard.tsx`

- [ ] **Step 1: Add perf label, bottleneck detection, suggestions panel, ScoreInsight**

Add these helpers and the `SuggestionsPanel` component, then wire them into `PerformanceCard`. Keep all existing code — only add the new sections.

Add the following imports at the top of `PerformanceCard.tsx`:
```tsx
import { ScoreInsight } from "../ui/ScoreInsight";
```

Add these helpers after the existing `TabButton` component:

```tsx
function perfLabel(score: number): { text: string; cls: string } {
  if (score >= 90) return { text: "Fast",     cls: "text-emerald-400 bg-emerald-950 border-emerald-800" };
  if (score >= 50) return { text: "Moderate", cls: "text-amber-400   bg-amber-950  border-amber-800"   };
  return                  { text: "Slow",     cls: "text-red-400     bg-red-950    border-red-800"     };
}

function detectBottleneck(data: StrategyData): string | null {
  const { lcp, tbt, cls, fcp } = data;
  if (lcp?.rating === "poor") return "Largest Contentful Paint (LCP) is the biggest bottleneck — the main content takes too long to render.";
  if (tbt?.rating === "poor") return "Total Blocking Time (TBT) is high — JavaScript is blocking the main thread and delaying interactivity.";
  if (cls?.rating === "poor") return "Cumulative Layout Shift (CLS) is the primary issue — elements are moving around as the page loads.";
  if (fcp?.rating === "poor") return "First Contentful Paint (FCP) is slow — the browser is taking too long to render anything on screen.";
  if (lcp?.rating === "needs-improvement") return "LCP needs improvement — optimize your hero image or largest visible element.";
  if (tbt?.rating === "needs-improvement") return "TBT needs improvement — review render-blocking scripts and defer non-critical JS.";
  return null;
}

function buildSuggestions(data: StrategyData): string[] {
  const suggestions: string[] = [];
  const score = data.lighthouse?.performance ?? 100;

  if (score < 90) suggestions.push("Compress and convert images to WebP or AVIF format");
  if (data.tbt?.rating !== "good") suggestions.push("Defer or remove unused JavaScript to reduce blocking time");
  if (data.lcp?.rating !== "good") suggestions.push("Preload your largest above-the-fold image or hero element");
  if (data.cls?.rating !== "good") suggestions.push("Set explicit width/height on images to prevent layout shifts");
  if (score < 75) suggestions.push("Enable browser caching and use a CDN to serve assets faster");
  if (score < 60) suggestions.push("Minify CSS, JavaScript, and HTML to reduce file sizes");

  return suggestions.slice(0, 4);
}

function perfInsightText(score: number): { meaning: string; nextStep: string } {
  if (score >= 90) return {
    meaning: "Your page loads fast — users get a smooth, responsive experience.",
    nextStep: "Maintain these scores by running Lighthouse in CI and monitoring Core Web Vitals.",
  };
  if (score >= 50) return {
    meaning: "Moderate performance — some users, especially on mobile, may experience slow loads.",
    nextStep: "Address the bottleneck identified above; image optimization is usually the fastest win.",
  };
  return {
    meaning: "Slow performance is costing you users — Google penalizes slow pages in rankings too.",
    nextStep: "Start with image compression and deferring render-blocking JS — together they often double scores.",
  };
}
```

In `PerformanceCard`, after the closing `</CardShell>` is returned, update the return JSX to add the new sections after `<StrategyView data={data} />`:

The full updated `PerformanceCard` return block (replace only the inner content after `<StrategyView data={data} />`):

```tsx
export function PerformanceCard({ performance }: { performance: PerformanceResult }) {
  const initial: Strategy = performance.mobile ? "mobile" : "desktop";
  const [strategy, setStrategy] = useState<Strategy>(initial);

  const data = strategy === "mobile" ? performance.mobile : performance.desktop;
  if (!data) return null;

  const mobileLhScore = performance.mobile?.lighthouse?.performance;
  const badge = mobileLhScore !== undefined ? `${mobileLhScore}/100` : undefined;
  const badgeColor = mobileLhScore !== undefined
    ? (mobileLhScore >= 90 ? "green" : mobileLhScore >= 50 ? "amber" : "red") as "green" | "amber" | "red"
    : "violet" as const;

  const lhScore    = data.lighthouse?.performance ?? 0;
  const label      = perfLabel(lhScore);
  const bottleneck = detectBottleneck(data);
  const suggestions = buildSuggestions(data);
  const insight    = perfInsightText(lhScore);

  return (
    <CardShell>
      <CardHeader title="Core Web Vitals" badge={badge} badgeColor={badgeColor} />
      <div className="p-4">
        {/* Tab + performance label row */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${label.cls}`}>
            {label.text}
          </span>
          <div className="flex items-center gap-1">
            {performance.mobile && (
              <TabButton active={strategy === "mobile"} onClick={() => setStrategy("mobile")}>Mobile</TabButton>
            )}
            {performance.desktop && (
              <TabButton active={strategy === "desktop"} onClick={() => setStrategy("desktop")}>Desktop</TabButton>
            )}
          </div>
        </div>

        <p className="text-[11px] text-zinc-600 mb-4 leading-snug">
          Google's official Lighthouse scores — the SEO score here reflects technical SEO basics Google itself checks.
        </p>

        <StrategyView data={data} />

        {/* Bottleneck */}
        {bottleneck && (
          <div className="mt-4 flex gap-2.5 p-3 rounded-lg bg-amber-950/20 border border-amber-900/30">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400 shrink-0 mt-0.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <div>
              <p className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider mb-0.5">Biggest Bottleneck</p>
              <p className="text-xs text-zinc-400 leading-snug">{bottleneck}</p>
            </div>
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="mt-3">
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">Suggestions</p>
            <div className="flex flex-col gap-1.5">
              {suggestions.map((s, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0 mt-1.5" />
                  <span className="text-xs text-zinc-400">{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-[10px] text-zinc-700 mt-3">
          {strategy === "mobile" ? "Mobile" : "Desktop"} · via Google PageSpeed Insights
        </p>

        <ScoreInsight meaning={insight.meaning} nextStep={insight.nextStep} />
      </div>
    </CardShell>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/cards/PerformanceCard.tsx
git commit -m "feat: add perf label, bottleneck detection, suggestions, and ScoreInsight to PerformanceCard"
```

---

## Task 8: UX — verdict and `ScoreInsight` in CustomerViewCard

**Files:**
- Modify: `frontend/src/components/cards/CustomerViewCard.tsx`

- [ ] **Step 1: Read the current file, then add UX verdict and ScoreInsight**

```bash
cat frontend/src/components/cards/CustomerViewCard.tsx
```

Add the following to `CustomerViewCard.tsx` after reading the current contents. The changes are:
1. Import `ScoreInsight`
2. Add `uxVerdictText` helper
3. Render verdict badge + `ScoreInsight` at the bottom of the card body

Add import at top:
```tsx
import { ScoreInsight } from "../ui/ScoreInsight";
```

Add helper after imports:
```tsx
function uxVerdictText(trustLevel: "strong" | "moderate" | "weak", offerClear: boolean, ctaClear: boolean) {
  const signals = [trustLevel === "strong", offerClear, ctaClear].filter(Boolean).length;
  if (signals === 3) return { label: "Strong",   cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
    meaning: "Strong first impression — visitors quickly understand the offer and trust the brand.",
    nextStep: "Keep refining copy freshness and social proof to maintain this standard." };
  if (signals >= 2) return { label: "Moderate", cls: "text-amber-400 bg-amber-500/10 border-amber-500/25",
    meaning: "Decent UX but some trust or clarity gaps may cause visitors to hesitate.",
    nextStep: "Improve the weakest signal — unclear offers and missing trust badges are top priorities." };
  return { label: "Weak", cls: "text-red-400 bg-red-500/10 border-red-500/25",
    meaning: "Visitors are unlikely to convert — the offer is unclear or the site feels untrustworthy.",
    nextStep: "Start with a single clear value proposition and add at least one social proof element." };
}
```

In the render, add the verdict badge after the existing `trustLevel` display and `ScoreInsight` at the very bottom of the `p-4` div. Locate the closing `</div>` of the card body and insert before it:

```tsx
const verdict = uxVerdictText(customerView.trustLevel, customerView.offerClear, customerView.ctaClear);
```

Then render badge:
```tsx
<div className="mt-4 flex items-center gap-2">
  <span className="text-[10px] text-zinc-500 font-medium">UX Verdict</span>
  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${verdict.cls}`}>
    {verdict.label}
  </span>
</div>
<ScoreInsight meaning={verdict.meaning} nextStep={verdict.nextStep} />
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/cards/CustomerViewCard.tsx
git commit -m "feat: add UX verdict and ScoreInsight to CustomerViewCard"
```

---

## Task 9: VagueLanguageCard — add replacement suggestions

**Files:**
- Modify: `frontend/src/components/cards/VagueLanguageCard.tsx`

- [ ] **Step 1: Read current file**

```bash
cat frontend/src/components/cards/VagueLanguageCard.tsx
```

- [ ] **Step 2: Add replacement suggestions per vague phrase**

The `VaguePhrase` type already has `phrase` and `reason`. We surface the `specificityHints` as suggested replacements and show them inline below each phrase.

Add these changes to `VagueLanguageCard.tsx`:

After the existing phrase list render, update the phrase row to also show `specificityHints` if available. Since `specificityHints` is on `CopyAnalysis` (not per-phrase), show them as a separate "Suggested alternatives" section:

```tsx
{copyAnalysis.specificityHints.length > 0 && (
  <div className="mt-4 pt-4 border-t border-zinc-800">
    <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
      Suggested Alternatives
    </p>
    <div className="flex flex-col gap-1.5">
      {copyAnalysis.specificityHints.map((hint, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
          <span className="text-xs text-zinc-400">{hint}</span>
        </div>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 3: Verify TypeScript and commit**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -10
git add frontend/src/components/cards/VagueLanguageCard.tsx
git commit -m "feat: surface specificityHints as suggested alternatives in VagueLanguageCard"
```

---

## Task 10: ConversionScoreCard — blockers list, "What to improve first", ScoreInsight

**Files:**
- Modify: `frontend/src/components/cards/ConversionScoreCard.tsx`

- [ ] **Step 1: Add import and helpers**

Replace the entire file:

```tsx
// frontend/src/components/cards/ConversionScoreCard.tsx
import type { ConversionScores, UXResult } from "../../types/analysis";
import { CardShell } from "../ui/CardShell";
import { CardHeader } from "../ui/CardHeader";
import { ScoreInsight } from "../ui/ScoreInsight";

function scoreColor(n: number) {
  if (n >= 70) return { bar: "bg-emerald-500", text: "text-emerald-400" };
  if (n >= 45) return { bar: "bg-amber-500",   text: "text-amber-400"   };
  return             { bar: "bg-red-500",       text: "text-red-400"     };
}

function ScoreRow({ label, score, note }: { label: string; score: number; note: string }) {
  const c = scoreColor(score);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-300">{label}</span>
        <span className={`text-xs font-semibold ${c.text}`}>{score}<span className="text-zinc-600 font-normal">/100</span></span>
      </div>
      <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${c.bar}`} style={{ width: `${score}%` }} />
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

function buildBlockers(scores: ConversionScores): string[] {
  const blockers: string[] = [];
  if (scores.ctaStrength < 50)  blockers.push("Weak or absent call-to-action — visitors don't know what to do next.");
  if (scores.trust < 50)        blockers.push("Low trust signals — no reviews, badges, or social proof detected.");
  if (scores.clarity < 50)      blockers.push("Unclear offer — the value proposition is not immediately obvious.");
  if (scores.friction > 60)     blockers.push("High friction — too many steps, forms, or distractions reduce completions.");
  if (scores.friction < 40)     blockers.push("Ease of action is low — the conversion path has unnecessary obstacles.");
  return blockers;
}

function whatToImproveFirst(scores: ConversionScores): string {
  const worst = [
    { label: "CTA strength", score: scores.ctaStrength },
    { label: "trust",        score: scores.trust        },
    { label: "clarity",      score: scores.clarity      },
  ].sort((a, b) => a.score - b.score)[0];
  return `Focus on improving ${worst.label} first — at ${worst.score}/100 it's your biggest drag on conversions.`;
}

function conversionInsightText(score: number): { meaning: string; nextStep: string } {
  if (score >= 70) return {
    meaning: "Strong conversion readiness — your offer is clear, trustworthy, and easy to act on.",
    nextStep: "A/B test your CTA copy and button placement to push conversion rates even higher.",
  };
  if (score >= 45) return {
    meaning: "Moderate conversion potential — some friction or trust gaps are leaving revenue on the table.",
    nextStep: "Address the blockers listed above; even one fix can meaningfully lift conversion rate.",
  };
  return {
    meaning: "Low conversion readiness — significant barriers are preventing visitors from taking action.",
    nextStep: "Start with a single, specific CTA and one trust signal. Don't optimize other areas first.",
  };
}

export function ConversionScoreCard({ scores }: { scores: ConversionScores }) {
  const overall  = scoreColor(scores.overall);
  const blockers = buildBlockers(scores);
  const priority = whatToImproveFirst(scores);
  const insight  = conversionInsightText(scores.overall);

  return (
    <CardShell>
      <CardHeader
        title="Conversion Score"
        badge={`${scores.overall}/100`}
        badgeColor={scores.overall >= 70 ? "green" : scores.overall >= 45 ? "amber" : "red"}
      />
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-baseline gap-1">
            <span className={`text-xs font-medium ${overall.text}`}>{overallLabel(scores.overall)}</span>
            <span className={`text-sm font-bold ${overall.text}`}>{scores.overall}</span>
            <span className="text-xs text-zinc-600">/100</span>
          </div>
        </div>

        <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden mb-5">
          <div className={`h-full rounded-full transition-all duration-700 ${overall.bar}`} style={{ width: `${scores.overall}%` }} />
        </div>

        <div className="flex flex-col gap-3.5 mb-5">
          <ScoreRow label="Clarity"      score={scores.clarity}     note={scores.clarityNote}  />
          <ScoreRow label="Trust"        score={scores.trust}       note={scores.trustNote}    />
          <ScoreRow label="CTA Strength" score={scores.ctaStrength} note={scores.ctaNote}      />
          <ScoreRow label="Ease"         score={scores.friction}    note={scores.frictionNote} />
        </div>

        {/* Conversion blockers */}
        {blockers.length > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/20 border border-red-900/30">
            <p className="text-[10px] font-semibold text-red-400 uppercase tracking-wider mb-2">Conversion Blockers</p>
            <div className="flex flex-col gap-1.5">
              {blockers.map((b, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 mt-1.5" />
                  <span className="text-xs text-zinc-400">{b}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* What to improve first */}
        <div className="mb-1 p-3 rounded-lg bg-violet-950/20 border border-violet-900/30">
          <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-wider mb-1">What to Improve First</p>
          <p className="text-xs text-zinc-400">{priority}</p>
        </div>

        <ScoreInsight meaning={insight.meaning} nextStep={insight.nextStep} />
      </div>
    </CardShell>
  );
}
```

> Note: `UXResult` import was removed from the signature since this component only receives `ConversionScores`. Remove unused import if present.

- [ ] **Step 2: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/cards/ConversionScoreCard.tsx
git commit -m "feat: add conversion blockers, what-to-improve-first, and ScoreInsight to ConversionScoreCard"
```

---

## Task 11: Admin Dashboard enhancements

**Files:**
- Modify: `frontend/src/components/admin/AdminDashboard.tsx`

The `AdminOverview` type already provides `users` and `anonymousVisitors`. We derive analytics from it client-side (no new backend endpoint needed for Phase 1).

- [ ] **Step 1: Add search/filter state, analytics derivations, reset-usage button, and env panel**

Replace the entire `AdminDashboard.tsx` file with the enhanced version below. All existing functionality (users table, visitors table, plan toggle, usage save) is preserved.

```tsx
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { LogoWordmark } from "../ui/Logo";
import { AuthModal } from "../auth/AuthModal";
import { UserMenu } from "../auth/UserMenu";
import { useAuth } from "../../context/AuthContext";
import {
  fetchAdminOverview,
  updateAdminAnonUsage,
  updateAdminUserPlan,
  updateAdminUserUsage,
  type AdminOverview,
} from "../../services/authApi";

// ─── helpers ────────────────────────────────────────────────────────────────

function scoreColor(n: number) {
  return n >= 70 ? "text-emerald-400" : n >= 40 ? "text-amber-400" : "text-red-400";
}

// ─── sub-components ─────────────────────────────────────────────────────────

function AnalyticCard({ title, value, sub, color = "text-zinc-100" }: {
  title: string; value: string; sub: string; color?: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-[0.18em]">{title}</p>
      <p className={`mt-3 text-3xl font-bold tabular-nums ${color}`}>{value}</p>
      <p className="mt-1 text-xs text-zinc-500">{sub}</p>
    </div>
  );
}

// ─── main component ──────────────────────────────────────────────────────────

export function AdminDashboard() {
  const { user, loading } = useAuth();
  const [authOpen, setAuthOpen]     = useState(false);
  const [overview, setOverview]     = useState<AdminOverview | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [busyKey, setBusyKey]       = useState<string | null>(null);
  const [search, setSearch]         = useState("");
  const [planFilter, setPlanFilter] = useState<"all" | "free" | "pro">("all");

  async function loadOverview() {
    try {
      setError(null);
      const data = await fetchAdminOverview();
      setOverview(data);
    } catch (err) {
      setOverview(null);
      setError(err instanceof Error ? err.message : "Could not load dashboard");
    }
  }

  useEffect(() => {
    if (user) void loadOverview();
  }, [user?.id]);

  // ── derived analytics ──────────────────────────────────────────────────────
  const analytics = useMemo(() => {
    if (!overview) return null;
    const totalUsers    = overview.users.length;
    const proUsers      = overview.users.filter((u) => u.plan === "pro").length;
    const freeUsers     = totalUsers - proUsers;
    const totalAnalyses = overview.users.reduce((s, u) => s + u.dailyUsed, 0)
                        + overview.anonymousVisitors.reduce((s, v) => s + v.dailyUsed, 0);
    const guestAnalyses = overview.anonymousVisitors.reduce((s, v) => s + v.dailyUsed, 0);
    const proRatio      = totalUsers > 0 ? Math.round((proUsers / totalUsers) * 100) : 0;
    return { totalUsers, proUsers, freeUsers, totalAnalyses, guestAnalyses, proRatio };
  }, [overview]);

  // ── filtered users ─────────────────────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    if (!overview) return [];
    return overview.users.filter((u) => {
      const matchSearch = !search || u.email.toLowerCase().includes(search.toLowerCase());
      const matchPlan   = planFilter === "all" || u.plan === planFilter;
      return matchSearch && matchPlan;
    });
  }, [overview, search, planFilter]);

  // ── actions ────────────────────────────────────────────────────────────────
  async function saveUserUsage(userId: number, count: number) {
    setBusyKey(`user-usage-${userId}`);
    try { await updateAdminUserUsage(userId, count); await loadOverview(); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not update usage"); }
    finally { setBusyKey(null); }
  }

  async function saveAnonUsage(visitorId: string, count: number) {
    setBusyKey(`anon-usage-${visitorId}`);
    try { await updateAdminAnonUsage(visitorId, count); await loadOverview(); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not update visitor usage"); }
    finally { setBusyKey(null); }
  }

  async function saveUserPlan(userId: number, plan: "free" | "pro") {
    setBusyKey(`user-plan-${userId}`);
    try { await updateAdminUserPlan(userId, plan, plan === "pro" ? "active" : "inactive"); await loadOverview(); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not update plan"); }
    finally { setBusyKey(null); }
  }

  async function resetUserUsage(userId: number) {
    setBusyKey(`user-usage-${userId}`);
    try { await updateAdminUserUsage(userId, 0); await loadOverview(); }
    catch (err) { setError(err instanceof Error ? err.message : "Could not reset usage"); }
    finally { setBusyKey(null); }
  }

  // ── render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return <Shell title="Dashboard"><p className="text-sm text-zinc-500">Loading account…</p></Shell>;
  }

  if (!user) {
    return (
      <Shell title="Dashboard">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 max-w-md">
          <h2 className="text-xl font-semibold text-zinc-100">Sign in to open the dashboard</h2>
          <p className="mt-2 text-sm text-zinc-400">This page is for managing daily usage, guest limits, and user plans.</p>
          <button
            onClick={() => setAuthOpen(true)}
            className="mt-5 inline-flex items-center justify-center px-4 py-2 rounded-md text-sm font-semibold text-white bg-violet-500 hover:bg-violet-400 transition-colors"
          >
            Sign in
          </button>
        </div>
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </Shell>
    );
  }

  return (
    <Shell title="Dashboard" userMenu={<UserMenu />}>
      <div className="space-y-6">

        {/* ── Analytics cards ── */}
        {analytics && (
          <section className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            <AnalyticCard title="Total Users"    value={String(analytics.totalUsers)}    sub="registered accounts" />
            <AnalyticCard title="Pro Users"      value={String(analytics.proUsers)}      sub={`${analytics.proRatio}% conversion rate`}
              color={scoreColor(analytics.proRatio)} />
            <AnalyticCard title="Free Users"     value={String(analytics.freeUsers)}     sub="on free plan" />
            <AnalyticCard title="Analyses Today" value={String(analytics.totalAnalyses)} sub={`${analytics.guestAnalyses} from guests`} />
          </section>
        )}

        {error && (
          <div className="rounded-lg border border-red-800/40 bg-red-950/50 px-4 py-3 text-sm text-red-300">{error}</div>
        )}

        {overview && (
          <>
            {/* ── Environment / admin status ── */}
            <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-800/80 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-violet-400 uppercase tracking-[0.2em]">Environment</p>
                  <h2 className="mt-1 text-xl font-semibold text-zinc-100">Daily controls for {overview.currentDate}</h2>
                </div>
                <button
                  onClick={() => void loadOverview()}
                  className="inline-flex items-center justify-center px-3 py-2 rounded-md text-xs font-semibold text-zinc-300 bg-zinc-800/70 hover:bg-zinc-800 border border-zinc-700 transition-colors"
                >
                  Refresh
                </button>
              </div>
              <div className="px-5 py-4 flex flex-wrap gap-3">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium ${
                  overview.anySignedInIsAdmin
                    ? "border-amber-800/50 bg-amber-950/30 text-amber-400"
                    : "border-emerald-800/50 bg-emerald-950/30 text-emerald-400"
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${overview.anySignedInIsAdmin ? "bg-amber-500" : "bg-emerald-500"}`} />
                  {overview.anySignedInIsAdmin
                    ? "Admin lock: OFF — any signed-in user has access"
                    : `Admin lock: ON — restricted to ${overview.adminEmail}`}
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-xs font-medium text-zinc-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Backend: Connected
                </div>
              </div>
            </section>

            {/* ── Users table ── */}
            <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-800/80">
                <h2 className="text-lg font-semibold text-zinc-100">Users</h2>
                <p className="text-sm text-zinc-500 mt-1">Adjust today's count or switch someone between Free and Pro.</p>

                {/* Search + filter */}
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-950 border border-zinc-800 focus-within:border-violet-500/50 transition-colors flex-1 min-w-[180px] max-w-xs">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-600 shrink-0">
                      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                    </svg>
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by email…"
                      className="bg-transparent text-xs text-zinc-200 placeholder:text-zinc-600 outline-none flex-1"
                    />
                    {search && (
                      <button onClick={() => setSearch("")} className="text-zinc-600 hover:text-zinc-400 text-xs">✕</button>
                    )}
                  </div>

                  {(["all", "free", "pro"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPlanFilter(p)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
                        planFilter === p
                          ? "text-violet-300 bg-violet-500/10 border-violet-500/30"
                          : "text-zinc-500 hover:text-zinc-300 border-zinc-800 bg-zinc-900"
                      }`}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-zinc-500 border-b border-zinc-800/80">
                      <th className="px-5 py-3 font-semibold">Email</th>
                      <th className="px-5 py-3 font-semibold">Plan</th>
                      <th className="px-5 py-3 font-semibold">Used</th>
                      <th className="px-5 py-3 font-semibold">Remaining</th>
                      <th className="px-5 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-6 text-sm text-zinc-500 text-center">
                          No users match the current filter.
                        </td>
                      </tr>
                    ) : filteredUsers.map((row) => (
                      <UserRow
                        key={row.id}
                        row={row}
                        busyKey={busyKey}
                        onSaveUsage={saveUserUsage}
                        onSavePlan={saveUserPlan}
                        onResetUsage={resetUserUsage}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* ── Anonymous visitors ── */}
            <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-800/80">
                <h2 className="text-lg font-semibold text-zinc-100">Anonymous visitors</h2>
                <p className="text-sm text-zinc-500 mt-1">These are the visitor IDs currently using the guest daily allowance.</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-zinc-500 border-b border-zinc-800/80">
                      <th className="px-5 py-3 font-semibold">Visitor ID</th>
                      <th className="px-5 py-3 font-semibold">Used</th>
                      <th className="px-5 py-3 font-semibold">Remaining</th>
                      <th className="px-5 py-3 font-semibold">Updated</th>
                      <th className="px-5 py-3 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.anonymousVisitors.map((row) => (
                      <VisitorRow
                        key={row.visitorId}
                        row={row}
                        busyKey={busyKey}
                        onSaveUsage={saveAnonUsage}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </Shell>
  );
}

// ─── Shell ────────────────────────────────────────────────────────────────────

function Shell({ title, userMenu, children }: { title: string; userMenu?: ReactNode; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950">
      <header className="sticky top-0 z-20 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-sm">
        <div className="px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <LogoWordmark size={20} />
            <span className="hidden sm:block text-zinc-700">/</span>
            <span className="text-sm font-semibold text-zinc-300 truncate">{title}</span>
          </div>
          <div className="shrink-0">{userMenu}</div>
        </div>
      </header>
      <main className="px-4 sm:px-6 py-8">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}

// ─── UserRow ──────────────────────────────────────────────────────────────────

function UserRow({
  row, busyKey, onSaveUsage, onSavePlan, onResetUsage,
}: {
  row: AdminOverview["users"][number];
  busyKey: string | null;
  onSaveUsage: (userId: number, count: number) => Promise<void>;
  onSavePlan: (userId: number, plan: "free" | "pro") => Promise<void>;
  onResetUsage: (userId: number) => Promise<void>;
}) {
  const [count, setCount] = useState(String(row.dailyUsed));
  const isBusy = busyKey === `user-usage-${row.id}` || busyKey === `user-plan-${row.id}`;

  useEffect(() => { setCount(String(row.dailyUsed)); }, [row.dailyUsed]);

  return (
    <tr className="border-b border-zinc-800/60 last:border-b-0 align-top">
      <td className="px-5 py-4">
        <p className="text-sm font-medium text-zinc-100">{row.email}</p>
        <p className="text-xs text-zinc-500 mt-1">Joined {new Date(row.createdAt).toLocaleDateString()}</p>
      </td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
            row.plan === "pro"
              ? "text-emerald-300 bg-emerald-500/10 border-emerald-500/25"
              : "text-zinc-300 bg-zinc-800 border-zinc-700"
          }`}>
            {row.plan === "pro" ? "Pro" : "Free"}
          </span>
          <span className="text-xs text-zinc-500">{row.subscriptionStatus}</span>
        </div>
      </td>
      <td className="px-5 py-4 text-sm text-zinc-200 tabular-nums">{row.dailyUsed}/{row.dailyLimit}</td>
      <td className="px-5 py-4 text-sm text-zinc-400 tabular-nums">{row.dailyRemaining}</td>
      <td className="px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            min={0}
            value={count}
            onChange={(e) => setCount(e.target.value)}
            className="w-20 px-2.5 py-2 rounded-md bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 outline-none focus:border-violet-500/50"
          />
          <button
            onClick={() => void onSaveUsage(row.id, Math.max(0, Number(count) || 0))}
            disabled={isBusy}
            className="px-3 py-2 rounded-md text-xs font-semibold text-zinc-300 bg-zinc-800/70 hover:bg-zinc-800 border border-zinc-700 disabled:opacity-60 transition-colors"
          >
            Save
          </button>
          <button
            onClick={() => void onResetUsage(row.id)}
            disabled={isBusy}
            className="px-3 py-2 rounded-md text-xs font-semibold text-zinc-400 hover:text-red-400 bg-zinc-800/70 hover:bg-red-950/30 border border-zinc-700 hover:border-red-900/50 disabled:opacity-60 transition-colors"
          >
            Reset
          </button>
          <button
            onClick={() => void onSavePlan(row.id, row.plan === "pro" ? "free" : "pro")}
            disabled={isBusy}
            className="px-3 py-2 rounded-md text-xs font-semibold text-white bg-violet-500 hover:bg-violet-400 disabled:opacity-60 transition-colors"
          >
            Make {row.plan === "pro" ? "Free" : "Pro"}
          </button>
        </div>
      </td>
    </tr>
  );
}

// ─── VisitorRow ───────────────────────────────────────────────────────────────

function VisitorRow({
  row, busyKey, onSaveUsage,
}: {
  row: AdminOverview["anonymousVisitors"][number];
  busyKey: string | null;
  onSaveUsage: (visitorId: string, count: number) => Promise<void>;
}) {
  const [count, setCount] = useState(String(row.dailyUsed));
  const isBusy = busyKey === `anon-usage-${row.visitorId}`;

  useEffect(() => { setCount(String(row.dailyUsed)); }, [row.dailyUsed]);

  return (
    <tr className="border-b border-zinc-800/60 last:border-b-0 align-top">
      <td className="px-5 py-4">
        <p className="text-sm font-medium text-zinc-100 font-mono break-all">{row.visitorId}</p>
      </td>
      <td className="px-5 py-4 text-sm text-zinc-200 tabular-nums">{row.dailyUsed}/{row.dailyLimit}</td>
      <td className="px-5 py-4 text-sm text-zinc-400 tabular-nums">{row.dailyRemaining}</td>
      <td className="px-5 py-4 text-xs text-zinc-500">{new Date(row.updatedAt).toLocaleString()}</td>
      <td className="px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="number"
            min={0}
            value={count}
            onChange={(e) => setCount(e.target.value)}
            className="w-20 px-2.5 py-2 rounded-md bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 outline-none focus:border-violet-500/50"
          />
          <button
            onClick={() => void onSaveUsage(row.visitorId, Math.max(0, Number(count) || 0))}
            disabled={isBusy}
            className="px-3 py-2 rounded-md text-xs font-semibold text-zinc-300 bg-zinc-800/70 hover:bg-zinc-800 border border-zinc-700 disabled:opacity-60 transition-colors"
          >
            Save usage
          </button>
        </div>
      </td>
    </tr>
  );
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/admin/AdminDashboard.tsx
git commit -m "feat: enhance admin dashboard with analytics, search/filter, reset usage, env status"
```

---

## Task 12: Final TypeScript + test run

- [ ] **Step 1: Full TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1
```
Expected: exit 0, no errors.

- [ ] **Step 2: Run full test suite**

```bash
cd frontend && npx vitest run 2>&1 | tail -30
```
Expected: all tests pass.

- [ ] **Step 3: Build check**

```bash
cd frontend && npm run build 2>&1 | tail -20
```
Expected: successful build, no errors.

- [ ] **Step 4: Final commit if clean**

```bash
git add -A
git commit -m "chore: final build verification for report/dashboard upgrade"
```

---

## Self-Review

### Spec Coverage Check

| Spec Requirement | Task |
|---|---|
| Executive Summary with overall + 4 sub-scores | Task 4 + 5 |
| Top 3 Issues + Top 3 Quick Wins | Task 1 + 4 |
| Human-readable summary sentence | Task 1 |
| SEO: why it matters / how to fix per FAIL/WARN | Task 6 |
| Performance label Fast/Moderate/Slow | Task 7 |
| Performance: biggest bottleneck detection | Task 7 |
| Performance: suggestions (compress images, defer JS) | Task 7 |
| UX verdict (Strong/Moderate/Weak) | Task 8 |
| Vague phrases with replacement suggestions | Task 9 |
| Conversion blockers list | Task 10 |
| "What to improve first" (conversion) | Task 10 |
| "What this means" + "What to do next" on every score | Tasks 6, 7, 8, 10 (ScoreInsight) |
| Admin: analytics cards (today/total, Pro vs Free) | Task 11 |
| Admin: search users | Task 11 |
| Admin: filter Free/Pro | Task 11 |
| Admin: reset usage button | Task 11 |
| Admin: show admin lock status | Task 11 |
| Admin: show environment status | Task 11 |
| Color coding Green/Yellow/Red | All cards (existing + new) |
| Tooltip primitive | Task 3 |
| `computeInsights` backend logic (impact × severity) | Task 1 |

**Not in scope for this plan (deferred):**
- Section-level accordion collapse (existing cards already have per-row expand/collapse; full section accordion is a larger layout change that could introduce regressions — can be a follow-up)
- Tooltip wiring to every metric tile (tooltip primitive created in Task 3; applying to all ~20 metric tiles in `ResultDashboard.tsx` is a follow-up)
- New admin backend endpoints (e.g., recent analyses table requires a new `/api/admin/recent-analyses` endpoint — deferred to Phase 2)

### Placeholder Scan
No TBD, TODO, or placeholder text present in task code blocks.

### Type Consistency
- `InsightItem` defined in Task 1, used in Task 4 ✓
- `Insights` defined in Task 1, passed to `ExecutiveSummaryCard` in Tasks 4 + 5 ✓
- `ScoreInsight` defined in Task 2, imported in Tasks 6, 7, 8, 10 ✓
- `computeInsights` defined in Task 1, imported in Task 5 ✓
- `ConversionScores` import — `UXResult` import removed from `ConversionScoreCard` to keep it clean ✓
