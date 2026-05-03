package parser

import (
	"strings"
	"testing"

	"golang.org/x/net/html"
)

func TestExtractFontAudit_GoogleFonts(t *testing.T) {
	rawHTML := `<html><head>
		<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap">
	</head></html>`
	doc, _ := html.Parse(strings.NewReader(rawHTML))
	result := ExtractFontAudit(doc, rawHTML)
	if result.TotalFamilies != 1 {
		t.Fatalf("expected 1 family, got %d", result.TotalFamilies)
	}
	if result.Families[0].Family != "Inter" {
		t.Errorf("expected Inter, got %q", result.Families[0].Family)
	}
	if result.Families[0].Source != "Google Fonts" {
		t.Errorf("expected Google Fonts, got %q", result.Families[0].Source)
	}
	if len(result.Families[0].Weights) != 3 {
		t.Errorf("expected 3 weights, got %d", len(result.Families[0].Weights))
	}
}

func TestExtractFontAudit_MultipleFamilies_PerfIssue(t *testing.T) {
	rawHTML := `<html><head>
		<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400&family=Roboto:wght@400&family=Open+Sans:wght@400&family=Lato:wght@400">
	</head></html>`
	doc, _ := html.Parse(strings.NewReader(rawHTML))
	result := ExtractFontAudit(doc, rawHTML)
	if result.TotalFamilies != 4 {
		t.Fatalf("expected 4 families, got %d", result.TotalFamilies)
	}
	if !result.HasPerfIssue {
		t.Error("expected HasPerfIssue=true for 4 families")
	}
}

func TestExtractFontAudit_NoFonts(t *testing.T) {
	rawHTML := `<html><head><title>Plain</title></head><body>Hello</body></html>`
	doc, _ := html.Parse(strings.NewReader(rawHTML))
	result := ExtractFontAudit(doc, rawHTML)
	if result.TotalFamilies != 0 {
		t.Errorf("expected 0 families, got %d", result.TotalFamilies)
	}
	if result.HasPerfIssue {
		t.Error("expected HasPerfIssue=false for no fonts")
	}
}
