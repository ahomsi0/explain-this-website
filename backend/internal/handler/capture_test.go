package handler

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/ahomsi/explain-website/internal/auth"
	"github.com/ahomsi/explain-website/internal/model"
)

const capturedPage = `<!doctype html><html><head><title>Team dashboard</title></head>
<body><h1>Team dashboard</h1><p>Welcome back, Sam.</p>
<a href="https://billing.example.net/portal/one-time">Billing</a></body></html>`

func captureConfig() Config {
	return Config{FetchTimeoutSec: 5, MaxBodyBytes: 1 << 20}
}

// postCapture calls the handler as a signed-in user. The route itself is
// wrapped in RequireSessionAuth; that is covered by the integration test.
func postCapture(t *testing.T, cfg Config, uid int64, body any) *httptest.ResponseRecorder {
	t.Helper()
	raw, err := json.Marshal(body)
	if err != nil {
		t.Fatalf("marshal body: %v", err)
	}
	req := httptest.NewRequest(http.MethodPost, "/api/analyze-capture", strings.NewReader(string(raw)))
	req = req.WithContext(auth.WithUserID(req.Context(), uid))
	rec := httptest.NewRecorder()
	CaptureHandler(cfg)(rec, req)
	return rec
}

func getReport(t *testing.T, id string, uid int64) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, "/api/report/"+id, nil)
	req.SetPathValue("id", id)
	if uid != 0 {
		req = req.WithContext(auth.WithUserID(req.Context(), uid))
	}
	rec := httptest.NewRecorder()
	ReportHandler()(rec, req)
	return rec
}

func TestCaptureAnalysesThePageTheBrowserSent(t *testing.T) {
	const owner = 9101
	rec := postCapture(t, captureConfig(), owner, map[string]any{
		"url":    "https://app.internal.example/team#tab",
		"html":   capturedPage,
		"source": "browser",
		"headers": map[string]string{
			"strict-transport-security": "max-age=63072000",
			"x-powered-by":              "Express",
			"set-cookie":                "session=secret",
			"x-internal-trace":          "abc",
		},
		"timings": map[string]any{"ttfbMs": 120, "loadMs": 1800, "lcpMs": 900, "cls": 0.02, "hasCls": true, "requests": 41, "transferBytes": 512000},
	})
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body = %s", rec.Code, rec.Body.String())
	}

	var result model.AnalysisResult
	if err := json.Unmarshal(rec.Body.Bytes(), &result); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if result.URL != "https://app.internal.example/team" {
		t.Errorf("url = %q, want the page URL without its fragment", result.URL)
	}
	if result.Overview.Title != "Team dashboard" {
		t.Errorf("title = %q, want the captured page's title", result.Overview.Title)
	}
	if result.ReportID == "" {
		t.Fatal("the owner needs a report ID to open the report")
	}
	if result.Capture == nil || result.Capture.Source != "browser" || !result.Capture.HasHeaders {
		t.Fatalf("capture = %+v, want a browser capture with headers", result.Capture)
	}
	if got := result.Capture.Timings; got == nil || got.LoadMs != 1800 || got.LCPMs != 900 || !got.HasCLS || got.Requests != 41 {
		t.Errorf("timings = %+v, want the browser's own measurements", got)
	}
	if result.AISummary != "" {
		t.Error("captured pages must not be sent to the AI summary")
	}
	if result.Performance != nil {
		t.Error("captured pages have no Lighthouse run")
	}
	if result.LinkCheck.Checked != 0 {
		t.Error("links inside a captured page must never be requested")
	}

	hsts := false
	for _, check := range result.SecurityHeaders {
		if check.ID == "hsts" && check.Status == "pass" {
			hsts = true
		}
	}
	if !hsts {
		t.Errorf("security headers = %+v, want the supplied HSTS header counted as present", result.SecurityHeaders)
	}

	// Only the account that captured the page can open the report.
	if rec := getReport(t, result.ReportID, owner); rec.Code != http.StatusOK {
		t.Errorf("owner status = %d, want 200", rec.Code)
	}
	if rec := getReport(t, result.ReportID, 0); rec.Code != http.StatusNotFound {
		t.Errorf("anonymous status = %d, want 404", rec.Code)
	}
	if rec := getReport(t, result.ReportID, owner+1); rec.Code != http.StatusNotFound {
		t.Errorf("other account status = %d, want 404", rec.Code)
	}
}

