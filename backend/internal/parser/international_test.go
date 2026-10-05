package parser

import (
	"strings"
	"testing"

	"github.com/ahomsi/explain-website/internal/model"
	"golang.org/x/net/html"
)

func intlCheck(t *testing.T, raw, sourceURL string) model.SEOCheck {
	t.Helper()
	doc, err := html.Parse(strings.NewReader(raw))
	if err != nil {
		t.Fatal(err)
	}
	for _, c := range auditSEO(doc, raw, sourceURL) {
		if c.ID == "international" {
			return c
		}
	}
	t.Fatal("international check missing from auditSEO output")
	return model.SEOCheck{}
}

func page(htmlAttrs, head string) string {
	return `<!doctype html><html ` + htmlAttrs + `><head><title>T</title>` + head + `</head><body><h1>Hi</h1></body></html>`
}

func joined(c model.SEOCheck) string { return strings.Join(c.Details, " | ") }

func TestInternationalSingleLanguageSitePasses(t *testing.T) {
	c := intlCheck(t, page(`lang="en"`, `<meta property="og:locale" content="en_US">`), "https://example.com/")
	if c.Status != "pass" || !c.Optional {
		t.Fatalf("want optional pass, got %+v", c)
	}
	if !strings.Contains(c.Detail, "en") {
		t.Fatalf("detail should mention the language: %q", c.Detail)
	}
}

func TestInternationalWellFormedMultilingualPasses(t *testing.T) {
	head := `<link rel="canonical" href="https://example.com/en/">
<link rel="alternate" hreflang="en" href="https://example.com/en/">
<link rel="alternate" hreflang="fr-CA" href="https://example.com/fr-ca/">
<link rel="alternate" hreflang="x-default" href="https://example.com/">
<meta property="og:locale" content="en_GB">`
	c := intlCheck(t, page(`lang="en-GB"`, head), "https://example.com/en/")
	if c.Status != "pass" {
		t.Fatalf("want pass, got %+v (%s)", c, joined(c))
	}
}

func TestInternationalIssues(t *testing.T) {
	selfEn := `<link rel="alternate" hreflang="en" href="https://example.com/">`
	xdef := `<link rel="alternate" hreflang="x-default" href="https://example.com/">`
	cases := []struct {
		name, raw, want string
	}{
		{"missing lang", page(``, ``), "no lang attribute"},
		{"malformed lang", page(`lang="english"`, ``), "not a valid language code"},
		{"underscore hreflang", page(`lang="en"`, selfEn+xdef+`<link rel="alternate" hreflang="en_US" href="https://example.com/us">`), `"en_US"`},
		{"word hreflang", page(`lang="en"`, selfEn+xdef+`<link rel="alternate" hreflang="french" href="https://example.com/fr">`), `"french"`},
		{"relative hreflang url", page(`lang="en"`, `<link rel="alternate" hreflang="en" href="/en/">`+xdef), "absolute"},
		{"no self reference", page(`lang="en"`, `<link rel="alternate" hreflang="en" href="https://example.com/other">`+xdef), "points to this page"},
		{"no x-default", page(`lang="en"`, selfEn+`<link rel="alternate" hreflang="de" href="https://example.com/de">`), "x-default"},
		{"duplicate hreflang", page(`lang="en"`, selfEn+xdef+`<link rel="alternate" hreflang="en" href="https://example.com/dup">`), "more than once"},
		{"lang has no hreflang", page(`lang="fr"`, selfEn+xdef), "no hreflang entry for"},
		{"locale mismatch", page(`lang="fr"`, `<meta property="og:locale" content="en_US">`), "og:locale"},
		{"locale hyphen", page(`lang="en"`, `<meta property="og:locale" content="en-US">`), "underscore"},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			c := intlCheck(t, tc.raw, "https://example.com/")
			if c.Status != "warning" || !c.Optional {
				t.Fatalf("want optional warning, got %+v", c)
			}
			if !strings.Contains(joined(c), tc.want) {
				t.Fatalf("details %q should contain %q", joined(c), tc.want)
			}
		})
	}
}

func TestInternationalSelfReferenceIgnoresTrailingSlashAndFragment(t *testing.T) {
	head := `<link rel="alternate" hreflang="en" href="https://example.com/page#top">
<link rel="alternate" hreflang="x-default" href="https://example.com/page">`
	c := intlCheck(t, page(`lang="en"`, head), "https://example.com/page/")
	if c.Status != "pass" {
		t.Fatalf("want pass, got %+v (%s)", c, joined(c))
	}
}
