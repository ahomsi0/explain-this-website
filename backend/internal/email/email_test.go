package email

import (
	"context"
	"testing"
)

func TestResetCodeDoesNotLogOrSucceedInProductionWithoutProvider(t *testing.T) {
	t.Setenv("APP_ENV", "production")
	t.Setenv("RESEND_API_KEY", "")
	if err := SendResetCode(context.Background(), "user@example.com", "123456"); err == nil {
		t.Fatal("expected reset email delivery to fail closed")
	}
}
