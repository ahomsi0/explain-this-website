package parser

import (
	"context"
	"fmt"
	"net/http"
	"net/http/httptest"
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
	result := CheckLinks(context.Background(), doc, "https://example.com")
	if result.Checked != 0 {
		t.Errorf("expected 0 checked, got %d", result.Checked)
	}
}

func TestCheckLinks_RejectsPrivateTargets(t *testing.T) {
	requests := 0
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests++
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	doc, _ := html.Parse(strings.NewReader(fmt.Sprintf(`<html><body><a href="%s/private">internal</a></body></html>`, server.URL)))
	result := CheckLinks(context.Background(), doc, "https://example.com")

	if result.Checked != 1 || result.Broken != 1 {
		t.Fatalf("expected private target to be reported as broken, got %+v", result)
	}
	if requests != 0 {
		t.Fatalf("private target received %d requests", requests)
	}
}
