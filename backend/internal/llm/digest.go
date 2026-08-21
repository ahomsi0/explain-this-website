package llm

import (
	"fmt"
	"net/url"
	"strings"

	"github.com/ahomsi/explain-website/internal/model"
)

// buildDigest turns an AnalysisResult into a compact, signal-bearing text
// block suitable for an LLM prompt. The goal is to fit ~1–2K tokens — full
// JSON is much bigger and most fields are noise for a summary task.
//
// We bias toward fields that already have human-meaningful labels (Intent,
// WeakPoints, Recommendations, BiggestOpportunity), and trim the long-tail
// machine fields (TechSignal payloads, every SEO Detail line, etc).
func buildDigest(r *model.AnalysisResult) string {
	var b strings.Builder
	hostname := r.URL
	if u, err := url.Parse(r.URL); err == nil && u.Host != "" {
		hostname = u.Host
	}

	fmt.Fprintf(&b, "URL: %s\n", r.URL)
	fmt.Fprintf(&b, "Hostname: %s\n", hostname)

	// Overview
	if r.Overview.Title != "" {
		fmt.Fprintf(&b, "Title: %s\n", truncate(r.Overview.Title, 200))
	}
	if r.Overview.Description != "" {
		fmt.Fprintf(&b, "Description: %s\n", truncate(r.Overview.Description, 280))
	}

	// Intent — the highest-signal "what is this site" field.
	if r.Intent.Label != "" {
		fmt.Fprintf(&b, "Intent: %s — %s\n", r.Intent.Label, r.Intent.Description)
	}

	// First impression / conversion scoring
	if r.FirstImpression.Score > 0 {
		fmt.Fprintf(&b, "First-impression score: %d/10 (%s) — %s\n",
			r.FirstImpression.Score, r.FirstImpression.Label, r.FirstImpression.Explanation)
	}
	if r.ConversionScores.Overall > 0 {
		fmt.Fprintf(&b, "Conversion scores: overall %d, clarity %d, trust %d, CTA %d, friction %d (out of 100 each)\n",
			r.ConversionScores.Overall, r.ConversionScores.Clarity,
			r.ConversionScores.Trust, r.ConversionScores.CTAStrength, r.ConversionScores.Friction)
	}

	// Tech stack — top 5 by confidence
	if len(r.TechStack) > 0 {
		names := make([]string, 0, 5)
		for i, t := range r.TechStack {
			if i >= 5 {
				break
			}
			names = append(names, t.Name)
		}
		fmt.Fprintf(&b, "Tech stack (top): %s\n", strings.Join(names, ", "))
	}

	// SEO summary
	if len(r.SEOChecks) > 0 {
		var pass, warn, fail, optional int
		var failed []string
		for _, c := range r.SEOChecks {
			if c.Optional {
				optional++
				continue
			}
			switch c.Status {
			case "pass":
				pass++
			case "warning":
				warn++
			case "fail":
				fail++
				if len(failed) < 5 {
					failed = append(failed, c.Label)
				}
			}
		}
		fmt.Fprintf(&b, "SEO checks: %d pass, %d warning, %d fail\n", pass, warn, fail)
		if optional > 0 {
			fmt.Fprintf(&b, "SEO optional enhancements: %d (not included in the core score)\n", optional)
		}
		if len(failed) > 0 {
			fmt.Fprintf(&b, "SEO failures: %s\n", strings.Join(failed, "; "))
		}
	}

	// Performance — mobile Lighthouse is the single best perf signal
	if r.Performance != nil && r.Performance.Mobile != nil {
		lh := r.Performance.Mobile.Lighthouse
		var scores []string
		if lh.Performance != nil {
			scores = append(scores, fmt.Sprintf("performance %d", *lh.Performance))
		}
		if lh.Accessibility != nil {
			scores = append(scores, fmt.Sprintf("accessibility %d", *lh.Accessibility))
		}
		if lh.BestPractices != nil {
			scores = append(scores, fmt.Sprintf("best-practices %d", *lh.BestPractices))
		}
		if lh.SEO != nil {
			scores = append(scores, fmt.Sprintf("seo %d", *lh.SEO))
		}
		if len(scores) > 0 {
			fmt.Fprintf(&b, "Mobile Lighthouse: %s\n", strings.Join(scores, ", "))
		}
	}

	// UX signals — boolean summary
	uxSignals := []string{}
	if r.UX.HasCTA {
		uxSignals = append(uxSignals, "CTA present")
	}
	if r.UX.HasForms {
		uxSignals = append(uxSignals, "forms")
	}
	if r.UX.HasSocialProof {
		uxSignals = append(uxSignals, "social proof")
	}
	if r.UX.HasTrustSignals {
		uxSignals = append(uxSignals, "trust signals")
	}
	if r.UX.HasContactInfo {
		uxSignals = append(uxSignals, "contact info")
	}
	if r.UX.MobileReady {
		uxSignals = append(uxSignals, "mobile-ready")
	}
	if len(uxSignals) > 0 {
		fmt.Fprintf(&b, "UX signals detected: %s\n", strings.Join(uxSignals, ", "))
	}

	// Content stats — WordCount lives on PageStats, readability on ContentStats
	if r.PageStats.WordCount > 0 {
		fmt.Fprintf(&b, "Content: %d words, reading level %s\n",
			r.PageStats.WordCount, r.ContentStats.ReadingLevel)
	}

	// Curated insight fields — these are the highest-quality input the LLM
	// can build on because they're already prose.
	if r.BiggestOpportunity != "" {
		fmt.Fprintf(&b, "Biggest opportunity (auto): %s\n", r.BiggestOpportunity)
	}
	if len(r.PrioritizedIssues) > 0 {
		fmt.Fprintln(&b, "Prioritized issues:")
		for i, p := range r.PrioritizedIssues {
			if i >= 5 {
				break
			}
			fmt.Fprintf(&b, "  - [%s] %s — %s\n", p.Impact, p.Issue, truncate(p.Why, 160))
		}
	}
	if len(r.WeakPoints) > 0 {
		fmt.Fprintln(&b, "Weak points:")
		for i, w := range r.WeakPoints {
			if i >= 5 {
				break
			}
			fmt.Fprintf(&b, "  - %s\n", w)
		}
	}
	if len(r.Recommendations) > 0 {
		fmt.Fprintln(&b, "Recommendations:")
		for i, rec := range r.Recommendations {
			if i >= 5 {
				break
			}
			fmt.Fprintf(&b, "  - %s\n", rec)
		}
	}

	return b.String()
}
