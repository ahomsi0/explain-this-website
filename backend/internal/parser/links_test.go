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

func TestExtractExternalLinksResolvesRelativeAndProtocolRelativeURLs(t *testing.T) {
	rawHTML := `<html><body>
		<a href="/internal">Internal</a>
		<a href="about">Relative internal</a>
		<a href="https://EXAMPLE.com/other">Same host, different case</a>
		<a href="//cdn.example.net/asset">Protocol-relative external</a>
		<a href="http://outside.example.org/page?x=1#section">External</a>
	</body></html>`

	doc, _ := html.Parse(strings.NewReader(rawHTML))
	links := extractExternalLinks(doc, "https://example.com")
	if len(links) != 2 {
		t.Fatalf("expected 2 external links, got %d: %v", len(links), links)
	}
	for _, link := range links {
		if strings.Contains(link, "#section") {
			t.Fatalf("expected fragments to be removed from probe URL: %q", link)
		}
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

	if result.Checked != 1 || result.Broken != 0 || result.Unverified != 1 {
		t.Fatalf("expected private target to be reported as unverified, got %+v", result)
	}
	if requests != 0 {
		t.Fatalf("private target received %d requests", requests)
	}
}

func TestCheckLinks_CanceledContextDoesNotReportUnprobedLinks(t *testing.T) {
	doc, _ := html.Parse(strings.NewReader(`<html><body><a href="https://external.example.org">External</a></body></html>`))
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	result := CheckLinks(ctx, doc, "https://example.com")
	if result.Checked != 0 || result.Broken != 0 || len(result.Items) != 0 {
		t.Fatalf("expected no probes after cancellation, got %+v", result)
	}
}

// withLinkClient swaps the SSRF-guarded probe client for one that can reach a
// local httptest server, restoring it afterwards.
func withLinkClient(t *testing.T, c *http.Client) {
	t.Helper()
	old := linkClient
	linkClient = c
	t.Cleanup(func() { linkClient = old })
}

func TestProbeLink(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/head405":
			if r.Method == http.MethodHead {
				w.WriteHeader(http.StatusMethodNotAllowed)
				return
			}
		case "/head500":
			if r.Method == http.MethodHead {
				w.WriteHeader(http.StatusInternalServerError)
				return
			}
		case "/gone":
			w.WriteHeader(http.StatusNotFound)
			return
		case "/broken":
			w.WriteHeader(http.StatusBadGateway)
			return
		case "/limited":
			w.WriteHeader(http.StatusTooManyRequests)
			return
		}
		w.WriteHeader(http.StatusOK)
	}))
	defer server.Close()
	withLinkClient(t, server.Client())

	cases := []struct {
		path       string
		wantBroken bool
		wantReason string
		wantStatus int
	}{
		{"/ok", false, "", 200},
		{"/head405", false, "", 200},
		{"/head500", false, "", 200},
		{"/gone", true, reasonNotFound, 404},
		{"/broken", true, reasonServerError, 502},
		{"/limited", false, reasonBlocked, 429},
	}
	for _, tc := range cases {
		t.Run(tc.path, func(t *testing.T) {
			item := probeLink(context.Background(), server.URL+tc.path)
			if item.IsBroken != tc.wantBroken || item.Reason != tc.wantReason || item.Status != tc.wantStatus {
				t.Fatalf("got %+v", item)
			}
		})
	}
}

func TestProbeLinkUnreachableIsNotBroken(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {}))
	client := server.Client()
	url := server.URL
	server.Close() // connections now refused
	withLinkClient(t, client)

	item := probeLink(context.Background(), url)
	if item.IsBroken || item.Reason != reasonUnreachable || item.Status != 0 {
		t.Fatalf("expected unreachable and not broken, got %+v", item)
	}
}

func TestCheckLinksCountsAndAnchorText(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/gone":
			w.WriteHeader(http.StatusNotFound)
		case "/limited":
			w.WriteHeader(http.StatusTooManyRequests)
		default:
			w.WriteHeader(http.StatusOK)
		}
	}))
	defer server.Close()
	withLinkClient(t, server.Client())

	body := fmt.Sprintf(`<html><body>
		<a href="%[1]s/ok">Good page</a>
		<a href="%[1]s/gone">  Gone
		   page </a>
		<a href="%[1]s/limited">Rate limited</a>
	</body></html>`, server.URL)
	doc, _ := html.Parse(strings.NewReader(body))
	result := CheckLinks(context.Background(), doc, "https://example.com")

	if result.Checked != 3 || result.OK != 1 || result.Broken != 1 || result.Unverified != 1 {
		t.Fatalf("unexpected counts: %+v", result)
	}
	if got := result.Items[1].Text; got != "Gone page" {
		t.Fatalf("anchor text = %q, want %q", got, "Gone page")
	}
	if !result.Items[1].IsBroken || result.Items[2].IsBroken {
		t.Fatalf("broken flags wrong: %+v", result.Items)
	}
}
