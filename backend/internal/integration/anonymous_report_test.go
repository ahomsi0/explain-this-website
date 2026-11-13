package integration

import (
	"context"
	"net/http"
	"net/http/httptest"
	"regexp"
	"testing"
	"time"

	"github.com/ahomsi/explain-website/internal/config"
	"github.com/ahomsi/explain-website/internal/handler"
	"github.com/ahomsi/explain-website/internal/model"
	"github.com/ahomsi/explain-website/internal/server"
)

// A report run without an account must come back with its own link, and that
// link must open for someone else: it is the report's address in the app and
// the thing visitors share. Runs without a database (anonymous-only mode).
func TestAnonymousAnalysisReturnsAPublicReportLink(t *testing.T) {
	cfg := config.Config{
		AllowedOrigin:   "http://frontend.test",
		FetchTimeoutSec: 5,
		MaxBodyBytes:    1 << 20,
	}
	apiConfig := handler.Config{
		FetchTimeoutSec: cfg.FetchTimeoutSec,
		MaxBodyBytes:    cfg.MaxBodyBytes,
		FetchHTML: func(context.Context, string, int64) (string, http.Header, error) {
			return `<!doctype html><html><head><title>Anonymous page</title></head><body><h1>Hello</h1></body></html>`, http.Header{"Content-Type": []string{"text/html"}}, nil
		},
		Parse: func(_ context.Context, _ string, sourceURL string, _ string) (model.AnalysisResult, error) {
			return model.AnalysisResult{
				URL:       sourceURL,
				FetchedAt: time.Now().UTC(),
				Overview:  model.Overview{Title: "Anonymous page"},
			}, nil
		},
	}
	ts := httptest.NewServer(server.NewHandlerWithAnalyzeConfig(cfg, apiConfig))
	defer ts.Close()

	resp := doJSON(t, &http.Client{}, http.MethodPost, ts.URL+"/api/analyze", `{"url":"https://anonymous-report.example"}`)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("analyze status = %d, body = %s", resp.StatusCode, readBody(resp))
	}
	var analysis struct {
		ReportID string `json:"reportId"`
	}
	decodeBody(t, resp, &analysis)
	if !regexp.MustCompile(`^[a-f0-9]{32}$`).MatchString(analysis.ReportID) {
		t.Fatalf("anonymous analysis should return a 32-hex report id, got %q", analysis.ReportID)
	}

	// A different visitor: no cookies, no session.
	resp = doJSON(t, &http.Client{}, http.MethodGet, ts.URL+"/api/report/"+analysis.ReportID, "")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("report status = %d, body = %s", resp.StatusCode, readBody(resp))
	}
	var report struct {
		URL      string              `json:"url"`
		ReportID string              `json:"reportId"`
		Usage    *model.UsageSummary `json:"usage"`
	}
	decodeBody(t, resp, &report)
	if report.ReportID != analysis.ReportID {
		t.Fatalf("shared report id = %q, want %q", report.ReportID, analysis.ReportID)
	}
	if report.Usage != nil {
		t.Fatalf("shared report must not expose the owner's usage: %+v", report.Usage)
	}
}
