package parser

import (
	"strings"
	"testing"

	"golang.org/x/net/html"
)

func TestCheckIntentAlignment_PricingMatch(t *testing.T) {
	rawHTML := `<html><head>
		<title>Widget Pricing Plans</title>
		<meta name="description" content="Affordable pricing for every team">
	</head><body><p>Plans start at $9/month.</p></body></html>`
	doc, _ := html.Parse(strings.NewReader(rawHTML))
	result := CheckIntentAlignment(doc, rawHTML)

	var found *bool
	for _, c := range result.Checks {
		if strings.Contains(strings.ToLower(c.Signal), "price") {
			b := c.Found
			found = &b
			break
		}
	}
	if found != nil && !*found {
		t.Error("pricing check should pass when page has price elements")
	}
}

func TestCheckIntentAlignment_ScoreRange(t *testing.T) {
	doc, _ := html.Parse(strings.NewReader("<html><head><title>X</title></head><body></body></html>"))
	result := CheckIntentAlignment(doc, "")
	if result.Score < 0 || result.Score > 100 {
		t.Errorf("score out of range: %d", result.Score)
	}
}
