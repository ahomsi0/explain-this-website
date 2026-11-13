package integration

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/ahomsi/explain-website/internal/config"
	"github.com/ahomsi/explain-website/internal/server"
)

// Asking for a new verification link is only for the signed-in account
// owner: an anonymous caller must not be able to trigger email to anyone.
func TestResendVerificationRequiresASession(t *testing.T) {
	cfg := config.Config{AllowedOrigin: "http://frontend.test", FetchTimeoutSec: 5, MaxBodyBytes: 1 << 20}
	ts := httptest.NewServer(server.NewHandler(cfg))
	defer ts.Close()

	resp := doJSON(t, &http.Client{}, http.MethodPost, ts.URL+"/api/auth/resend-verification", `{}`)
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401; body = %s", resp.StatusCode, readBody(resp))
	}
	_ = readBody(resp)
}

// Analysing a captured page writes to an account's private history, so it is
// only for a signed-in browser session.
func TestAnalyzeCaptureRequiresASession(t *testing.T) {
	cfg := config.Config{AllowedOrigin: "http://frontend.test", FetchTimeoutSec: 5, MaxBodyBytes: 1 << 20}
	ts := httptest.NewServer(server.NewHandler(cfg))
	defer ts.Close()

	resp := doJSON(t, &http.Client{}, http.MethodPost, ts.URL+"/api/analyze-capture",
		`{"url":"https://app.example.com","html":"<html><body><h1>Hi</h1></body></html>"}`)
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401; body = %s", resp.StatusCode, readBody(resp))
	}
	_ = readBody(resp)
}
