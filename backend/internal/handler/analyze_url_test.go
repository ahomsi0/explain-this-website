package handler

import (
	"strings"
	"testing"
)

func TestNormalizeAnalyzeURL(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		want    string
		wantErr string
	}{
		{name: "domain only", input: " example.com/path#section ", want: "https://example.com/path"},
		{name: "uppercase scheme", input: "HTTPS://Example.com", want: "https://Example.com"},
		{name: "credentials rejected", input: "https://user:pass@example.com", wantErr: "credentials"},
		{name: "unsupported scheme", input: "ftp://example.com", wantErr: "http or https"},
		{name: "missing host", input: "https://", wantErr: "full URL"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, errMessage := normalizeAnalyzeURL(tt.input)
			if tt.wantErr != "" {
				if errMessage == "" || !containsFold(errMessage, tt.wantErr) {
					t.Fatalf("expected error containing %q, got %q", tt.wantErr, errMessage)
				}
				return
			}
			if errMessage != "" || got != tt.want {
				t.Fatalf("normalizeAnalyzeURL(%q) = %q, %q; want %q", tt.input, got, errMessage, tt.want)
			}
		})
	}
}

func containsFold(value, fragment string) bool {
	return len(value) >= len(fragment) && strings.Contains(strings.ToLower(value), strings.ToLower(fragment))
}
