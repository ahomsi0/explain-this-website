import type { AnalysisResult } from "../types/analysis";

export type ImpactLevel = "high" | "medium" | "low";
export type EffortLevel = "easy" | "medium" | "hard";
export type PriorityLabel = "fix-now" | "fix-soon" | "optional";
export type IssueCategory = "seo" | "performance" | "ux" | "conversion" | "security" | "content";

export interface PriorityIssue {
  id:           string;
  title:        string;
  whyItMatters: string;
  howToFix:     string;
  impact:       ImpactLevel;
  effort:       EffortLevel;
  priority:     PriorityLabel;
  category:     IssueCategory;
  urgencyScore: number;
}

function assignPriority(urgencyScore: number, effort: EffortLevel): PriorityLabel {
  if (urgencyScore >= 90)                       return "fix-now";
  if (urgencyScore >= 80 && effort !== "hard")  return "fix-now";
  if (urgencyScore >= 60)                       return "fix-soon";
  return "optional";
}

function makeIssue(
  id: string,
  title: string,
  whyItMatters: string,
  howToFix: string,
  impact: ImpactLevel,
  effort: EffortLevel,
  urgencyScore: number,
  category: IssueCategory,
): PriorityIssue {
  return {
    id,
    title,
    whyItMatters,
    howToFix,
    impact,
    effort,
    priority: assignPriority(urgencyScore, effort),
    category,
    urgencyScore,
  };
}

