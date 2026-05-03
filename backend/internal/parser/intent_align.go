package parser

import (
	"regexp"
	"strings"

	"github.com/ahomsi/explain-website/internal/model"
	"golang.org/x/net/html"
)

type intentRule struct {
	keywords []string
	claim    string
	signal   string
	check    func(body, rawHTML string) bool
}

var rePrice = regexp.MustCompile(`(?i)(\$[\d,]+|£[\d,]+|€[\d,]+|\d+\s*(USD|EUR|GBP)|per\s+month|\/month|\/year|per\s+year)`)
var reStars = regexp.MustCompile(`(?i)(\d(\.\d)?\s*stars?|★|☆|\d\/5|\d\/10|out of \d|rated \d)`)
var reSteps = regexp.MustCompile(`(?i)(step\s+\d|^\d+\.\s|\n\d+\.\s)`)

var intentRules = []intentRule{
	{
		keywords: []string{"pricing", "price", "plans", "cost"},
		claim:    "Title/meta mentions pricing",
		signal:   "Price elements in body ($, /month, per year)",
		check:    func(body, _ string) bool { return rePrice.MatchString(body) },
	},
	{
		keywords: []string{"best", "top", "vs", "versus", "compare", "comparison", "alternatives"},
		claim:    "Title/meta implies comparison",
		signal:   "Comparison table or competitor names in body",
		check: func(body, rawHTML string) bool {
			lower := strings.ToLower(rawHTML)
			return strings.Contains(lower, "<table") ||
				strings.Contains(lower, "vs.") ||
				strings.Contains(lower, " vs ") ||
				strings.Contains(lower, "compared to") ||
				strings.Contains(lower, "alternative")
		},
	},
	{
		keywords: []string{"review", "reviews", "rating", "rated"},
		claim:    "Title/meta promises reviews",
		signal:   "Star ratings or review text in body",
		check:    func(body, _ string) bool { return reStars.MatchString(body) },
	},
	{
		keywords: []string{"tutorial", "guide", "how to", "how-to", "step by step", "steps"},
		claim:    "Title/meta promises a guide/tutorial",
		signal:   "Numbered steps or ordered list in body",
		check: func(body, rawHTML string) bool {
			return reSteps.MatchString(body) || strings.Contains(strings.ToLower(rawHTML), "<ol")
		},
	},
	{
		keywords: []string{"free"},
		claim:    "Title/meta says 'free'",
		signal:   "'Free' appears prominently in body",
		check: func(body, _ string) bool {
			return strings.Contains(strings.ToLower(body), "free")
		},
	},
	{
		keywords: []string{"download", "get started", "sign up", "signup"},
		claim:    "Title/meta has a call-to-action",
		signal:   "CTA button or form present in page",
		check: func(_, rawHTML string) bool {
			lower := strings.ToLower(rawHTML)
			return strings.Contains(lower, "<form") || strings.Contains(lower, "<button")
		},
	},
}

// CheckIntentAlignment checks whether page content supports what the title/meta claim.
func CheckIntentAlignment(doc *html.Node, rawHTML string) model.IntentAlignment {
	title, metaDesc := extractTitleAndMeta(doc)
	combined := strings.ToLower(title + " " + metaDesc)
	visText := extractVisibleText(doc)

	var checks []model.IntentCheck
	for _, rule := range intentRules {
		triggered := false
		for _, kw := range rule.keywords {
			if strings.Contains(combined, kw) {
				triggered = true
				break
			}
		}
		if !triggered {
			continue
		}
		found := rule.check(visText, rawHTML)
		checks = append(checks, model.IntentCheck{
			Claim:  rule.claim,
			Signal: rule.signal,
			Found:  found,
		})
	}

	score := 100
	if len(checks) > 0 {
		pass := 0
		for _, c := range checks {
			if c.Found {
				pass++
			}
		}
		score = pass * 100 / len(checks)
	}

	if checks == nil {
		checks = []model.IntentCheck{}
	}
	return model.IntentAlignment{Score: score, Checks: checks}
}

// extractTitleAndMeta pulls the <title> and meta description from the parsed doc.
func extractTitleAndMeta(doc *html.Node) (title, metaDesc string) {
	var walk func(*html.Node)
	walk = func(n *html.Node) {
		if n.Type == html.ElementNode {
			switch strings.ToLower(n.Data) {
			case "title":
				if n.FirstChild != nil {
					title = strings.TrimSpace(n.FirstChild.Data)
				}
			case "meta":
				name := strings.ToLower(getAttr(n, "name"))
				if name == "description" {
					metaDesc = getAttr(n, "content")
				}
			}
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			walk(c)
		}
	}
	walk(doc)
	return
}
