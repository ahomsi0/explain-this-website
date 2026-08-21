package handler

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestEnsureVisitorCookieCreatesSignedCookie(t *testing.T) {
	t.Setenv("JWT_SECRET", "test-secret")
	req := httptest.NewRequest(http.MethodPost, "http://localhost/api/analyze", strings.NewReader(`{"url":"https://example.com"}`))
	res := httptest.NewRecorder()

	EnsureVisitorCookie(res, req)
	cookie := res.Result().Cookies()[0]
	if cookie.Name != visitorCookieName || !validVisitorCookie(cookie.Value) {
		t.Fatalf("expected a valid %s cookie, got %q", visitorCookieName, cookie.String())
	}

	req.AddCookie(cookie)
	if got := visitorIDFromRequest(req); !strings.HasPrefix(got, "cookie:") {
		t.Fatalf("visitorIDFromRequest() = %q, want cookie-backed id", got)
	}
}
