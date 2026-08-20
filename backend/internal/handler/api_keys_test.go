package handler

import (
	"strings"
	"testing"
)

func TestGenerateAPIKey(t *testing.T) {
	id, raw, prefix, digest, err := generateAPIKey()
	if err != nil {
		t.Fatalf("generateAPIKey() error = %v", err)
	}
	if len(id) != 32 || !strings.HasPrefix(raw, "etw_") || prefix != raw[:12] {
		t.Fatalf("unexpected API key metadata: id=%q raw=%q prefix=%q", id, raw, prefix)
	}
	if digest != HashAPIKey(raw) {
		t.Fatal("generated digest does not match HashAPIKey")
	}
	if digest == raw {
		t.Fatal("API key secret must not be stored in plaintext")
	}
}
