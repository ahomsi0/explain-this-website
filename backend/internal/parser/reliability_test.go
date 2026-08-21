package parser

import (
	"strings"
	"testing"

	"github.com/ahomsi/explain-website/internal/model"
	"golang.org/x/net/html"
)

func TestVisibleAndUXSignalsIgnoreHiddenContent(t *testing.T) {
	rawHTML := `<html><body>
		<div hidden>
			<h1>Hidden heading</h1><a href="/buy">Buy now</a>
			<form><input type="email"><button>Subscribe to our newsletter</button></form>
			<img src="hidden.png">
		</div>
		<div style="display : none"><p>Hidden words should not count</p></div>
		<script>const hiddenSignals = "award secure testimonial +1 (555) 123-4567";</script>
		<h1>Visible heading</h1><p>Visible content remains in the report.</p>
		<a href="//cdn.example.net/asset">External asset</a>
	</body></html>`
	doc, err := html.Parse(strings.NewReader(rawHTML))
	if err != nil {
		t.Fatal(err)
	}

	visible := extractVisibleText(doc)
	if strings.Contains(visible, "Hidden") || strings.Contains(visible, "Subscribe") {
		t.Fatalf("hidden content leaked into visible text: %q", visible)
	}

	stats := computePageStats(doc, "https://example.com", rawHTML)
	if stats.H1Count != 1 || stats.ImageCount != 0 || stats.ExternalLinks != 1 || stats.InternalLinks != 0 {
		t.Fatalf("hidden structural content was counted: %+v", stats)
	}

	ux := analyzeUX(doc, rawHTML)
	if ux.HasCTA || ux.HasForms || ux.HasNewsletterSignup || ux.HasTrustSignals || ux.HasSocialProof || ux.HasContactInfo {
		t.Fatalf("hidden UX signals were counted: %+v", ux)
	}
}

func TestSEODoesNotCallHTTPAnchorsMixedContent(t *testing.T) {
	rawHTML := `<html><head><title>Example title</title></head><body>
		<a href="http://external.example.org/article">HTTP link</a>
		<script src="http://cdn.example.org/app.js"></script>
	</body></html>`
	doc, err := html.Parse(strings.NewReader(rawHTML))
	if err != nil {
		t.Fatal(err)
	}

	checks := auditSEO(doc, rawHTML, "https://example.com")
	mixed := checkByID(checks, "mixed_content")
	if mixed == nil || mixed.Status != "warning" {
		t.Fatalf("expected mixed-content warning for the script resource, got %+v", mixed)
	}
	for _, detail := range mixed.Details {
		if strings.Contains(detail, "article") {
			t.Fatalf("ordinary HTTP anchor was incorrectly reported as mixed content: %+v", mixed.Details)
		}
	}
}

func TestSEORequiresValidJSONLDAndRecognizesBooleanMicrodata(t *testing.T) {
	invalid := `<html><head><script type="application/ld+json">not json</script></head><body></body></html>`
	doc, _ := html.Parse(strings.NewReader(invalid))
	invalidCheck := checkByID(auditSEO(doc, invalid, "https://example.com"), "schema")
	if invalidCheck == nil || invalidCheck.Status != "warning" || !invalidCheck.Optional {
		t.Fatalf("invalid JSON-LD should be an optional warning, got %+v", invalidCheck)
	}

	validMicrodata := `<html><body><div itemscope itemtype="https://schema.org/Article"></div></body></html>`
	doc, _ = html.Parse(strings.NewReader(validMicrodata))
	if checkByID(auditSEO(doc, validMicrodata, "https://example.com"), "schema").Status != "pass" {
		t.Fatal("boolean/typed microdata should count as structured data")
	}
}

func TestSEOWithOnlyOGImageReportsPartialTags(t *testing.T) {
	rawHTML := `<html><head><meta property="og:image" content="https://example.com/image.png"></head></html>`
	doc, _ := html.Parse(strings.NewReader(rawHTML))
	check := checkByID(auditSEO(doc, rawHTML, "https://example.com"), "og_tags")
	if check == nil || check.Status != "warning" {
		t.Fatalf("expected partial OG warning, got %+v", check)
	}
}

func TestSEORejectsInvalidCanonicalAndAcceptsMixedRelTokens(t *testing.T) {
	rawHTML := `<html><head>
		<link rel="alternate canonical" href="javascript:void(0)">
		<link rel="alternate" hreflang="fr" href="https://example.com/fr">
	</head></html>`
	doc, _ := html.Parse(strings.NewReader(rawHTML))
	checks := auditSEO(doc, rawHTML, "https://example.com")
	canonical := checkByID(checks, "canonical")
	if canonical == nil || canonical.Status != "warning" {
		t.Fatalf("invalid canonical should warn, got %+v", canonical)
	}
	hreflang := checkByID(checks, "hreflang")
	if hreflang == nil || hreflang.Status != "pass" {
		t.Fatalf("alternate hreflang link should pass, got %+v", hreflang)
	}
}

func checkByID(checks []model.SEOCheck, id string) *model.SEOCheck {
	for i := range checks {
		if checks[i].ID == id {
			return &checks[i]
		}
	}
	return nil
}
