package parser

import "github.com/ahomsi/explain-website/internal/model"

// SEOScore returns the required-check pass rate (0–100). Optional checks are
// excluded, matching the report's own SEO scoring.
func SEOScore(checks []model.SEOCheck) int {
	pass, required := 0, 0
	for _, c := range checks {
		if c.Optional {
			continue
		}
		required++
		if c.Status == "pass" {
			pass++
		}
	}
	if required == 0 {
		return 0
	}
	return (pass * 100) / required
}

// UXScore returns the share of conversion-relevant UX signals present (0–100).
func UXScore(ux model.UXResult) int {
	signals := []bool{
		ux.HasCTA,
		ux.HasForms,
		ux.HasSocialProof,
		ux.HasTrustSignals,
		ux.HasContactInfo,
		ux.MobileReady,
	}
	passed := 0
	for _, s := range signals {
		if s {
			passed++
		}
	}
	return (passed * 100) / len(signals)
}

// OverallScore mirrors the frontend's executive-summary weighting:
// SEO / Performance / UX / Conversion at 25% each; when no PageSpeed data is
// available the remaining three are averaged instead.
func OverallScore(result model.AnalysisResult) int {
	clamp := func(n int) int {
		if n < 0 {
			return 0
		}
		if n > 100 {
			return 100
		}
		return n
	}

	seo := SEOScore(result.SEOChecks)
	ux := UXScore(result.UX)
	conversion := result.ConversionScores.Overall

	perf := -1
	if result.Performance != nil {
		switch {
		case result.Performance.Mobile != nil && result.Performance.Mobile.Lighthouse.Performance != nil:
			perf = *result.Performance.Mobile.Lighthouse.Performance
		case result.Performance.Desktop != nil && result.Performance.Desktop.Lighthouse.Performance != nil:
			perf = *result.Performance.Desktop.Lighthouse.Performance
		}
	}

	if perf >= 0 {
		return clamp((seo + perf + ux + conversion) / 4)
	}
	return clamp((seo + ux + conversion) / 3)
}
