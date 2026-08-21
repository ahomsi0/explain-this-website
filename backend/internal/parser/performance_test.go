package parser

import (
	"encoding/json"
	"testing"
)

func TestAuditMetricIgnoresUnavailableLighthouseAudits(t *testing.T) {
	audits := map[string]json.RawMessage{
		"not-applicable": json.RawMessage(`{"displayValue":"Not applicable","scoreDisplayMode":"notApplicable"}`),
		"missing-value":  json.RawMessage(`{"displayValue":"—","scoreDisplayMode":"numeric"}`),
	}
	if got := auditMetric(audits, "not-applicable", lcpRating); got.DisplayValue != "" || got.Rating != "" {
		t.Fatalf("not-applicable audit should be omitted, got %+v", got)
	}
	if got := auditMetric(audits, "missing-value", lcpRating); got.DisplayValue != "" || got.Rating != "" {
		t.Fatalf("audit without numeric value should be omitted, got %+v", got)
	}
}

func TestAuditMetricPreservesZeroNumericValue(t *testing.T) {
	audits := map[string]json.RawMessage{
		"cls": json.RawMessage(`{"numericValue":0,"displayValue":"0","scoreDisplayMode":"numeric"}`),
	}
	got := auditMetric(audits, "cls", clsRating)
	if got.Value != 0 || got.DisplayValue != "0" || got.Rating != "good" {
		t.Fatalf("zero is a valid metric value, got %+v", got)
	}
}

func TestMetricThresholdsTreatGoodBoundaryAsGood(t *testing.T) {
	if lcpRating(2500) != "good" || clsRating(0.1) != "good" || inpRating(200) != "good" {
		t.Fatal("expected documented good thresholds to be inclusive")
	}
}

func TestCategoryScoreDistinguishesMissingFromZero(t *testing.T) {
	zero := 0.0
	cats := map[string]lhCategory{
		"performance": {Score: &zero},
	}
	got := categoryScore(cats, "performance")
	if got == nil || *got != 0 {
		t.Fatalf("a real zero category score should be preserved, got %v", got)
	}
	if missing := categoryScore(cats, "accessibility"); missing != nil {
		t.Fatalf("missing category should be unavailable, got %v", *missing)
	}
}
