package handler

import (
	"encoding/json"
	"testing"

	"github.com/ahomsi/explain-website/internal/model"
)

func TestEncodeStoredReportRestoresPublicReportID(t *testing.T) {
	raw, err := json.Marshal(model.AnalysisResult{
		URL: "https://example.com",
	})
	if err != nil {
		t.Fatalf("marshal fixture: %v", err)
	}

	cases := []struct {
		name   string
		public bool
		wantID string
	}{
		{name: "public", public: true, wantID: "0123456789abcdef"},
		{name: "private", public: false, wantID: ""},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			encoded, ok := encodeStoredReport(raw, tc.wantID, tc.public)
			if !ok {
				t.Fatal("expected valid stored report to encode")
			}
			var result model.AnalysisResult
			if err := json.Unmarshal(encoded, &result); err != nil {
				t.Fatalf("decode response: %v", err)
			}
			if result.ReportID != tc.wantID {
				t.Fatalf("report id = %q, want %q", result.ReportID, tc.wantID)
			}
		})
	}
}

func TestEncodeStoredReportRejectsMalformedJSON(t *testing.T) {
	if _, ok := encodeStoredReport([]byte(`{"url":`), "id", true); ok {
		t.Fatal("malformed stored report should not encode")
	}
}
