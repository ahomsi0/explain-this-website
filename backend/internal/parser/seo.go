package parser

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/ahomsi/explain-website/internal/model"
	"golang.org/x/net/html"
)

type seoState struct {
	titleText         string
	metaDesc          string
	metaViewport      bool
	metaRobotsContent string
	metaRobotsNoindex bool
	canonicalURL      string
	h1Count           int
	h1Texts           []string
	imgTotal          int
	imgMissingAlt     int
	imgMissingAltSrcs []string
	ogTitle           string
	ogDesc            string
	ogImage           string
	hasSchemaJSON     bool
	hasMicrodata      bool
	schemaTypes       []string
	hasHreflang       bool
	hreflangLangs     []string
	hasSitemapLink    bool
	sitemapLinkHref   string
}

// auditSEO walks the HTML node tree once and returns a list of SEO checks.
func auditSEO(doc *html.Node, rawHTML, sourceURL string) []model.SEOCheck {
	state := &seoState{}
	walkSEO(doc, state)
	return buildChecks(state, rawHTML, sourceURL)
}

func walkSEO(n *html.Node, s *seoState) {
	if n.Type == html.ElementNode {
		tag := strings.ToLower(n.Data)

		switch tag {
		case "title":
			if n.FirstChild != nil && n.FirstChild.Type == html.TextNode {
				s.titleText = strings.TrimSpace(n.FirstChild.Data)
			}

		case "meta":
			name := strings.ToLower(getAttr(n, "name"))
			property := strings.ToLower(getAttr(n, "property"))
			content := getAttr(n, "content")

			switch name {
			case "description":
				s.metaDesc = content
			case "viewport":
				s.metaViewport = true
			case "robots":
				s.metaRobotsContent = content
				if strings.Contains(strings.ToLower(content), "noindex") {
					s.metaRobotsNoindex = true
				}
			}

			switch property {
			case "og:title":
				s.ogTitle = content
			case "og:description":
				s.ogDesc = content
			case "og:image":
				s.ogImage = content
			}

		case "link":
			rel := strings.ToLower(getAttr(n, "rel"))
			switch rel {
			case "canonical":
				s.canonicalURL = getAttr(n, "href")
			case "sitemap":
				s.hasSitemapLink = true
				s.sitemapLinkHref = getAttr(n, "href")
			case "alternate":
				lang := getAttr(n, "hreflang")
				if lang != "" {
					s.hasHreflang = true
					s.hreflangLangs = append(s.hreflangLangs, lang)
				}
			}

		case "h1":
			if !isHiddenElement(n) {
				s.h1Count++
				if text := getTextContent(n); text != "" {
					s.h1Texts = append(s.h1Texts, truncate(text, 80))
				}
			}

		case "img":
			// Skip decorative images: explicitly marked presentation or hidden from AT.
			if getAttr(n, "role") == "presentation" || isHiddenElement(n) {
				break
			}
			s.imgTotal++
			alt := strings.TrimSpace(getAttr(n, "alt"))
			if alt == "" {
				s.imgMissingAlt++
				src := getAttr(n, "src")
				if src == "" {
					src = getAttr(n, "data-src")
				}
				if src != "" {
					s.imgMissingAltSrcs = append(s.imgMissingAltSrcs, truncate(src, 80))
				}
			}

		case "script":
			if strings.ToLower(getAttr(n, "type")) == "application/ld+json" {
				s.hasSchemaJSON = true
				// Extract @type values from the inline JSON text
				if n.FirstChild != nil && n.FirstChild.Type == html.TextNode {
					for _, t := range extractSchemaTypes(n.FirstChild.Data) {
						s.schemaTypes = append(s.schemaTypes, t)
					}
				}
			}
		}

		if getAttr(n, "itemscope") != "" || getAttr(n, "itemtype") != "" {
			s.hasMicrodata = true
		}
	}

	for c := n.FirstChild; c != nil; c = c.NextSibling {
		walkSEO(c, s)
	}
}

