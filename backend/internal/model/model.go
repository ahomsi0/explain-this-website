package model

import "time"

// TechItem represents a detected technology on the analyzed page.
type TechItem struct {
	Name       string       `json:"name"`
	Category   string       `json:"category"`   // cms, framework, analytics, cdn, builder, ecommerce
	Confidence string       `json:"confidence"` // high, medium, low
	RuleID     string       `json:"ruleId,omitempty"`
	Score      int          `json:"score,omitempty"` // 0-100 internal confidence score
	Signals    []TechSignal `json:"signals,omitempty"`
}

// TechSignal explains why a technology was detected.
type TechSignal struct {
	Pattern      string `json:"pattern"`
	Match        string `json:"match"`
	EvidenceType string `json:"evidenceType"` // explicit, indirect, weak
	Source       string `json:"source"`       // first-party, third-party, unknown
}

// IntentSummary describes the inferred purpose and audience of the website.
type IntentSummary struct {
	Category    string `json:"category"`    // ecommerce, saas, portfolio, blog, landing, service, corporate, general
	Label       string `json:"label"`       // human-readable e.g. "E-commerce Store"
	Description string `json:"description"` // one-sentence explanation
}

// CustomerView evaluates the page from a first-time visitor's perspective.
type CustomerView struct {
	OfferClear bool     `json:"offerClear"`
	CTAClear   bool     `json:"ctaClear"`
	TrustLevel string   `json:"trustLevel"` // strong, moderate, weak
	Statements []string `json:"statements"` // "As a visitor, I..."
}

// ConversionScores breaks conversion readiness into four focused sub-scores (0–100).
type ConversionScores struct {
	Overall      int    `json:"overall"`
	Clarity      int    `json:"clarity"`
	Trust        int    `json:"trust"`
	CTAStrength  int    `json:"ctaStrength"`
	Friction     int    `json:"friction"`
	ClarityNote  string `json:"clarityNote"`
	TrustNote    string `json:"trustNote"`
	CTANote      string `json:"ctaNote"`
	FrictionNote string `json:"frictionNote"`
}

// FirstImpression rates how clear and compelling the page feels in the first few seconds.
type FirstImpression struct {
	Score       int    `json:"score"` // 0–10
	Label       string `json:"label"` // Poor / Weak / Fair / Good / Strong
	Explanation string `json:"explanation"`
}

// PrioritizedIssue is a problem ranked by likely real-world impact.
type PrioritizedIssue struct {
	Rank   int    `json:"rank"`
	Issue  string `json:"issue"`
	Impact string `json:"impact"` // SEO, Conversion, Performance, Accessibility, Trust
	Why    string `json:"why"`
}

// ELI5Item is a plain-language rewrite of a technical finding.
type ELI5Item struct {
	Technical string `json:"technical"`
	Simple    string `json:"simple"`
}

// SEOCheck represents the result of a single SEO audit check.
type SEOCheck struct {
	ID      string   `json:"id"`
	Label   string   `json:"label"`
	Status  string   `json:"status"` // pass, warning, fail
	Detail  string   `json:"detail"`
	Details []string `json:"details,omitempty"` // optional evidence items shown in expanded view
}

// Overview contains high-level page metadata.
type Overview struct {
	Title        string `json:"title"`
	Description  string `json:"description"`
	Favicon      string `json:"favicon"`
	Language     string `json:"language"`
	PageLoadHint string `json:"pageLoadHint"` // lightweight, medium, heavy
}

// UXResult holds the results of conversion and UX heuristic analysis.
type UXResult struct {
	// Conversion signals
	HasCTA          bool `json:"hasCTA"`
	CTACount        int  `json:"ctaCount"`
	HasForms        bool `json:"hasForms"`
	FormCount       int  `json:"formCount"`
	HasSocialProof  bool `json:"hasSocialProof"`
	HasTrustSignals bool `json:"hasTrustSignals"`
	HasContactInfo  bool `json:"hasContactInfo"`
	MobileReady     bool `json:"mobileReady"`
	// Trust & engagement signals
	HasCookieBanner     bool `json:"hasCookieBanner"`
	HasLiveChat         bool `json:"hasLiveChat"`
	HasVideoContent     bool `json:"hasVideoContent"`
	HasNewsletterSignup bool `json:"hasNewsletterSignup"`
	HasPrivacyPolicy    bool `json:"hasPrivacyPolicy"`
}

// PageStats holds raw structural metrics extracted from the page.
type PageStats struct {
	// Content structure
	WordCount     int `json:"wordCount"`
	ImageCount    int `json:"imageCount"`
	InternalLinks int `json:"internalLinks"`
	ExternalLinks int `json:"externalLinks"`
	ScriptCount   int `json:"scriptCount"`
	H1Count       int `json:"h1Count"`
	H2Count       int `json:"h2Count"`
	H3Count       int `json:"h3Count"`
	// Performance
	StylesheetCount       int `json:"stylesheetCount"`
	InlineStyleCount      int `json:"inlineStyleCount"`
	LazyImageCount        int `json:"lazyImageCount"`
	FontCount             int `json:"fontCount"`
	RenderBlockingScripts int `json:"renderBlockingScripts"`
	ContentToCodeRatio    int `json:"contentToCodeRatio"` // 0–100 percent
	VideoCount            int `json:"videoCount"`
}

