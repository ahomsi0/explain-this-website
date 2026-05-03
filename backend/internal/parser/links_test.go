package parser

import (
	"strings"
	"testing"

	"golang.org/x/net/html"
)

func TestExtractExternalLinks(t *testing.T) {
	rawHTML := `<html><body>
		<a href="https://twitter.com/foo">Twitter</a>
		<a href="https://github.com/bar">GitHub</a>
		<a href="/internal">Internal</a>
		<a href="#anchor">Anchor</a>
		<a href="mailto:a@b.com">Email</a>
		<a href="https://example.com/page">Same host</a>
	</body></html>`

	doc, _ := html.Parse(strings.NewReader(rawHTML))
	links := extractExternalLinks(doc, "https://example.com")

	if len(links) != 2 {
		t.Errorf("expected 2 external links (twitter, github), got %d: %v", len(links), links)
	}
}

func TestCheckLinks_Empty(t *testing.T) {
	doc, _ := html.Parse(strings.NewReader("<html><body></body></html>"))
	result := CheckLinks(doc, "https://example.com")
	if result.Checked != 0 {
		t.Errorf("expected 0 checked, got %d", result.Checked)
	}
}
