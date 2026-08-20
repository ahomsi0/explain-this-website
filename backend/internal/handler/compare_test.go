package handler

import (
	"testing"
	"time"

	"github.com/ahomsi/explain-website/internal/model"
)

func TestComparisonSnapshot(t *testing.T) {
	result := model.AnalysisResult{
		URL: "https://example.com",
		SEOChecks: []model.SEOCheck{
			{Status: "pass"},
			{Status: "warning"},
		},
		UX:                model.UXResult{HasCTA: true, MobileReady: true},
		ConversionScores:  model.ConversionScores{Overall: 72},
		PrioritizedIssues: []model.PrioritizedIssue{{Rank: 1}},
		LinkCheck:         model.LinkCheckResult{Broken: 2},
		SecurityHeaders:   []model.SecurityHeaderCheck{{Status: "fail"}},
	}
	snapshot := comparisonSnapshot("a", "Example", time.Unix(100, 0), result)
	if snapshot.SEOScore != 50 || snapshot.UXScore != 33 || snapshot.ConversionScore != 72 {
		t.Fatalf("unexpected scores: %+v", snapshot)
	}
	if snapshot.PriorityIssueCount != 1 || snapshot.BrokenLinkCount != 2 || snapshot.SecurityFailureCount != 1 {
		t.Fatalf("unexpected issue counts: %+v", snapshot)
	}
}