// SiteFreshness holds signals about how recently a site was updated.
type SiteFreshness struct {
	CopyrightYear int      `json:"copyrightYear"` // latest year found in © text
	LatestDate    string   `json:"latestDate"`    // ISO date from <time>/OG/JSON-LD, may be empty
	Rating        string   `json:"rating"`        // "fresh" | "aging" | "stale" | "unknown"
	Signals       []string `json:"signals"`       // human-readable evidence lines
}

// ImageFormatAudit breaks down image format usage and flags missing optimisations.
type ImageFormatAudit struct {
	Total           int `json:"total"`
	WebP            int `json:"webp"`
	AVIF            int `json:"avif"`
	JPG             int `json:"jpg"`
	PNG             int `json:"png"`
	GIF             int `json:"gif"`
	SVG             int `json:"svg"`
	MissingDims     int `json:"missingDims"`     // no width+height attrs (causes CLS)
	MissingLazy     int `json:"missingLazy"`     // no loading=lazy (above a rough fold threshold)
	ModernPct       int `json:"modernPct"`       // (webp+avif) / total * 100
}

// SecurityHeaderCheck is a single HTTP security-header audit result.
type SecurityHeaderCheck struct {
	ID     string `json:"id"`
	Label  string `json:"label"`
	Status string `json:"status"` // "pass" | "warning" | "fail"
	Detail string `json:"detail"`
}

// LinkCheckItem is the result for a single link probe.
type LinkCheckItem struct {
	URL        string `json:"url"`
	Status     int    `json:"status"`     // HTTP status code; 0 = unreachable
	FinalURL   string `json:"finalUrl"`   // destination after any redirects
	IsRedirect bool   `json:"isRedirect"` // true when FinalURL != URL
	IsBroken   bool   `json:"isBroken"`   // true when status 0, 4xx, or 5xx
}

// LinkCheckResult summarises the health of all probed external links.
type LinkCheckResult struct {
	Checked   int             `json:"checked"`
	OK        int             `json:"ok"`
	Broken    int             `json:"broken"`
	Redirects int             `json:"redirects"`
	Items     []LinkCheckItem `json:"items"`
}

// ColorEntry is one extracted brand colour with its occurrence frequency.
type ColorEntry struct {
	Hex       string `json:"hex"`       // normalised 6-digit lowercase hex e.g. "#6d28d9"
	Frequency int    `json:"frequency"` // number of times seen in CSS/styles
}

// ColorPalette holds the top brand colours extracted from the page.
type ColorPalette struct {
	ThemeColor string       `json:"themeColor"` // from <meta name="theme-color">, may be empty
	Colors     []ColorEntry `json:"colors"`     // top 8, sorted by frequency descending
}

// VaguePhrase is a single flagged marketing cliché with an explanation.
type VaguePhrase struct {
	Phrase string `json:"phrase"`
	Reason string `json:"reason"`
}

// CopyAnalysis scores the specificity of the page's visible copy.
type CopyAnalysis struct {
	Score            int           `json:"score"`            // 0–100
	Label            string        `json:"label"`            // "Sharp" | "Mixed" | "Generic"
	VaguePhrases     []VaguePhrase `json:"vaguePhrases"`
	SpecificityHints []string      `json:"specificityHints"` // positive signals found
}

// IntentCheck is one claim-vs-evidence check for search intent alignment.
type IntentCheck struct {
	Claim  string `json:"claim"`  // e.g. "Title says 'pricing'"
	Signal string `json:"signal"` // e.g. "Price elements on page"
	Found  bool   `json:"found"`
}

// IntentAlignment scores how well page content backs up what title/meta claim.
type IntentAlignment struct {
	Score  int           `json:"score"`  // % of checks that passed (0–100)
	Checks []IntentCheck `json:"checks"` // may be empty when no intent keywords found
}

// ContentStats holds content quality and readability metrics.
type ContentStats struct {
	TopKeywords    []string `json:"topKeywords"`
	AvgSentenceLen int      `json:"avgSentenceLen"`
	ReadingLevel   string   `json:"readingLevel"` // simple, moderate, advanced
}

// AIDetection reports whether the site was built with an AI website builder.
type AIDetection struct {
	IsAIBuilt  bool     `json:"isAIBuilt"`
	Confidence string   `json:"confidence"` // "high", "medium"
	Builder    string   `json:"builder"`    // e.g. "Framer", "Durable", or ""
	Signals    []string `json:"signals"`
}

