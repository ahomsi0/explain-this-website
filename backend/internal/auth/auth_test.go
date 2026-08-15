package auth

import "testing"

func TestJWTSecretRequired(t *testing.T) {
	t.Setenv("JWT_SECRET", "")
	if _, err := IssueToken(42); err == nil {
		t.Fatal("expected token issuance to fail when JWT_SECRET is missing")
	}
}

func TestJWTSecretSignsAndParsesTokens(t *testing.T) {
	t.Setenv("JWT_SECRET", "test-only-secret")
	token, err := IssueToken(42)
	if err != nil {
		t.Fatalf("IssueToken() error = %v", err)
	}
	got, err := ParseToken(token)
	if err != nil {
		t.Fatalf("ParseToken() error = %v", err)
	}
	if got != 42 {
		t.Fatalf("ParseToken() = %d, want 42", got)
	}
}
