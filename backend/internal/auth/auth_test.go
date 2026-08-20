package auth

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

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

func TestRequireSessionAuthRejectsAPIKeys(t *testing.T) {
	next := func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusNoContent) }
	handler := RequireSessionAuth(next)

	request := httptest.NewRequest(http.MethodGet, "/", nil)
	request = request.WithContext(WithUserID(context.Background(), 42))
	response := httptest.NewRecorder()
	handler(response, request)
	if response.Code != http.StatusNoContent {
		t.Fatalf("session request status = %d, want %d", response.Code, http.StatusNoContent)
	}

	request = httptest.NewRequest(http.MethodGet, "/", nil)
	apiKeyContext := WithAPIKey(WithUserID(context.Background(), 42))
	request = request.WithContext(apiKeyContext)
	response = httptest.NewRecorder()
	handler(response, request)
	if response.Code != http.StatusUnauthorized {
		t.Fatalf("API-key request status = %d, want %d", response.Code, http.StatusUnauthorized)
	}
}
