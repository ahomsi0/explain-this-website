package server

import "testing"

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
