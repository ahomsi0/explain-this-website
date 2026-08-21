package parser

import (
	"context"
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/ahomsi/explain-website/internal/adminstate"
	"github.com/ahomsi/explain-website/internal/model"
	"golang.org/x/net/html"
)

// Parse takes raw HTML and a source URL, runs all sub-analyses, and returns
// a complete AnalysisResult. pageSpeedKey is optional; when non-empty the
// PageSpeed Insights API is called concurrently to fetch real CWV data.
func Parse(ctx context.Context, rawHTML string, sourceURL string, pageSpeedKey string) (model.AnalysisResult, error) {
	if strings.TrimSpace(rawHTML) == "" {
		return model.AnalysisResult{}, fmt.Errorf("empty HTML response")
	}

	// Kick off the PageSpeed API call concurrently while we parse HTML.
	// Only attempted when a key is configured — without one the API quota is zero.
	type perfResult struct {
		data *model.PerformanceResult
		err  error
	}
	perfCh := make(chan perfResult, 1)
	go func() {
		if pageSpeedKey == "" || !adminstate.FlagEnabled(adminstate.FlagPageSpeed) {
			perfCh <- perfResult{}
			return
		}
		data, err := fetchPerformance(ctx, sourceURL, pageSpeedKey)
		perfCh <- perfResult{data, err}
	}()

	domainCh := make(chan *model.DomainInfo, 1)
	go func() { domainCh <- FetchDomainInfo(ctx, sourceURL) }()

	doc, err := html.Parse(strings.NewReader(rawHTML))
	if err != nil {
		return model.AnalysisResult{}, fmt.Errorf("failed to parse HTML: %w", err)
	}

	visibleText := extractVisibleText(doc)
	rendering := AssessRendering(doc, visibleText)

	overview := extractOverview(doc, rawHTML, sourceURL)
	tech := detectTech(rawHTML, sourceURL)
	seoChecks := auditSEO(doc, rawHTML, sourceURL)
	ux := analyzeUX(doc, rawHTML)
	pageStats := computePageStats(doc, sourceURL, rawHTML)
	contentStats := analyzeContent(visibleText)
	copyAnalysis := AnalyzeCopy(visibleText)
	imageAudit := auditImages(doc)
	intentAlignment := CheckIntentAlignment(doc, rawHTML)
	freshness := auditFreshness(doc, rawHTML)
	colorPalette := ExtractColorPalette(doc, rawHTML)
	fontAudit := ExtractFontAudit(doc, rawHTML)
	linkCheck := CheckLinks(ctx, doc, sourceURL)
	weakPoints, recommendations := generateRecommendations(seoChecks, ux)

	if tech == nil {
		tech = []model.TechItem{}
	}
	if weakPoints == nil {
		weakPoints = []string{}
	}
	if recommendations == nil {
		recommendations = []string{}
	}
	if contentStats.TopKeywords == nil {
		contentStats.TopKeywords = []string{}
	}

	// Build insight layer
	seoIndex := indexSEO(seoChecks)
	isHTTPS := strings.HasPrefix(strings.ToLower(sourceURL), "https://")

	intent := inferIntent(overview, tech, ux, pageStats, rawHTML)
	customerView := buildCustomerView(overview, ux, seoIndex, pageStats, isHTTPS)
	convScores := computeConversionScores(ux, seoIndex, pageStats, isHTTPS, contentStats.ReadingLevel)
	firstImpression := computeFirstImpression(overview, ux, seoIndex, pageStats, isHTTPS)
	biggestOpp := findBiggestOpportunity(seoIndex, ux, pageStats)
	competitorInsight := buildCompetitorInsight(intent, tech, ux, pageStats)
	prioritized := buildPrioritizedIssues(seoIndex, ux, pageStats, isHTTPS, rendering.LikelyClientRendered)
	eli5 := buildELI5(seoIndex, ux)

	if prioritized == nil {
		prioritized = []model.PrioritizedIssue{}
	}
	if eli5 == nil {
		eli5 = []model.ELI5Item{}
	}

	// Collect the concurrent PageSpeed result, but don't let it block the whole
	// analysis indefinitely. If CWV is slow or rate-limited, we still return the
	// rest of the report and simply omit performance data.
	var perf *model.PerformanceResult
	// Matches fetchPerformance's 90s PageSpeed budget (plus a small margin) so
	// a slow-but-successful desktop run is not abandoned just before it lands.
	perfTimer := time.NewTimer(95 * time.Second)
	defer perfTimer.Stop()
	select {
	case perfRes := <-perfCh:
		perf = perfRes.data
	case <-perfTimer.C:
		perf = nil
	case <-ctx.Done():
		return model.AnalysisResult{}, ctx.Err()
	}

	var domainInfo *model.DomainInfo
	select {
	case domainInfo = <-domainCh:
	case <-ctx.Done():
		return model.AnalysisResult{}, ctx.Err()
	}

	// Augment the heuristic tech detection with services Lighthouse confirmed via
	// real network requests. Try mobile first; fall back to desktop if mobile has
	// no entries (PageSpeed sometimes returns one strategy with empty audits).
	if perf != nil {
		var thirdParties []model.ThirdPartyEntity
		if perf.Mobile != nil && len(perf.Mobile.ThirdParties) > 0 {
			thirdParties = perf.Mobile.ThirdParties
		} else if perf.Desktop != nil && len(perf.Desktop.ThirdParties) > 0 {
			thirdParties = perf.Desktop.ThirdParties
		}
		if len(thirdParties) > 0 {
			tech = mergeThirdParties(tech, thirdParties)
		}
	}

	return model.AnalysisResult{
		URL:                sourceURL,
		FetchedAt:          time.Now().UTC(),
		Overview:           overview,
		Rendering:          rendering,
		TechStack:          tech,
		SEOChecks:          seoChecks,
		UX:                 ux,
		PageStats:          pageStats,
		ContentStats:       contentStats,
		WeakPoints:         weakPoints,
		Recommendations:    recommendations,
		Intent:             intent,
		CustomerView:       customerView,
		ConversionScores:   convScores,
		FirstImpression:    firstImpression,
		BiggestOpportunity: biggestOpp,
		CompetitorInsight:  competitorInsight,
		PrioritizedIssues:  prioritized,
		ELI5:               eli5,
		AIDetection:        DetectAIBuilder(rawHTML),
		Performance:        perf,
		ImageAudit:         imageAudit,
		CopyAnalysis:       copyAnalysis,
		IntentAlignment:    intentAlignment,
		SiteFreshness:      freshness,
		ColorPalette:       colorPalette,
		FontAudit:          fontAudit,
		LinkCheck:          linkCheck,
		DomainInfo:         domainInfo,
	}, nil
}

