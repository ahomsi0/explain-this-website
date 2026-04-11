package model

import "time"

// TechItem represents a detected technology on the analyzed page.
type TechItem struct {
	Name       string `json:"name"`
	Category   string `json:"category"`   // cms, framework, analytics, cdn, builder, ecommerce
	Confidence string `json:"confidence"` // high, medium, low
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
	Score       int    `json:"score"`       // 0–10
	Label       string `json:"label"`       // Poor / Weak / Fair / Good / Strong
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
	Status  string   `json:"status"`           // pass, warning, fail
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

// ContentStats holds content quality and readability metrics.
type ContentStats struct {
	TopKeywords    []string `json:"topKeywords"`
	AvgSentenceLen int      `json:"avgSentenceLen"`
	ReadingLevel   string   `json:"readingLevel"` // simple, moderate, advanced
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
	Intent            IntentSummary      `json:"intent"`
	CustomerView      CustomerView       `json:"customerView"`
	ConversionScores  ConversionScores   `json:"conversionScores"`
	FirstImpression   FirstImpression    `json:"firstImpression"`
	BiggestOpportunity string            `json:"biggestOpportunity"`
	CompetitorInsight  string            `json:"competitorInsight"`
	PrioritizedIssues  []PrioritizedIssue `json:"prioritizedIssues"`
	ELI5               []ELI5Item         `json:"eli5"`
}

// ErrorResponse is returned on any failure.
type ErrorResponse struct {
	Error string `json:"error"`
}

// AnalyzeRequest is the expected JSON body for POST /api/analyze.
type AnalyzeRequest struct {
	URL string `json:"url"`
}
