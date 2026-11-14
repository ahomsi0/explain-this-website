package email

import (
	"context"
	"strings"
	"testing"
)

func TestResetCodeDoesNotLogOrSucceedInProductionWithoutProvider(t *testing.T) {
	t.Setenv("APP_ENV", "production")
	t.Setenv("RESEND_API_KEY", "")
	if err := SendResetCode(context.Background(), "user@example.com", "123456"); err == nil {
		t.Fatal("expected reset email delivery to fail closed")
	}
}

// Resend's shared test sender only delivers to the Resend account owner, so a
// default that uses it silently drops every customer email.
func TestDefaultSenderIsOnTheSitesOwnDomain(t *testing.T) {
	t.Setenv("FROM_EMAIL", "")
	got := fromAddress()
	if !strings.Contains(got, "@explainthiswebsite.com>") {
		t.Fatalf("default sender = %q, want an address on explainthiswebsite.com", got)
	}
	if strings.Contains(got, "resend.dev") {
		t.Fatalf("default sender %q uses Resend's test domain", got)
	}

	t.Setenv("FROM_EMAIL", "  Support <support@explainthiswebsite.com>  ")
	if got := fromAddress(); got != "Support <support@explainthiswebsite.com>" {
		t.Fatalf("FROM_EMAIL override = %q", got)
	}
}
