package parser

import (
	"testing"

	"github.com/ahomsi/explain-website/internal/model"
)

func TestSEOScoreExcludesOptionalChecks(t *testing.T) {
	checks := []model.SEOCheck{
		{ID: "a", Status: "pass"},
		{ID: "b", Status: "fail"},
		{ID: "c", Status: "warning"},
		{ID: "d", Status: "pass", Optional: true}, // excluded
	}
	if got := SEOScore(checks); got != 33 { // 1 pass of 3 required
		t.Fatalf("SEOScore = %d, want 33", got)
	}
	if got := SEOScore(nil); got != 0 {
		t.Fatalf("SEOScore(empty) = %d, want 0", got)
	}
}

func TestUXScoreCountsSixSignals(t *testing.T) {
	ux := model.UXResult{HasCTA: true, HasForms: false, HasSocialProof: true, HasTrustSignals: false, HasContactInfo: true, MobileReady: false}
	if got := UXScore(ux); got != 50 {
		t.Fatalf("UXScore = %d, want 50", got)
	}
}

func TestOverallScoreMatchesFrontendWeighting(t *testing.T) {
	perf := 80
	result := model.AnalysisResult{
		ConversionScores: model.ConversionScores{Overall: 60},
		Performance:      &model.PerformanceResult{Available: true, Mobile: &model.StrategyData{Lighthouse: model.LighthouseScores{Performance: &perf}}},
	}
	// SEO: 2 of 4 required pass = 50; UX: 3 of 6 = 50.
	result.SEOChecks = []model.SEOCheck{{Status: "pass"}, {Status: "pass"}, {Status: "fail"}, {Status: "fail"}}
	result.UX = model.UXResult{HasCTA: true, HasForms: true, HasSocialProof: true}

	// With perf: (50+80+50+60)/4 = 60.
	if got := OverallScore(result); got != 60 {
		t.Fatalf("OverallScore(with perf) = %d, want 60", got)
	}

	// Without perf data: (50+50+60)/3 = 53.
	result.Performance = nil
	if got := OverallScore(result); got != 53 {
		t.Fatalf("OverallScore(no perf) = %d, want 53", got)
	}

	// Falls back to desktop when mobile is missing: (50+100+50+60)/4 = 65.
	desktop := 100
	result.Performance = &model.PerformanceResult{
		Available: true,
		Desktop:   &model.StrategyData{Lighthouse: model.LighthouseScores{Performance: &desktop}},
	}
	if got := OverallScore(result); got != 65 {
		t.Fatalf("OverallScore(desktop fallback) = %d, want 65", got)
	}
}