func buildChecks(s *seoState, rawHTML, sourceURL string) []model.SEOCheck {
	checks := []model.SEOCheck{}
	lower := strings.ToLower(rawHTML)

	// ── HTTPS ──────────────────────────────────────────────────────────────────
	isHTTPS := strings.HasPrefix(strings.ToLower(sourceURL), "https://")
	if isHTTPS {
		checks = append(checks, model.SEOCheck{ID: "https", Label: "HTTPS", Status: "pass",
			Detail: "Site is served over HTTPS"})
	} else {
		checks = append(checks, model.SEOCheck{ID: "https", Label: "HTTPS", Status: "fail",
			Detail: "Site is not using HTTPS — insecure and a negative ranking signal"})
	}

	// ── Mixed content ──────────────────────────────────────────────────────────
	if isHTTPS {
		mixedURLs := extractMixedContentURLs(rawHTML)
		if len(mixedURLs) > 0 {
			details := make([]string, 0, len(mixedURLs))
			for _, u := range mixedURLs {
				details = append(details, u)
			}
			checks = append(checks, model.SEOCheck{
				ID: "mixed_content", Label: "Mixed Content", Status: "warning",
				Detail:  fmt.Sprintf("%d HTTP resource(s) found on HTTPS page", len(mixedURLs)),
				Details: details,
			})
		} else {
			checks = append(checks, model.SEOCheck{ID: "mixed_content", Label: "Mixed Content",
				Status: "pass", Detail: "No mixed content detected"})
		}
	}

	// ── Title ──────────────────────────────────────────────────────────────────
	switch {
	case s.titleText == "":
		checks = append(checks, model.SEOCheck{ID: "title", Label: "Page Title", Status: "fail",
			Detail: "No <title> tag found"})
	case len(s.titleText) < 10:
		checks = append(checks, model.SEOCheck{ID: "title", Label: "Page Title", Status: "warning",
			Detail:  fmt.Sprintf("Title is very short (%d chars)", len(s.titleText)),
			Details: []string{s.titleText},
		})
	case len(s.titleText) > 60:
		checks = append(checks, model.SEOCheck{ID: "title", Label: "Page Title", Status: "warning",
			Detail:  fmt.Sprintf("Title may be truncated in SERPs (%d chars, recommended <= 60)", len(s.titleText)),
			Details: []string{s.titleText},
		})
	default:
		checks = append(checks, model.SEOCheck{ID: "title", Label: "Page Title", Status: "pass",
			Detail:  fmt.Sprintf("%d chars — within the recommended range", len(s.titleText)),
			Details: []string{s.titleText},
		})
	}

	// ── Meta description ───────────────────────────────────────────────────────
	switch {
	case s.metaDesc == "":
		checks = append(checks, model.SEOCheck{ID: "meta_desc", Label: "Meta Description", Status: "fail",
			Detail: "No meta description found — search snippet will be auto-generated"})
	case len(s.metaDesc) < 70:
		checks = append(checks, model.SEOCheck{ID: "meta_desc", Label: "Meta Description", Status: "warning",
			Detail:  fmt.Sprintf("Description is short (%d chars, recommended 120-160)", len(s.metaDesc)),
			Details: []string{s.metaDesc},
		})
	case len(s.metaDesc) > 160:
		checks = append(checks, model.SEOCheck{ID: "meta_desc", Label: "Meta Description", Status: "warning",
			Detail:  fmt.Sprintf("Description may be truncated (%d chars, recommended <= 160)", len(s.metaDesc)),
			Details: []string{s.metaDesc},
		})
	default:
		checks = append(checks, model.SEOCheck{ID: "meta_desc", Label: "Meta Description", Status: "pass",
			Detail:  fmt.Sprintf("%d chars — within the recommended range", len(s.metaDesc)),
			Details: []string{s.metaDesc},
		})
	}

	// ── Canonical ──────────────────────────────────────────────────────────────
	if s.canonicalURL == "" {
		checks = append(checks, model.SEOCheck{ID: "canonical", Label: "Canonical URL", Status: "fail",
			Detail: "No <link rel=\"canonical\"> tag found"})
	} else {
		checks = append(checks, model.SEOCheck{ID: "canonical", Label: "Canonical URL", Status: "pass",
			Detail:  "Canonical tag present",
			Details: []string{s.canonicalURL},
		})
	}

	// ── H1 ─────────────────────────────────────────────────────────────────────
	switch {
	case s.h1Count == 0:
		checks = append(checks, model.SEOCheck{ID: "h1_count", Label: "H1 Heading", Status: "fail",
			Detail: "No H1 heading found on the page"})
	case s.h1Count == 1:
		details := []string{}
		if len(s.h1Texts) > 0 {
			details = []string{s.h1Texts[0]}
		}
		checks = append(checks, model.SEOCheck{ID: "h1_count", Label: "H1 Heading", Status: "pass",
			Detail: "Exactly one H1 found", Details: details})
	default:
		checks = append(checks, model.SEOCheck{ID: "h1_count", Label: "H1 Heading", Status: "warning",
			Detail:  fmt.Sprintf("%d H1 tags found — only one is recommended", s.h1Count),
			Details: s.h1Texts,
		})
	}

	// ── Image alt text ─────────────────────────────────────────────────────────
	switch {
	case s.imgTotal == 0:
		checks = append(checks, model.SEOCheck{ID: "img_alt", Label: "Image Alt Text", Status: "pass",
			Detail: "No images found on the page"})
	case s.imgMissingAlt == 0:
		checks = append(checks, model.SEOCheck{ID: "img_alt", Label: "Image Alt Text", Status: "pass",
			Detail: fmt.Sprintf("All %d images have alt attributes", s.imgTotal)})
	default:
		pct := (s.imgMissingAlt * 100) / s.imgTotal
		status := "warning"
		if pct > 30 {
			status = "fail"
		}
		details := capList(s.imgMissingAltSrcs, 8)
		checks = append(checks, model.SEOCheck{ID: "img_alt", Label: "Image Alt Text", Status: status,
			Detail:  fmt.Sprintf("%d of %d images missing alt text (%d%%)", s.imgMissingAlt, s.imgTotal, pct),
			Details: details,
		})
	}

	// ── Open Graph ─────────────────────────────────────────────────────────────
	ogDetails := []string{}
	if s.ogTitle != "" {
		ogDetails = append(ogDetails, "og:title — "+truncate(s.ogTitle, 60))
	} else {
		ogDetails = append(ogDetails, "og:title — missing")
	}
	if s.ogDesc != "" {
		ogDetails = append(ogDetails, "og:description — "+truncate(s.ogDesc, 60))
	} else {
		ogDetails = append(ogDetails, "og:description — missing")
	}
	if s.ogImage != "" {
		ogDetails = append(ogDetails, "og:image — "+truncate(s.ogImage, 60))
	} else {
		ogDetails = append(ogDetails, "og:image — missing")
	}

	switch {
	case s.ogTitle != "" && s.ogDesc != "" && s.ogImage != "":
		checks = append(checks, model.SEOCheck{ID: "og_tags", Label: "Open Graph Tags", Status: "pass",
			Detail: "og:title, og:description, and og:image all present", Details: ogDetails})
	case s.ogTitle != "" || s.ogDesc != "":
		missing := []string{}
		if s.ogTitle == "" {
			missing = append(missing, "og:title")
		}
		if s.ogDesc == "" {
			missing = append(missing, "og:description")
		}
		if s.ogImage == "" {
			missing = append(missing, "og:image")
		}
		checks = append(checks, model.SEOCheck{ID: "og_tags", Label: "Open Graph Tags", Status: "warning",
			Detail:  fmt.Sprintf("Partial OG tags — missing: %s", strings.Join(missing, ", ")),
			Details: ogDetails,
		})
	default:
		checks = append(checks, model.SEOCheck{ID: "og_tags", Label: "Open Graph Tags", Status: "fail",
			Detail: "No Open Graph tags found — social shares will look poor"})
	}

	// ── Structured data ────────────────────────────────────────────────────────
	if s.hasSchemaJSON || s.hasMicrodata {
		schemaType := "JSON-LD"
		if s.hasMicrodata && !s.hasSchemaJSON {
			schemaType = "Microdata"
		}
		details := []string{}
		for _, t := range unique(s.schemaTypes) {
			details = append(details, t)
		}
		checks = append(checks, model.SEOCheck{ID: "schema", Label: "Structured Data", Status: "pass",
			Detail: fmt.Sprintf("%s schema detected", schemaType), Details: details})
	} else {
		checks = append(checks, model.SEOCheck{ID: "schema", Label: "Structured Data", Status: "fail",
			Detail: "No JSON-LD or Microdata found — missing rich snippet opportunities"})
	}

	// ── Viewport ───────────────────────────────────────────────────────────────
	if s.metaViewport {
		checks = append(checks, model.SEOCheck{ID: "viewport", Label: "Viewport Meta Tag", Status: "pass",
			Detail: "Viewport tag present"})
	} else {
		checks = append(checks, model.SEOCheck{ID: "viewport", Label: "Viewport Meta Tag", Status: "fail",
			Detail: "No viewport meta tag — page may not render well on mobile"})
	}

	// ── Robots ─────────────────────────────────────────────────────────────────
	if s.metaRobotsNoindex {
		details := []string{}
		if s.metaRobotsContent != "" {
			details = []string{s.metaRobotsContent}
		}
		checks = append(checks, model.SEOCheck{ID: "robots", Label: "Robots Directive", Status: "fail",
			Detail: "Page has noindex — it will not appear in search results", Details: details})
	} else {
		checks = append(checks, model.SEOCheck{ID: "robots", Label: "Robots Directive", Status: "pass",
			Detail: "No noindex directive — page is indexable"})
	}

	// ── Hreflang ───────────────────────────────────────────────────────────────
	if s.hasHreflang {
		checks = append(checks, model.SEOCheck{ID: "hreflang", Label: "Hreflang Tags", Status: "pass",
			Detail:  fmt.Sprintf("Multilingual targeting configured (%d lang entries)", len(s.hreflangLangs)),
			Details: unique(s.hreflangLangs),
		})
	} else {
		checks = append(checks, model.SEOCheck{ID: "hreflang", Label: "Hreflang Tags", Status: "warning",
			Detail: "No hreflang tags — add if you target multiple languages or regions"})
	}

	// ── Sitemap ────────────────────────────────────────────────────────────────
	// Accept: explicit <link rel="sitemap">, sitemap URLs referenced in HTML,
	// or known SEO plugins that always generate a sitemap automatically.
	sitemapDetails := []string{}
	sitemapFound := false

	if s.hasSitemapLink {
		sitemapFound = true
		href := s.sitemapLinkHref
		if href == "" {
			href = "URL not specified"
		}
		sitemapDetails = append(sitemapDetails, "<link rel=\"sitemap\"> found: "+href)
	}
	if strings.Contains(lower, "sitemap_index.xml") {
		sitemapFound = true
		sitemapDetails = append(sitemapDetails, "sitemap_index.xml referenced in page source")
	} else if strings.Contains(lower, "/sitemap.xml") {
		sitemapFound = true
		sitemapDetails = append(sitemapDetails, "/sitemap.xml referenced in page source")
	}
	if !sitemapFound {
		// Known SEO plugins that auto-generate sitemaps at /sitemap_index.xml
		switch {
		case strings.Contains(lower, "yoast"):
			sitemapFound = true
			sitemapDetails = append(sitemapDetails, "Yoast SEO detected — sitemap auto-generated at /sitemap_index.xml")
		case strings.Contains(lower, "rank math") || strings.Contains(lower, "rankmath"):
			sitemapFound = true
			sitemapDetails = append(sitemapDetails, "RankMath SEO detected — sitemap auto-generated at /sitemap_index.xml")
		case strings.Contains(lower, "aioseo") || strings.Contains(lower, "all-in-one-seo"):
			sitemapFound = true
			sitemapDetails = append(sitemapDetails, "All in One SEO detected — sitemap auto-generated")
		case strings.Contains(lower, "seopress"):
			sitemapFound = true
			sitemapDetails = append(sitemapDetails, "SEOPress detected — sitemap auto-generated")
		}
	}

	if sitemapFound {
		checks = append(checks, model.SEOCheck{ID: "sitemap", Label: "Sitemap", Status: "pass",
			Detail: "Sitemap detected", Details: sitemapDetails})
	} else {
		checks = append(checks, model.SEOCheck{ID: "sitemap", Label: "Sitemap", Status: "warning",
			Detail: "No sitemap reference found — add a sitemap and submit it to Google Search Console"})
	}

	return checks
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// getAttr returns the value of a named attribute from an HTML node.
func getAttr(n *html.Node, key string) string {
	for _, a := range n.Attr {
		if strings.EqualFold(a.Key, key) {
			return a.Val
		}
	}
	return ""
}

// getTextContent recursively collects all text node content under n.
func getTextContent(n *html.Node) string {
	var b strings.Builder
	var walk func(*html.Node)
	walk = func(node *html.Node) {
		if node.Type == html.TextNode {
			b.WriteString(node.Data)
		}
		for c := node.FirstChild; c != nil; c = c.NextSibling {
			walk(c)
		}
	}
	walk(n)
	return strings.TrimSpace(b.String())
}

// extractMixedContentURLs finds HTTP src/href values on an HTTPS page (up to 8).
func extractMixedContentURLs(rawHTML string) []string {
	re := regexp.MustCompile(`(?i)(?:src|href)=["'](http://[^"'>\s]{4,100})["']`)
	matches := re.FindAllStringSubmatch(rawHTML, 20)
	seen := map[string]bool{}
	result := []string{}
	for _, m := range matches {
		if len(m) > 1 && !seen[m[1]] {
			seen[m[1]] = true
			result = append(result, m[1])
			if len(result) >= 8 {
				break
			}
		}
	}
	return result
}

// extractSchemaTypes pulls @type values out of a JSON-LD script body.
func extractSchemaTypes(jsonText string) []string {
	re := regexp.MustCompile(`"@type"\s*:\s*"([^"]+)"`)
	matches := re.FindAllStringSubmatch(jsonText, 10)
	types := []string{}
	for _, m := range matches {
		if len(m) > 1 {
			types = append(types, m[1])
		}
	}
	return types
}

// capList returns at most n items from a slice.
func capList(items []string, n int) []string {
	if len(items) <= n {
		return items
	}
	return items[:n]
}

// unique deduplicates a string slice preserving order.
func unique(items []string) []string {
	seen := map[string]bool{}
	out := []string{}
	for _, s := range items {
		if !seen[s] {
			seen[s] = true
			out = append(out, s)
		}
	}
	return out
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "..."
}

// isHiddenElement returns true when a node is visually or semantically hidden.
// We skip such elements in H1 and img audits to avoid false negatives caused
// by SEO-spam H1s hidden with CSS, or decorative images without alt text.
func isHiddenElement(n *html.Node) bool {
	if getAttr(n, "aria-hidden") == "true" {
		return true
	}
	if getAttr(n, "hidden") != "" {
		return true
	}
	style := strings.ToLower(getAttr(n, "style"))
	return strings.Contains(style, "display:none") ||
		strings.Contains(style, "display: none") ||
		strings.Contains(style, "visibility:hidden") ||
		strings.Contains(style, "visibility: hidden")
}
