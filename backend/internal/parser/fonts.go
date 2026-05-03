package parser

import (
	"net/url"
	"regexp"
	"strings"

	"github.com/ahomsi/explain-website/internal/model"
	"golang.org/x/net/html"
)

var reFontFace = regexp.MustCompile(`(?i)@font-face\s*\{[^}]*font-family\s*:\s*['"]?([^'";}\n]+)['"]?`)
var reFontWeight = regexp.MustCompile(`(?i)font-weight\s*:\s*([0-9]+)`)

// ExtractFontAudit detects web fonts used on the page from link tags and inline CSS.
func ExtractFontAudit(doc *html.Node, rawHTML string) model.FontAudit {
	var entries []model.FontEntry

	// Walk the HTML tree for <link> tags.
	var walk func(*html.Node)
	walk = func(n *html.Node) {
		if n.Type == html.ElementNode && n.Data == "link" {
			href := getAttr(n, "href")
			rel := strings.ToLower(getAttr(n, "rel"))
			if rel != "stylesheet" && rel != "preload" {
				goto children
			}
			if strings.Contains(href, "fonts.googleapis.com") {
				entries = append(entries, parseGoogleFontsURL(href, "Google Fonts")...)
			} else if strings.Contains(href, "fonts.bunny.net") {
				entries = append(entries, parseGoogleFontsURL(href, "Bunny Fonts")...)
			} else if strings.Contains(href, "use.typekit.net") || strings.Contains(href, "use.typekit.com") {
				entries = append(entries, model.FontEntry{Family: "Adobe Fonts (Typekit)", Source: "Adobe Fonts"})
			}
		}
		if n.Type == html.ElementNode && n.Data == "script" {
			src := getAttr(n, "src")
			if strings.Contains(src, "use.typekit.net") {
				entries = append(entries, model.FontEntry{Family: "Adobe Fonts (Typekit)", Source: "Adobe Fonts"})
			}
		}
	children:
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			walk(c)
		}
	}
	walk(doc)

	// Scan rawHTML for @font-face blocks.
	for _, m := range reFontFace.FindAllStringSubmatch(rawHTML, -1) {
		family := strings.Trim(strings.TrimSpace(m[1]), `'"`)
		// Find weight in the full block match.
		block := m[0]
		var weights []string
		for _, wm := range reFontWeight.FindAllStringSubmatch(block, -1) {
			weights = append(weights, wm[1])
		}
		entries = append(entries, model.FontEntry{
			Family:  family,
			Source:  "Custom/Self-hosted",
			Weights: weights,
		})
	}

	// Deduplicate by family name (case-insensitive).
	seen := map[string]bool{}
	var unique []model.FontEntry
	for _, e := range entries {
		key := strings.ToLower(e.Family)
		if !seen[key] {
			seen[key] = true
			unique = append(unique, e)
		}
	}
	if unique == nil {
		unique = []model.FontEntry{}
	}
	// Normalize nil Weights slices to empty arrays so JSON serializes as [] not null.
	for i := range unique {
		if unique[i].Weights == nil {
			unique[i].Weights = []string{}
		}
	}

	totalWeights := 0
	for _, e := range unique {
		if len(e.Weights) > 0 {
			totalWeights += len(e.Weights)
		} else {
			totalWeights++ // count as 1 unknown weight
		}
	}

	return model.FontAudit{
		Families:      unique,
		TotalFamilies: len(unique),
		TotalWeights:  totalWeights,
		HasPerfIssue:  len(unique) > 3 || totalWeights > 6,
	}
}

// parseGoogleFontsURL extracts font families and weights from a Google/Bunny Fonts URL.
// Handles both CSS2 (?family=Inter:wght@400;700) and CSS1 (?family=Inter|Roboto) formats.
func parseGoogleFontsURL(rawURL, source string) []model.FontEntry {
	u, err := url.Parse(rawURL)
	if err != nil {
		return nil
	}

	// Use RawQuery to avoid Go's url.Query() treating semicolons as param separators.
	// Google Fonts CSS2 URLs use semicolons as weight separators: wght@400;500;700
	var families []string
	for _, part := range strings.Split(u.RawQuery, "&") {
		if strings.HasPrefix(part, "family=") {
			val := strings.TrimPrefix(part, "family=")
			if decoded, decErr := url.QueryUnescape(val); decErr == nil {
				val = decoded
			}
			families = append(families, val)
		}
	}

	// CSS1: single ?family=Inter|Roboto param
	if len(families) == 1 && strings.Contains(families[0], "|") {
		parts := strings.Split(families[0], "|")
		families = parts
	}

	var entries []model.FontEntry
	for _, f := range families {
		// f may be "Inter:wght@400;500;700" or just "Inter"
		var family string
		var weights []string
		if idx := strings.Index(f, ":"); idx != -1 {
			family = strings.TrimSpace(f[:idx])
			weightsPart := f[idx+1:]
			// strip "wght@", "ital,wght@" etc.
			if at := strings.Index(weightsPart, "@"); at != -1 {
				weightsPart = weightsPart[at+1:]
			}
			// "400;500;700" or "400,700" (ital format uses comma)
			for _, w := range strings.FieldsFunc(weightsPart, func(r rune) bool { return r == ';' || r == ',' }) {
				// italic variants look like "0,400" — take the weight part
				if idx2 := strings.LastIndex(w, ","); idx2 != -1 {
					w = w[idx2+1:]
				}
				w = strings.TrimSpace(w)
				if w != "" {
					weights = append(weights, w)
				}
			}
		} else {
			family = strings.TrimSpace(f)
		}
		family = strings.ReplaceAll(family, "+", " ")
		if family != "" {
			entries = append(entries, model.FontEntry{Family: family, Source: source, Weights: weights})
		}
	}
	return entries
}
