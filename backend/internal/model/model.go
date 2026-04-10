package model

import "time"

// TechItem represents a detected technology on the analyzed page.
type TechItem struct {
	Name       string `json:"name"`
	Category   string `json:"category"`   // cms, framework, analytics, cdn, builder, ecommerce
	Confidence string `json:"confidence"` // high, medium, low
}

// SEOCheck represents the result of a single SEO audit check.
type SEOCheck struct {
	ID     string `json:"id"`
	Label  string `json:"label"`
	Status string `json:"status"` // pass, warning, fail
	Detail string `json:"detail"`
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
}

// ErrorResponse is returned on any failure.
type ErrorResponse struct {
	Error string `json:"error"`
}

// AnalyzeRequest is the expected JSON body for POST /api/analyze.
type AnalyzeRequest struct {
	URL string `json:"url"`
}
