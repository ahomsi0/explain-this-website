package server

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

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
	wrapped := corsMiddleware("http://frontend.test", next)
	request := httptest.NewRequest(http.MethodPost, "http://api.test/api/audits", nil)
	request.Header.Set("Origin", "https://attacker.test")
	request = request.WithContext(auth.WithUserID(context.Background(), 42))
	response := httptest.NewRecorder()

	wrapped.ServeHTTP(response, request)
	if response.Code != http.StatusForbidden {
		t.Fatalf("unexpected-origin mutation status = %d, want %d", response.Code, http.StatusForbidden)
	}
}