// extractVisibleText collects all user-visible text from the parsed HTML tree.
func extractVisibleText(doc *html.Node) string {
	var sb strings.Builder
	var walk func(*html.Node)
	walk = func(n *html.Node) {
		if n.Type == html.ElementNode {
			tag := strings.ToLower(n.Data)
			if tag == "script" || tag == "style" || tag == "noscript" || tag == "template" || isHiddenElement(n) {
				return
			}
		}
		if n.Type == html.TextNode && n.Parent != nil {
			t := strings.TrimSpace(n.Data)
			if t != "" {
				sb.WriteString(t)
				sb.WriteByte(' ')
			}
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			walk(c)
		}
	}
	walk(doc)
	return sb.String()
}

// computePageStats collects structural and performance metrics from the HTML tree.
func computePageStats(doc *html.Node, sourceURL, rawHTML string) model.PageStats {
	stats := model.PageStats{}

	var sourceHost string
	if u, err := url.Parse(sourceURL); err == nil {
		sourceHost = u.Hostname()
	}

	var textLen int
	inHead := false

	var walk func(*html.Node)
	walk = func(n *html.Node) {
		if n.Type == html.ElementNode {
			tag := strings.ToLower(n.Data)
			if isHiddenElement(n) {
				return
			}

			// Track head scope for render-blocking detection
			if tag == "head" {
				inHead = true
				for c := n.FirstChild; c != nil; c = c.NextSibling {
					walk(c)
				}
				inHead = false
				return
			}

			switch tag {
			case "img":
				stats.ImageCount++
				if strings.ToLower(getAttr(n, "loading")) == "lazy" {
					stats.LazyImageCount++
				}

			case "script":
				src := getAttr(n, "src")
				if src != "" || n.FirstChild != nil {
					stats.ScriptCount++
					if inHead && getAttr(n, "defer") == "" && getAttr(n, "async") == "" {
						stats.RenderBlockingScripts++
					}
					srcLower := strings.ToLower(src)
					if strings.Contains(srcLower, "kit.fontawesome.com") ||
						strings.Contains(srcLower, "use.fontawesome.com") {
						stats.FontCount++
					}
				}

			case "link":
				rel := strings.ToLower(getAttr(n, "rel"))
				href := getAttr(n, "href")
				hrefLower := strings.ToLower(href)
				if rel == "stylesheet" {
					stats.StylesheetCount++
				}
				if (rel == "preload" && strings.ToLower(getAttr(n, "as")) == "font") ||
					strings.Contains(hrefLower, "fonts.googleapis.com") ||
					strings.Contains(hrefLower, "fonts.bunny.net") ||
					strings.Contains(hrefLower, "use.typekit.net") ||
					strings.Contains(hrefLower, "use.fontawesome.com") ||
					strings.Contains(hrefLower, "fonts.apple.com") {
					stats.FontCount++
				}

			case "video":
				// count <video> tags — note: JS-injected videos won't be counted
				stats.VideoCount++

			case "h1":
				stats.H1Count++
			case "h2":
				stats.H2Count++
			case "h3":
				stats.H3Count++

			case "a":
				href := strings.TrimSpace(getAttr(n, "href"))
				hrefLower := strings.ToLower(href)
				if href == "" || strings.HasPrefix(href, "#") ||
					strings.HasPrefix(hrefLower, "mailto:") || strings.HasPrefix(hrefLower, "tel:") {
					break
				}
				if u, ok := resolveHTTPLink(sourceURL, href); ok {
					if normalizedHostname(u.Hostname()) == normalizedHostname(sourceHost) {
						stats.InternalLinks++
					} else {
						stats.ExternalLinks++
					}
				}
			}

			// Count elements with inline style attributes
			if getAttr(n, "style") != "" {
				stats.InlineStyleCount++
			}

		} else if n.Type == html.TextNode && n.Parent != nil {
			parentTag := strings.ToLower(n.Parent.Data)
			if parentTag != "script" && parentTag != "style" && parentTag != "noscript" {
				trimmed := strings.TrimSpace(n.Data)
				stats.WordCount += len(strings.Fields(n.Data))
				textLen += len(trimmed)
			}
		}

		for c := n.FirstChild; c != nil; c = c.NextSibling {
			walk(c)
		}
	}
	walk(doc)

	// Content-to-code ratio
	if htmlLen := len(rawHTML); htmlLen > 0 && textLen > 0 {
		ratio := textLen * 100 / htmlLen
		if ratio > 100 {
			ratio = 100
		}
		stats.ContentToCodeRatio = ratio
	}

	// @font-face in raw CSS/HTML (catches Apple SF, custom self-hosted fonts)
	lowerHTML := strings.ToLower(rawHTML)
	fontFaceCount := strings.Count(lowerHTML, "@font-face")
	if fontFaceCount > 0 && stats.FontCount == 0 {
		// Deduplicate: @font-face blocks often repeat per weight; cap at a sane number
		stats.FontCount = fontFaceCount
		if stats.FontCount > 10 {
			stats.FontCount = 10
		}
	}

	// Video detection via raw HTML (catches <video> tags missed by JS rendering)
	if stats.VideoCount == 0 {
		if strings.Contains(lowerHTML, "<video") ||
			strings.Contains(lowerHTML, "youtube.com/embed") ||
			strings.Contains(lowerHTML, "youtube-nocookie.com/embed") ||
			strings.Contains(lowerHTML, "player.vimeo.com") ||
			strings.Contains(lowerHTML, "fast.wistia.com") {
			stats.VideoCount = 1
		}
	}

	return stats
}