export function computePriorityIssues(result: AnalysisResult): PriorityIssue[] {
  const issues: PriorityIssue[] = [];

  // SEO: FAIL checks
  result.seoChecks.filter((c) => c.status === "fail").forEach((c) => {
    issues.push(makeIssue(
      `seo-fail-${c.id}`,
      `Fix SEO: ${c.label}`,
      c.detail,
      "Review the specific check and apply the fix in your CMS or HTML head.",
      "high",
      "easy",
      84,
      "seo",
    ));
  });

  // SEO: WARNING checks
  result.seoChecks.filter((c) => c.status === "warning").forEach((c) => {
    issues.push(makeIssue(
      `seo-warn-${c.id}`,
      `Improve SEO: ${c.label}`,
      c.detail,
      "Address this warning in your page meta tags or content.",
      "medium",
      "easy",
      55,
      "seo",
    ));
  });

  // Broken links
  if (result.linkCheck.broken > 0) {
    const n = result.linkCheck.broken;
    issues.push(makeIssue(
      "broken-links",
      `Fix ${n} broken link${n > 1 ? "s" : ""}`,
      "Broken links hurt search rankings and damage user trust.",
      "Use the SEO tab to find broken URLs, then update or remove them.",
      "high",
      "easy",
      88,
      "seo",
    ));
  }

  // Intent alignment
  if (result.intentAlignment.score < 50) {
    issues.push(makeIssue(
      "low-intent",
      "Content doesn't match user intent",
      "Visitors who don't find what they expect leave immediately.",
      "Rewrite your main copy to directly answer why someone would search for your site.",
      "high",
      "medium",
      72,
      "seo",
    ));
  }

  // Performance: LCP poor
  const lcp = result.performance?.mobile?.lcp;
  if (lcp?.rating === "poor") {
    issues.push(makeIssue(
      "lcp-poor",
      "Critical: Page loads far too slowly",
      `LCP is ${lcp.displayValue} — Google demotes slow pages; users leave in under 3 seconds.`,
      "Compress your largest image, enable a CDN, and defer non-critical JavaScript.",
      "high",
      "hard",
      97,
      "performance",
    ));
  } else if (lcp?.rating === "needs-improvement") {
    issues.push(makeIssue(
      "lcp-fair",
      "Improve page load speed",
      `LCP is ${lcp.displayValue} — moderate load times reduce conversions by 10–20%.`,
      "Optimize your largest content image and remove render-blocking scripts.",
      "high",
      "medium",
      72,
      "performance",
    ));
  }

  // Performance: CLS poor
  const cls = result.performance?.mobile?.cls;
  if (cls?.rating === "poor") {
    issues.push(makeIssue(
      "cls-poor",
      "Page layout shifts while loading",
      `CLS is ${cls.displayValue} — content jumping frustrates users and lowers UX scores.`,
      "Set explicit width/height on all images and avoid inserting content above the fold after load.",
      "high",
      "medium",
      78,
      "performance",
    ));
  }

  // Performance: TBT poor
  const tbt = result.performance?.mobile?.tbt;
  if (tbt?.rating === "poor") {
    issues.push(makeIssue(
      "tbt-poor",
      "Page is unresponsive to clicks",
      `TBT is ${tbt.displayValue} — the page freezes after load, making users think it's broken.`,
      "Split large JavaScript bundles and defer third-party scripts to after user interaction.",
      "high",
      "hard",
      82,
      "performance",
    ));
  }

  // Performance: mobile lighthouse score
  const mobilePerfScore = result.performance?.mobile?.lighthouse?.performance;
  if (mobilePerfScore !== undefined) {
    if (mobilePerfScore < 50) {
      issues.push(makeIssue(
        "perf-poor",
        "Mobile performance is critically low",
        `Mobile performance score is ${mobilePerfScore}/100 — users are likely abandoning the page before it loads.`,
        "Audit and reduce JavaScript bundle size, compress images, and enable caching.",
        "high",
        "hard",
        95,
        "performance",
      ));
    } else if (mobilePerfScore < 75) {
      issues.push(makeIssue(
        "perf-fair",
        "Mobile performance needs improvement",
        `Mobile performance score is ${mobilePerfScore}/100 — moderate load times may hurt conversions.`,
        "Optimize images, reduce unused CSS/JS, and consider a CDN.",
        "medium",
        "medium",
        65,
        "performance",
      ));
    }
  }

  // Image format
  if (result.imageAudit.modernPct < 50) {
    issues.push(makeIssue(
      "image-format",
      "Convert images to WebP/AVIF",
      `Only ${result.imageAudit.modernPct}% of images use modern formats. Switching saves significant bandwidth.`,
      "Re-export or convert all images to WebP or AVIF format and update your image tags.",
      "medium",
      "easy",
      70,
      "performance",
    ));
  }

  // Lazy loading
  if (result.imageAudit.missingLazy > 3) {
    issues.push(makeIssue(
      "lazy-loading",
      "Add lazy loading to images",
      `${result.imageAudit.missingLazy} images lack lazy loading — off-screen images delay initial page render.`,
      'Add loading="lazy" to all images that are not in the initial viewport.',
      "medium",
      "easy",
      60,
      "performance",
    ));
  }

  // Render-blocking scripts
  const renderBlockingCount = result.pageStats?.renderBlockingScripts ?? 0;
  if (renderBlockingCount > 2) {
    issues.push(makeIssue(
      "render-blocking",
      "Remove render-blocking scripts",
      `${renderBlockingCount} render-blocking scripts delay page display.`,
      "Add defer or async attributes to non-critical scripts and move them before </body>.",
      "medium",
      "easy",
      68,
      "performance",
    ));
  }

  // UX: No CTA
  if (!result.ux.hasCTA) {
    issues.push(makeIssue(
      "no-cta",
      "Add a clear call-to-action",
      "No CTA button detected. A strong CTA is the single biggest conversion lever.",
      "Add a prominent, action-oriented button above the fold (e.g. 'Get Started', 'Book a Demo').",
      "high",
      "easy",
      98,
      "ux",
    ));
  } else if (result.conversionScores.ctaStrength < 50) {
    issues.push(makeIssue(
      "weak-cta",
      "Strengthen the call-to-action",
      `CTA strength is ${result.conversionScores.ctaStrength}/100. Make the primary action obvious and specific.`,
      "Replace generic labels ('Submit', 'Click here') with specific action text ('Start Free Trial').",
      "high",
      "easy",
      75,
      "ux",
    ));
  }

  // UX: No trust signals
  if (!result.ux.hasTrustSignals) {
    issues.push(makeIssue(
      "no-trust",
      "No trust signals on the page",
      "No trust signals detected (reviews, badges, testimonials). These significantly boost conversion.",
      "Add customer testimonials, security badges, or industry certifications above the fold.",
      "high",
      "medium",
      80,
      "ux",
    ));
  }

  // UX: No social proof
  if (!result.ux.hasSocialProof) {
    issues.push(makeIssue(
      "no-social-proof",
      "Add social proof",
      "No social proof found. Customer counts, reviews, or case studies build credibility.",
      "Add a testimonials section, star ratings, or a customer logo strip near your CTA.",
      "medium",
      "easy",
      68,
      "ux",
    ));
  }

  // UX: Not mobile ready
  if (!result.ux.mobileReady) {
    issues.push(makeIssue(
      "not-mobile",
      "Improve mobile readiness",
      "The page shows mobile readiness issues. Over 60% of web traffic is mobile.",
      "Test on real devices, fix overflow issues, and ensure tap targets are at least 44×44px.",
      "high",
      "hard",
      78,
      "ux",
    ));
  }

  // UX: No contact info
  if (!result.ux.hasContactInfo) {
    issues.push(makeIssue(
      "no-contact",
      "Add contact information",
      "No contact information found. Visitors can't reach you, which erodes trust.",
      "Add an email address, phone number, or contact form in the header or footer.",
      "medium",
      "easy",
      62,
      "ux",
    ));
  }

  // UX: No privacy policy
  if (!result.ux.hasPrivacyPolicy) {
    issues.push(makeIssue(
      "no-privacy",
      "Add a privacy policy",
      "No privacy policy found. Required by GDPR/CCPA and builds user trust.",
      "Create a privacy policy page and link to it in your footer.",
      "medium",
      "easy",
      62,
      "ux",
    ));
  }

  // Conversion: low clarity
  if (result.conversionScores.clarity < 40) {
    const n = result.conversionScores.clarity;
    issues.push(makeIssue(
      "low-clarity",
      "Clarify what your site offers",
      `Clarity score is ${n}/100 — visitors can't quickly understand what you offer (threshold: below 40).`,
      'Rewrite your hero headline to answer: "What do you do, for whom, and why today?"',
      "high",
      "medium",
      82,
      "conversion",
    ));
  }

  // Conversion: low trust score
  if (result.conversionScores.trust < 40) {
    issues.push(makeIssue(
      "low-trust-score",
      "Improve trust signals for conversions",
      `Trust score is ${result.conversionScores.trust}/100 — low trust (below 40) directly reduces conversion rates.`,
      "Add verified reviews, security certificates, or money-back guarantees to your page.",
      "high",
      "medium",
      78,
      "conversion",
    ));
  }

  // Conversion: high friction
  if (result.conversionScores.friction > 65) {
    const n = result.conversionScores.friction;
    issues.push(makeIssue(
      "high-friction",
      "Reduce conversion friction",
      `Friction score is ${n}/100 — obstacles above 65 are actively preventing conversions.`,
      "Remove unnecessary form fields, reduce steps to checkout/signup, and add autofill support.",
      "high",
      "medium",
      75,
      "conversion",
    ));
  }

  // Conversion: generic copy
  if (result.copyAnalysis.label === "Generic") {
    issues.push(makeIssue(
      "generic-copy",
      "Replace generic marketing copy",
      "Copy is flagged as generic — it fails to differentiate your offering from competitors.",
      "Identify your unique value proposition and rewrite headlines to be specific and benefit-driven.",
      "high",
      "medium",
      80,
      "conversion",
    ));
  } else if (result.copyAnalysis.vaguePhrases.length > 2) {
    issues.push(makeIssue(
      "vague-copy",
      "Replace vague marketing language",
      `${result.copyAnalysis.vaguePhrases.length} generic phrases detected. Specific copy converts better.`,
      "Replace phrases like 'world-class' or 'best-in-class' with concrete facts and numbers.",
      "medium",
      "easy",
      65,
      "conversion",
    ));
  }

  // Security headers
  const secFails = result.securityHeaders.filter((h) => h.status === "fail").length;
  if (secFails >= 3) {
    issues.push(makeIssue(
      "security-headers",
      "Add missing security headers",
      `${secFails} security headers are missing. These protect users and improve trust scores.`,
      "Add Content-Security-Policy, X-Frame-Options, and other missing headers via your server config.",
      "medium",
      "easy",
      72,
      "security",
    ));
  }

  // Content: stale
  if (result.siteFreshness.rating === "stale") {
    issues.push(makeIssue(
      "stale-content",
      "Update stale content",
      "Site content appears outdated. Fresh content signals trust and relevance.",
      "Update copyright years, refresh blog posts, and review any dated statistics or offers.",
      "medium",
      "easy",
      58,
      "content",
    ));
  }

  // Content: complex reading level
  if (result.contentStats?.readingLevel === "advanced") {
    issues.push(makeIssue(
      "complex-content",
      "Content is too complex to read",
      "Advanced reading level increases bounce — most web copy should be Grade 8.",
      "Shorten sentences, replace jargon with plain language, use bullet points.",
      "medium",
      "easy",
      52,
      "content",
    ));
  }

  issues.sort((a, b) => b.urgencyScore - a.urgencyScore);

  return issues;
}

export function getFixFirst(issues: PriorityIssue[]): PriorityIssue[] {
  return issues.slice(0, 5);
}

export function getQuickWins(issues: PriorityIssue[]): PriorityIssue[] {
  return issues.filter((i) => i.effort === "easy").slice(0, 3);
}

export function getHighImpact(issues: PriorityIssue[]): PriorityIssue[] {
  return issues.filter((i) => i.impact === "high");
}
