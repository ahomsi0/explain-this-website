package parser

import "testing"

func TestAnalyzeCopy_GenericText(t *testing.T) {
	text := "We provide best-in-class innovative solutions with seamless integration and world-class support."
	result := AnalyzeCopy(text)
	if result.Score >= 50 {
		t.Errorf("expected score < 50 for generic text, got %d", result.Score)
	}
	if result.Label != "Generic" {
		t.Errorf("expected label Generic, got %s", result.Label)
	}
	if len(result.VaguePhrases) == 0 {
		t.Error("expected vague phrases to be detected")
	}
}

func TestAnalyzeCopy_SpecificText(t *testing.T) {
	text := "Our tool reduces reporting time by 40%. Over 10,000 teams use it. Integrates with Slack and Jira in 5 minutes."
	result := AnalyzeCopy(text)
	if result.Score < 60 {
		t.Errorf("expected score >= 60 for specific text, got %d", result.Score)
	}
}

func TestAnalyzeCopy_EmptyText(t *testing.T) {
	result := AnalyzeCopy("")
	if result.Score != 100 {
		t.Errorf("expected score 100 for empty text, got %d", result.Score)
	}
}
