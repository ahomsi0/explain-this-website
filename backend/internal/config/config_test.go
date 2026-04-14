package config

import "testing"

func TestLoad_UsesExplicitEnvironmentValues(t *testing.T) {
	t.Setenv("PORT", "9090")
	t.Setenv("ALLOWED_ORIGIN", "http://localhost:3000")
	t.Setenv("FETCH_TIMEOUT_SEC", "42")
	t.Setenv("MAX_BODY_BYTES", "12345")

	cfg := Load()

	if cfg.Port != "9090" {
		t.Fatalf("expected PORT=9090, got %q", cfg.Port)
	}
	if cfg.AllowedOrigin != "http://localhost:3000" {
		t.Fatalf("expected ALLOWED_ORIGIN=http://localhost:3000, got %q", cfg.AllowedOrigin)
	}
	if cfg.FetchTimeoutSec != 42 {
		t.Fatalf("expected FETCH_TIMEOUT_SEC=42, got %d", cfg.FetchTimeoutSec)
	}
	if cfg.MaxBodyBytes != 12345 {
		t.Fatalf("expected MAX_BODY_BYTES=12345, got %d", cfg.MaxBodyBytes)
	}
}
