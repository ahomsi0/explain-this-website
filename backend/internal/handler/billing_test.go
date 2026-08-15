package handler

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"testing"
)

func TestVerifyTapWebhookSignature(t *testing.T) {
	payload := []byte(`{"status":"SUBSCRIPTION_ACTIVATED"}`)
	secret := "test-webhook-secret"

	if err := verifyTapWebhookSignature(payload, "", ""); err == nil {
		t.Fatal("expected missing webhook secret to be rejected")
	}
	if err := verifyTapWebhookSignature(payload, "not-a-signature", secret); err == nil {
		t.Fatal("expected invalid webhook signature to be rejected")
	}

	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write(payload)
	signature := hex.EncodeToString(mac.Sum(nil))
	if err := verifyTapWebhookSignature(payload, signature, secret); err != nil {
		t.Fatalf("expected valid webhook signature, got %v", err)
	}
}
