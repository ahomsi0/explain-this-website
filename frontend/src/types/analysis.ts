export type TechCategory = "cms" | "framework" | "analytics" | "cdn" | "builder" | "ecommerce" | "media";
export type Confidence = "high" | "medium" | "low";
export type SEOStatus = "pass" | "warning" | "fail";
export type AnalysisStatus = "idle" | "loading" | "error" | "success";
export type PageLoadHint = "lightweight" | "medium" | "heavy";
export type ReadingLevel = "simple" | "moderate" | "advanced";

export interface TechItem {
  name: string;
  category: TechCategory;
  confidence: Confidence;
}

export interface SEOCheck {
  id: string;
  label: string;
  status: SEOStatus;
  detail: string;
  details?: string[]; // expandable evidence items
}

export interface Overview {
  title: string;
  description: string;
  favicon: string;
  language: string;
  pageLoadHint: PageLoadHint;
}

export interface UXResult {
  // Conversion signals
  hasCTA: boolean;
  ctaCount: number;
  hasForms: boolean;
  formCount: number;
  hasSocialProof: boolean;
  hasTrustSignals: boolean;
  hasContactInfo: boolean;
  mobileReady: boolean;
  // Trust & engagement
  hasCookieBanner: boolean;
  hasLiveChat: boolean;
  hasVideoContent: boolean;
  hasNewsletterSignup: boolean;
  hasPrivacyPolicy: boolean;
}

export interface PageStats {
  // Content structure
  wordCount: number;
  imageCount: number;
  internalLinks: number;
  externalLinks: number;
  scriptCount: number;
  h1Count: number;
  h2Count: number;
  h3Count: number;
  // Performance
  stylesheetCount: number;
  inlineStyleCount: number;
  lazyImageCount: number;
  fontCount: number;
  renderBlockingScripts: number;
  contentToCodeRatio: number;
  videoCount: number;
}

export interface ContentStats {
  topKeywords: string[];
  avgSentenceLen: number;
  readingLevel: ReadingLevel;
}

export interface IntentSummary {
  category: string;
  label: string;
  description: string;
}

export interface CustomerView {
  offerClear: boolean;
  ctaClear: boolean;
  trustLevel: "strong" | "moderate" | "weak";
  statements: string[];
}

export interface ConversionScores {
  overall: number;
  clarity: number;
  trust: number;
  ctaStrength: number;
  friction: number;
  clarityNote: string;
  trustNote: string;
  ctaNote: string;
  frictionNote: string;
}

export interface FirstImpression {
  score: number;  // 0–10
  label: string;  // Poor / Weak / Fair / Good / Strong
  explanation: string;
}

export interface PrioritizedIssue {
  rank: number;
  issue: string;
  impact: string;
  why: string;
}

export interface ELI5Item {
  technical: string;
  simple: string;
}

export interface AnalysisResult {
  url: string;
  fetchedAt: string;
  overview: Overview;
  techStack: TechItem[];
  seoChecks: SEOCheck[];
  ux: UXResult;
  pageStats?: PageStats;
  contentStats?: ContentStats;
  weakPoints: string[];
  recommendations: string[];
  intent: IntentSummary;
  customerView: CustomerView;
  conversionScores: ConversionScores;
  firstImpression: FirstImpression;
  biggestOpportunity: string;
  competitorInsight: string;
  prioritizedIssues: PrioritizedIssue[];
  eli5: ELI5Item[];
}

export interface AnalysisError {
  error: string;
}
