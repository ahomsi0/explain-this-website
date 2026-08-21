package parser

import (
	"strings"
	"testing"

	"golang.org/x/net/html"
)

func TestAssessRenderingFlagsSparseClientShell(t *testing.T) {
	doc, err := html.Parse(strings.NewReader(`<!doctype html><html><body><div id="root"></div><script src="app.js"></script><script>boot()</script></body></html>`))
	if err != nil {
		t.Fatal(err)
	}
	info := AssessRendering(doc, "")
	if !info.LikelyClientRendered || info.Notice == "" {
		t.Fatalf("expected sparse client shell warning, got %+v", info)
	}
}

func TestAssessRenderingLeavesContentfulPageUnflagged(t *testing.T) {
	doc, err := html.Parse(strings.NewReader(`<!doctype html><html><body><h1>Page title</h1><p>Lots of useful content</p><script src="app.js"></script></body></html>`))
	if err != nil {
		t.Fatal(err)
	}
	info := AssessRendering(doc, "Page title Lots of useful content")
	if info.LikelyClientRendered {
		t.Fatalf("did not expect warning for contentful page: %+v", info)
	}
}
