package handler

import (
	"encoding/hex"
	"strings"
	"testing"
)

func TestWebhookSecretEncryptionRoundTrip(t *testing.T) {
	key := strings.Repeat("ab", 32)
	t.Setenv("WEBHOOK_ENCRYPTION_KEY", key)

	ciphertext, err := encryptWebhookSecret("whsec_test-secret")
	if err != nil {
		t.Fatalf("encryptWebhookSecret() error = %v", err)
	}
	if hex.EncodeToString(ciphertext) == "whsec_test-secret" {
		t.Fatal("webhook secret was not encrypted")
	}
	got, err := decryptWebhookSecret(ciphertext)
	if err != nil {
		t.Fatalf("decryptWebhookSecret() error = %v", err)
	}
	if got != "whsec_test-secret" {
		t.Fatalf("decryptWebhookSecret() = %q", got)
	}
}

func TestValidateWebhookURL(t *testing.T) {
	for _, raw := range []string{"https://example.com/hook", "http://example.com/hook"} {
		if err := validateWebhookURL(raw); err != nil {
			t.Errorf("validateWebhookURL(%q) error = %v", raw, err)
		}
	}
	for _, raw := range []string{"ftp://example.com/hook", "https://user:pass@example.com/hook", "not-a-url"} {
		if err := validateWebhookURL(raw); err == nil {
			t.Errorf("validateWebhookURL(%q) unexpectedly succeeded", raw)
		}
	}
}
