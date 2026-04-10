package parser

import (
	"fmt"
	"strings"

	"github.com/ahomsi/explain-website/internal/model"
	"golang.org/x/net/html"
)

type seoState struct {
	titleText         string
	metaDesc          string
	metaViewport      bool
	metaRobotsNoindex bool
	canonicalURL      string
	h1Count           int
	imgTotal          int
	imgMissingAlt     int
	ogTitle           string
	ogDesc            string
	ogImage           string
	hasSchemaJSON     bool
	hasMicrodata      bool
	hasHreflang       bool
	hasSitemapLink    bool
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
			case "alternate":
				if getAttr(n, "hreflang") != "" {
					s.hasHreflang = true
				}
			}

		case "h1":
			s.h1Count++

		case "img":
			s.imgTotal++
			alt := strings.TrimSpace(getAttr(n, "alt"))
			if alt == "" {
				s.imgMissingAlt++
			}

		case "script":
			if strings.ToLower(getAttr(n, "type")) == "application/ld+json" {
				s.hasSchemaJSON = true
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

	// HTTPS
	isHTTPS := strings.HasPrefix(strings.ToLower(sourceURL), "https://")
	if isHTTPS {
		checks = append(checks, model.SEOCheck{ID: "https", Label: "HTTPS", Status: "pass", Detail: "Site is served over HTTPS"})
	} else {
		checks = append(checks, model.SEOCheck{ID: "https", Label: "HTTPS", Status: "fail", Detail: "Site is not using HTTPS — insecure and a negative ranking signal"})
	}

	// Mixed content (only relevant on HTTPS pages)
	if isHTTPS {
		lower := strings.ToLower(rawHTML)
		hasMixed := strings.Contains(lower, `src="http://`) || strings.Contains(lower, `src='http://`)
		if hasMixed {
			checks = append(checks, model.SEOCheck{ID: "mixed_content", Label: "Mixed Content", Status: "warning", Detail: "HTTP resources found on HTTPS page — may trigger browser security warnings"})
		} else {
			checks = append(checks, model.SEOCheck{ID: "mixed_content", Label: "Mixed Content", Status: "pass", Detail: "No mixed content detected"})
		}
	}

	// Title
	switch {
	case s.titleText == "":
		checks = append(checks, model.SEOCheck{ID: "title", Label: "Page Title", Status: "fail", Detail: "No <title> tag found"})
	case len(s.titleText) < 10:
		checks = append(checks, model.SEOCheck{ID: "title", Label: "Page Title", Status: "warning",
			Detail: fmt.Sprintf("Title is very short (%d chars): %q", len(s.titleText), s.titleText)})
	case len(s.titleText) > 60:
		checks = append(checks, model.SEOCheck{ID: "title", Label: "Page Title", Status: "warning",
			Detail: fmt.Sprintf("Title may be truncated in SERPs (%d chars, recommended <=60): %q", len(s.titleText), truncate(s.titleText, 50))})
	default:
		checks = append(checks, model.SEOCheck{ID: "title", Label: "Page Title", Status: "pass",
			Detail: fmt.Sprintf("%q (%d chars)", truncate(s.titleText, 50), len(s.titleText))})
	}

	// Meta description
	switch {
	case s.metaDesc == "":
		checks = append(checks, model.SEOCheck{ID: "meta_desc", Label: "Meta Description", Status: "fail", Detail: "No meta description found — search snippet will be auto-generated"})
	case len(s.metaDesc) < 70:
		checks = append(checks, model.SEOCheck{ID: "meta_desc", Label: "Meta Description", Status: "warning",
			Detail: fmt.Sprintf("Description is short (%d chars, recommended 120-160)", len(s.metaDesc))})
	case len(s.metaDesc) > 160:
		checks = append(checks, model.SEOCheck{ID: "meta_desc", Label: "Meta Description", Status: "warning",
			Detail: fmt.Sprintf("Description may be truncated (%d chars, recommended <=160)", len(s.metaDesc))})
	default:
		checks = append(checks, model.SEOCheck{ID: "meta_desc", Label: "Meta Description", Status: "pass",
			Detail: fmt.Sprintf("%d chars", len(s.metaDesc))})
	}

	// Canonical
	if s.canonicalURL == "" {
		checks = append(checks, model.SEOCheck{ID: "canonical", Label: "Canonical URL", Status: "fail", Detail: "No <link rel=\"canonical\"> tag found"})
	} else {
		checks = append(checks, model.SEOCheck{ID: "canonical", Label: "Canonical URL", Status: "pass",
			Detail: fmt.Sprintf("Canonical set to: %s", truncate(s.canonicalURL, 60))})
	}

	// H1
	switch {
	case s.h1Count == 0:
		checks = append(checks, model.SEOCheck{ID: "h1_count", Label: "H1 Heading", Status: "fail", Detail: "No H1 heading found on the page"})
	case s.h1Count == 1:
		checks = append(checks, model.SEOCheck{ID: "h1_count", Label: "H1 Heading", Status: "pass", Detail: "Exactly one H1 found"})
	case s.h1Count <= 3:
		checks = append(checks, model.SEOCheck{ID: "h1_count", Label: "H1 Heading", Status: "warning",
			Detail: fmt.Sprintf("Multiple H1 tags found (%d) — only one is recommended", s.h1Count)})
	default:
		checks = append(checks, model.SEOCheck{ID: "h1_count", Label: "H1 Heading", Status: "fail",
			Detail: fmt.Sprintf("%d H1 tags found — this confuses crawlers", s.h1Count)})
	}

	// Image alt text
	switch {
	case s.imgTotal == 0:
		checks = append(checks, model.SEOCheck{ID: "img_alt", Label: "Image Alt Text", Status: "pass", Detail: "No images found on the page"})
	case s.imgMissingAlt == 0:
		checks = append(checks, model.SEOCheck{ID: "img_alt", Label: "Image Alt Text", Status: "pass",
			Detail: fmt.Sprintf("All %d images have alt attributes", s.imgTotal)})
	default:
		pct := (s.imgMissingAlt * 100) / s.imgTotal
		status := "warning"
		if pct > 30 {
			status = "fail"
		}
		checks = append(checks, model.SEOCheck{ID: "img_alt", Label: "Image Alt Text", Status: status,
			Detail: fmt.Sprintf("%d of %d images missing alt text (%d%%)", s.imgMissingAlt, s.imgTotal, pct)})
	}

	// Open Graph
	switch {
	case s.ogTitle != "" && s.ogDesc != "" && s.ogImage != "":
		checks = append(checks, model.SEOCheck{ID: "og_tags", Label: "Open Graph Tags", Status: "pass", Detail: "og:title, og:description, and og:image all present"})
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
			Detail: fmt.Sprintf("Partial OG tags — missing: %s", strings.Join(missing, ", "))})
	default:
		checks = append(checks, model.SEOCheck{ID: "og_tags", Label: "Open Graph Tags", Status: "fail", Detail: "No Open Graph tags found — social shares will look poor"})
	}

	// Structured data
	if s.hasSchemaJSON || s.hasMicrodata {
		schemaType := "JSON-LD"
		if s.hasMicrodata && !s.hasSchemaJSON {
			schemaType = "Microdata"
		}
		checks = append(checks, model.SEOCheck{ID: "schema", Label: "Structured Data", Status: "pass",
			Detail: fmt.Sprintf("%s schema detected", schemaType)})
	} else {
		checks = append(checks, model.SEOCheck{ID: "schema", Label: "Structured Data", Status: "fail", Detail: "No JSON-LD or Microdata found — missing rich snippet opportunities"})
	}

	// Viewport
	if s.metaViewport {
		checks = append(checks, model.SEOCheck{ID: "viewport", Label: "Viewport Meta Tag", Status: "pass", Detail: "Viewport tag present"})
	} else {
		checks = append(checks, model.SEOCheck{ID: "viewport", Label: "Viewport Meta Tag", Status: "fail", Detail: "No viewport meta tag — page may not render well on mobile"})
	}

	// Robots
	if s.metaRobotsNoindex {
		checks = append(checks, model.SEOCheck{ID: "robots", Label: "Robots Directive", Status: "fail", Detail: "Page has noindex — it will not appear in search results"})
	} else {
		checks = append(checks, model.SEOCheck{ID: "robots", Label: "Robots Directive", Status: "pass", Detail: "No noindex directive — page is indexable"})
	}

	// Hreflang
	if s.hasHreflang {
		checks = append(checks, model.SEOCheck{ID: "hreflang", Label: "Hreflang Tags", Status: "pass", Detail: "Multilingual/regional targeting configured"})
	} else {
		checks = append(checks, model.SEOCheck{ID: "hreflang", Label: "Hreflang Tags", Status: "warning", Detail: "No hreflang tags — add if you target multiple languages or regions"})
	}

	// Sitemap link
	if s.hasSitemapLink {
		checks = append(checks, model.SEOCheck{ID: "sitemap", Label: "Sitemap Link", Status: "pass", Detail: "Sitemap <link> tag found in <head>"})
	} else {
		checks = append(checks, model.SEOCheck{ID: "sitemap", Label: "Sitemap Link", Status: "warning", Detail: "No <link rel=\"sitemap\"> found — helps crawlers discover your sitemap"})
	}

	return checks
}

// getAttr returns the value of a named attribute from an HTML node.
func getAttr(n *html.Node, key string) string {
	for _, a := range n.Attr {
		if strings.EqualFold(a.Key, key) {
			return a.Val
		}
	}
	return ""
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "..."
}