// extractOverview pulls high-level page metadata from the parsed tree.
func extractOverview(doc *html.Node, rawHTML, sourceURL string) model.Overview {
	o := model.Overview{}

	var walk func(*html.Node)
	walk = func(n *html.Node) {
		if n.Type == html.ElementNode {
			tag := strings.ToLower(n.Data)

			switch tag {
			case "title":
				if n.FirstChild != nil && n.FirstChild.Type == html.TextNode {
					o.Title = strings.TrimSpace(n.FirstChild.Data)
				}
			case "html":
				lang := getAttr(n, "lang")
				if lang != "" {
					parts := strings.SplitN(lang, "-", 2)
					o.Language = parts[0]
				}
			case "meta":
				name := strings.ToLower(getAttr(n, "name"))
				property := strings.ToLower(getAttr(n, "property"))
				content := getAttr(n, "content")

				if name == "description" && o.Description == "" {
					o.Description = content
				}
				if property == "og:description" && o.Description == "" {
					o.Description = content
				}
			case "link":
				// Token-based rel matching: covers rel="icon",
				// rel="shortcut icon", and any extra tokens in between.
				isIcon := false
				for _, token := range strings.Fields(strings.ToLower(getAttr(n, "rel"))) {
					if token == "icon" {
						isIcon = true
						break
					}
				}
				if isIcon && o.Favicon == "" {
					// Resolve relative hrefs ("/favicon.ico") so reports always
					// carry a usable absolute URL.
					o.Favicon = resolvePageURL(getAttr(n, "href"), sourceURL)
				}
			}
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			walk(c)
		}
	}
	walk(doc)

	size := len(rawHTML)
	switch {
	case size < 50_000:
		o.PageLoadHint = "lightweight"
	case size < 200_000:
		o.PageLoadHint = "medium"
	default:
		o.PageLoadHint = "heavy"
	}

	return o
}

// resolvePageURL resolves a possibly-relative attribute value against the
// analyzed page URL. Self-contained data: URIs pass through unchanged; any
// other non-http(s) scheme yields "" so reports never emit unusable links.
func resolvePageURL(raw, baseURL string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return ""
	}
	if strings.HasPrefix(strings.ToLower(raw), "data:") {
		return raw
	}
	base, err := url.Parse(baseURL)
	if err != nil || base.Scheme == "" || base.Host == "" {
		return ""
	}
	ref, err := url.Parse(raw)
	if err != nil {
		return ""
	}
	resolved := base.ResolveReference(ref)
	if scheme := strings.ToLower(resolved.Scheme); scheme != "http" && scheme != "https" {
		return ""
	}
	return resolved.String()
}
