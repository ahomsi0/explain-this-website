export type TechCategory = "cms" | "framework" | "analytics" | "cdn" | "builder" | "ecommerce" | "media" | "ai-builder";
export type Confidence = "high" | "medium" | "low";
export type SEOStatus = "pass" | "warning" | "fail";
export type AnalysisStatus = "idle" | "loading" | "error" | "success";
export type PageLoadHint = "lightweight" | "medium" | "heavy";
export type ReadingLevel = "simple" | "moderate" | "advanced";

export interface TechItem {
  name: string;
  category: TechCategory;
  confidence: Confidence;
  ruleId?: string;
  score?: number;
  signals?: TechSignal[];
}

export interface TechSignal {
  pattern: string;
  match: string;
  evidenceType: "explicit" | "indirect" | "weak";
  source: "first-party" | "third-party" | "unknown";
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

export interface AIDetection {
  isAIBuilt: boolean;
  confidence: "high" | "medium";
  builder: string;
  signals: string[];
}

export type CWVRating = "good" | "needs-improvement" | "poor";

export interface CoreWebVital {
  value: number;
  displayValue: string;
  rating: CWVRating;
}

export interface LighthouseScores {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
}

export interface ThirdPartyEntity {
  name: string;
  transferSize: number; // bytes
}

export interface StrategyData {
  lighthouse: LighthouseScores;
  fcp: CoreWebVital;
  lcp: CoreWebVital;
  tbt: CoreWebVital;
  cls: CoreWebVital;
  speedIndex: CoreWebVital;
  fieldLcp?: CoreWebVital;
  fieldCls?: CoreWebVital;
  fieldInp?: CoreWebVital;
  fieldFcp?: CoreWebVital;
  thirdParties?: ThirdPartyEntity[];
}

export interface PerformanceResult {
  available: boolean;
  mobile?: StrategyData;
  desktop?: StrategyData;
}

export interface SiteFreshness {
  copyrightYear: number;
  latestDate: string;
  rating: 'fresh' | 'aging' | 'stale' | 'unknown';
  signals: string[];
}

export interface FontEntry {
  family: string;
  source: string;
  weights: string[];
}

export interface FontAudit {
  families: FontEntry[];
  totalFamilies: number;
  totalWeights: number;
  hasPerfIssue: boolean;
}

export interface DomainInfo {
  registeredAt: string; // "YYYY-MM-DD"
  expiresAt: string;    // "YYYY-MM-DD" or ""
  registrar: string;
  ageYears: number;     // -1 if unknown
}

export interface SecurityHeaderCheck {
  id: string;
  label: string;
  status: "pass" | "warning" | "fail";
  detail: string;
}

export interface LinkCheckItem {
  url: string;
  status: number;
  finalUrl: string;
  isRedirect: boolean;
  isBroken: boolean;
}

export interface LinkCheckResult {
  checked: number;
  ok: number;
  broken: number;
  redirects: number;
  items: LinkCheckItem[];
}

export interface ColorEntry {
  hex: string;
  frequency: number;
}

export interface ColorPalette {
  themeColor: string;
  colors: ColorEntry[];
}

export interface VaguePhrase {
  phrase: string;
  reason: string;
}

export interface CopyAnalysis {
  score: number;
  label: "Sharp" | "Mixed" | "Generic";
  vaguePhrases: VaguePhrase[];
  specificityHints: string[];
}

export interface IntentCheck {
  claim: string;
  signal: string;
  found: boolean;
}

export interface IntentAlignment {
  score: number;
  checks: IntentCheck[];
}

export interface ImageFormatAudit {
  total: number;
  webp: number;
  avif: number;
  jpg: number;
  png: number;
  gif: number;
  svg: number;
  missingDims: number;
  missingLazy: number;
  modernPct: number;
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
  aiDetection: AIDetection;
  performance?: PerformanceResult;
  reportId?: string;
  imageAudit: ImageFormatAudit;
  siteFreshness: SiteFreshness;
  securityHeaders: SecurityHeaderCheck[];
  linkCheck: LinkCheckResult;
  colorPalette: ColorPalette;
  copyAnalysis: CopyAnalysis;
  intentAlignment: IntentAlignment;
  fontAudit?: FontAudit;
  domainInfo?: DomainInfo;
}

export interface AnalysisError {
  error: string;
}
