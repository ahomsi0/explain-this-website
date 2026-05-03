package parser

import (
	"net/http"
	"testing"
)

func TestAuditSecurityHeaders_AllPresent(t *testing.T) {
	headers := http.Header{
		"Strict-Transport-Security": []string{"max-age=31536000"},
		"Content-Security-Policy":   []string{"default-src 'self'"},
		"X-Frame-Options":           []string{"DENY"},
		"X-Content-Type-Options":    []string{"nosniff"},
		"Referrer-Policy":           []string{"strict-origin-when-cross-origin"},
		"Permissions-Policy":        []string{"geolocation=()"},
	}
	checks := AuditSecurityHeaders(headers)
	if len(checks) != 6 {
		t.Fatalf("expected 6 checks, got %d", len(checks))
	}
	for _, c := range checks {
		if c.Status != "pass" {
			t.Errorf("id=%s: expected pass, got %s", c.ID, c.Status)
		}
	}
}

func TestAuditSecurityHeaders_NonePresent(t *testing.T) {
	checks := AuditSecurityHeaders(http.Header{})
	fails := 0
	for _, c := range checks {
		if c.Status == "fail" {
			fails++
		}
	}
	if fails < 3 {
		t.Errorf("expected ≥3 fails for empty headers, got %d", fails)
	}
}

func TestAuditSecurityHeaders_UnsafeReferrer(t *testing.T) {
	checks := AuditSecurityHeaders(http.Header{
		"Referrer-Policy": []string{"unsafe-url"},
	})
	found := false
	for _, c := range checks {
		if c.ID == "referrer" {
			found = true
			if c.Status != "warning" {
				t.Errorf("expected warning for unsafe-url, got %s", c.Status)
			}
		}
	}
	if !found {
		t.Error("referrer check not found in results")
	}
}