// CoreWebVital holds a single CWV metric with its value, display string, and rating.
type CoreWebVital struct {
	Value        float64 `json:"value"`
	DisplayValue string  `json:"displayValue"`
	Rating       string  `json:"rating"` // "good" | "needs-improvement" | "poor"
}

// LighthouseScores holds the four Lighthouse category scores (0–100).
type LighthouseScores struct {
	Performance   int `json:"performance"`
	Accessibility int `json:"accessibility"`
	BestPractices int `json:"bestPractices"`
	SEO           int `json:"seo"`
}

// ThirdPartyEntity is a single third-party service detected by Lighthouse network analysis.
type ThirdPartyEntity struct {
	Name         string `json:"name"`
	TransferSize int    `json:"transferSize"` // bytes
}

// StrategyData holds Lighthouse + CWV results for one device strategy.
type StrategyData struct {
	Lighthouse LighthouseScores `json:"lighthouse"`
	FCP        CoreWebVital     `json:"fcp"`
	LCP        CoreWebVital     `json:"lcp"`
	TBT        CoreWebVital     `json:"tbt"`
	CLS        CoreWebVital     `json:"cls"`
	SpeedIndex CoreWebVital     `json:"speedIndex"`
	// Field data from real users (CrUX) — omitted when the site has insufficient traffic.
	FieldLCP *CoreWebVital `json:"fieldLcp,omitempty"`
	FieldCLS *CoreWebVital `json:"fieldCls,omitempty"`
	FieldINP *CoreWebVital `json:"fieldInp,omitempty"`
	FieldFCP *CoreWebVital `json:"fieldFcp,omitempty"`
	// Third parties detected by Lighthouse via real network requests.
	ThirdParties []ThirdPartyEntity `json:"thirdParties,omitempty"`
}

// PerformanceResult holds real performance data for both mobile and desktop.
// Either field may be nil if that strategy's API call failed.
type PerformanceResult struct {
	Available bool          `json:"available"`
	Mobile    *StrategyData `json:"mobile,omitempty"`
	Desktop   *StrategyData `json:"desktop,omitempty"`
}

// FontEntry describes one detected font family.
type FontEntry struct {
	Family  string   `json:"family"`
	Source  string   `json:"source"`  // "Google Fonts" | "Bunny Fonts" | "Adobe Fonts" | "Custom/Self-hosted"
	Weights []string `json:"weights"` // e.g. ["400","500","700"], empty if unknown
}

// FontAudit summarises web font usage detected from HTML.
type FontAudit struct {
	Families      []FontEntry `json:"families"`
	TotalFamilies int         `json:"totalFamilies"`
	TotalWeights  int         `json:"totalWeights"`
	HasPerfIssue  bool        `json:"hasPerfIssue"` // true if >3 families or >6 total weight variants
}

// AnalysisResult is the full response returned by POST /api/analyze.
type AnalysisResult struct {
	URL             string       `json:"url"`
	FetchedAt       time.Time    `json:"fetchedAt"`
	Overview        Overview     `json:"overview"`
	TechStack       []TechItem   `json:"techStack"`
	SEOChecks       []SEOCheck   `json:"seoChecks"`
	UX              UXResult     `json:"ux"`
	PageStats       PageStats    `json:"pageStats"`
	ContentStats    ContentStats `json:"contentStats"`
	WeakPoints      []string     `json:"weakPoints"`
	Recommendations []string     `json:"recommendations"`
	// Insight layer
	Intent             IntentSummary      `json:"intent"`
	CustomerView       CustomerView       `json:"customerView"`
	ConversionScores   ConversionScores   `json:"conversionScores"`
	FirstImpression    FirstImpression    `json:"firstImpression"`
	BiggestOpportunity string             `json:"biggestOpportunity"`
	CompetitorInsight  string             `json:"competitorInsight"`
	PrioritizedIssues  []PrioritizedIssue `json:"prioritizedIssues"`
	ELI5               []ELI5Item         `json:"eli5"`
	AIDetection        AIDetection        `json:"aiDetection"`
	Performance        *PerformanceResult `json:"performance,omitempty"`
	ReportID           string             `json:"reportId,omitempty"`
	ImageAudit         ImageFormatAudit   `json:"imageAudit"`
	SiteFreshness      SiteFreshness      `json:"siteFreshness"`
	SecurityHeaders []SecurityHeaderCheck `json:"securityHeaders"`
	LinkCheck       LinkCheckResult       `json:"linkCheck"`
	ColorPalette    ColorPalette          `json:"colorPalette"`
	CopyAnalysis    CopyAnalysis          `json:"copyAnalysis"`
	IntentAlignment IntentAlignment       `json:"intentAlignment"`
	FontAudit       FontAudit             `json:"fontAudit"`
}

// ErrorResponse is returned on any failure.
type ErrorResponse struct {
	Error string `json:"error"`
}

// AnalyzeRequest is the expected JSON body for POST /api/analyze.
type AnalyzeRequest struct {
	URL string `json:"url"`
}