func TestCapturedHeadersKeepOnlyTheAllowlist(t *testing.T) {
	got := capturedHeaders(map[string]string{
		"Content-Security-Policy": "default-src 'self'",
		"SERVER":                  "nginx",
		"Set-Cookie":              "session=secret",
		"Authorization":           "Bearer token",
		"X-Frame-Options":         strings.Repeat("a", maxCapturedHeaderValue+50),
	})
	if got.Get("Content-Security-Policy") == "" || got.Get("Server") != "nginx" {
		t.Errorf("allowlisted headers were dropped: %v", got)
	}
	if got.Get("Set-Cookie") != "" || got.Get("Authorization") != "" {
		t.Errorf("credentials must never be kept: %v", got)
	}
	if n := len(got.Get("X-Frame-Options")); n != maxCapturedHeaderValue {
		t.Errorf("header value length = %d, want it capped at %d", n, maxCapturedHeaderValue)
	}
}

func TestPastedSourceHasNoSecurityAudit(t *testing.T) {
	rec := postCapture(t, captureConfig(), 9102, map[string]any{
		"url": "app.example.com/settings", "html": capturedPage, "source": "paste",
	})
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body = %s", rec.Code, rec.Body.String())
	}
	var result model.AnalysisResult
	if err := json.Unmarshal(rec.Body.Bytes(), &result); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if result.Capture == nil || result.Capture.Source != "paste" || result.Capture.HasHeaders {
		t.Fatalf("capture = %+v, want a paste without headers", result.Capture)
	}
	if len(result.SecurityHeaders) != 0 {
		t.Errorf("without real headers every check would be a guess; got %+v", result.SecurityHeaders)
	}
}

func TestCaptureRejectsBadInput(t *testing.T) {
	cfg := Config{FetchTimeoutSec: 5, MaxBodyBytes: 2048}
	cases := []struct {
		name string
		body map[string]any
		want int
	}{
		{"missing url", map[string]any{"html": capturedPage}, http.StatusUnprocessableEntity},
		{"non-web url", map[string]any{"url": "file:///etc/passwd", "html": capturedPage}, http.StatusUnprocessableEntity},
		{"empty page", map[string]any{"url": "https://app.example.com", "html": "   "}, http.StatusUnprocessableEntity},
		{"page over the limit", map[string]any{"url": "https://app.example.com", "html": strings.Repeat("a", 3000)}, http.StatusRequestEntityTooLarge},
		{"body over the limit", map[string]any{"url": "https://app.example.com", "html": strings.Repeat("a", 80_000)}, http.StatusRequestEntityTooLarge},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			rec := postCapture(t, cfg, 9103, tc.body)
			if rec.Code != tc.want {
				t.Fatalf("status = %d, want %d; body = %s", rec.Code, tc.want, rec.Body.String())
			}
		})
	}
}

func TestSanitizeTimingsDropsNonsense(t *testing.T) {
	if got := sanitizeTimings(nil); got != nil {
		t.Errorf("nil timings = %+v, want nil", got)
	}
	if got := sanitizeTimings(&model.BrowserTimings{LoadMs: -5, LCPMs: maxTimingMs + 1, CLS: 0.4}); got != nil {
		t.Errorf("out-of-range timings = %+v, want nil", got)
	}
	got := sanitizeTimings(&model.BrowserTimings{LoadMs: 2500, CLS: 500, HasCLS: true, Requests: -3})
	if got == nil || got.LoadMs != 2500 || got.HasCLS || got.Requests != 0 {
		t.Errorf("timings = %+v, want only the plausible load time kept", got)
	}
}
