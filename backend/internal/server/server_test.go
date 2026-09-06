package server

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/ahomsi/explain-website/internal/config"

	"github.com/ahomsi/explain-website/internal/auth"
)

func TestIsOriginAllowed_ExactAndLoopbackEquivalent(t *testing.T) {
	allowed := parseAllowedOrigins("http://localhost:5173")

	if !isOriginAllowed(allowed, "http://localhost:5173") {
		t.Fatalf("expected exact allowed origin to pass")
	}

	if !isOriginAllowed(allowed, "http://127.0.0.1:5173") {
		t.Fatalf("expected loopback-equivalent origin to pass")
	}

	if isOriginAllowed(allowed, "http://127.0.0.1:4173") {
		t.Fatalf("expected different port to be rejected")
	}
}

func TestCookieMutationRejectsUnexpectedOrigin(t *testing.T) {
	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusNoContent) })
	wrapped := originGuardMiddleware("http://frontend.test", next)
	request := httptest.NewRequest(http.MethodPost, "http://api.test/api/audits", nil)
	request.Header.Set("Origin", "https://attacker.test")
	request = request.WithContext(auth.WithUserID(context.Background(), 42))
	response := httptest.NewRecorder()

	wrapped.ServeHTTP(response, request)
	if response.Code != http.StatusForbidden {
		t.Fatalf("unexpected-origin mutation status = %d, want %d", response.Code, http.StatusForbidden)
	}
}

// CORS headers must be written before any middleware that can short-circuit the
// request. A 429/503/500 without them reaches the browser as an opaque CORS
// failure instead of the real status.
func TestCORSHeadersSurviveShortCircuitedResponse(t *testing.T) {
	rateLimited := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusTooManyRequests)
	})
	wrapped := corsHeadersMiddleware("https://frontend.test", rateLimited)
	request := httptest.NewRequest(http.MethodPost, "http://api.test/api/analyze", nil)
	request.Header.Set("Origin", "https://frontend.test")
	response := httptest.NewRecorder()

	wrapped.ServeHTTP(response, request)

	if response.Code != http.StatusTooManyRequests {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusTooManyRequests)
	}
	if got := response.Header().Get("Access-Control-Allow-Origin"); got != "https://frontend.test" {
		t.Fatalf("Access-Control-Allow-Origin = %q, want the request origin", got)
	}
}

func TestPreflightShortCircuitsBeforeInnerMiddleware(t *testing.T) {
	reached := false
	next := http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { reached = true })
	wrapped := corsHeadersMiddleware("https://frontend.test", next)
	request := httptest.NewRequest(http.MethodOptions, "http://api.test/api/analyze", nil)
	request.Header.Set("Origin", "https://frontend.test")
	response := httptest.NewRecorder()

	wrapped.ServeHTTP(response, request)

	if reached {
		t.Fatalf("preflight reached inner middleware; it must be answered by CORS alone")
	}
	if response.Code != http.StatusNoContent {
		t.Fatalf("preflight status = %d, want %d", response.Code, http.StatusNoContent)
	}
}

// Guards the middleware ordering in the assembled router, not just the
// middleware in isolation: exhausting the event bucket must still answer with
// CORS headers attached.
func TestRateLimitedResponseFromRouterKeepsCORSHeaders(t *testing.T) {
	cfg := config.Config{AllowedOrigin: "https://frontend.test"}
	router := NewHandler(cfg)

	var last *httptest.ResponseRecorder
	for i := 0; i < rlMaxEvent+1; i++ {
		request := httptest.NewRequest(http.MethodPost, "http://api.test/api/events", strings.NewReader("{}"))
		request.Header.Set("Origin", "https://frontend.test")
		request.Header.Set("Content-Type", "application/json")
		request.RemoteAddr = "203.0.113.9:1234"
		last = httptest.NewRecorder()
		router.ServeHTTP(last, request)
	}

	if last.Code != http.StatusTooManyRequests {
		t.Fatalf("final status = %d, want %d (rate limit not reached)", last.Code, http.StatusTooManyRequests)
	}
	if got := last.Header().Get("Access-Control-Allow-Origin"); got != "https://frontend.test" {
		t.Fatalf("rate-limited response Access-Control-Allow-Origin = %q, want the request origin", got)
	}
}
