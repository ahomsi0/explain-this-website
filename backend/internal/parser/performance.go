package parser

import (
	"encoding/json"
	"fmt"
	"log"
	"math"
	"net/http"
	"net/url"
	"time"

	"github.com/ahomsi/explain-website/internal/adminstate"
	"github.com/ahomsi/explain-website/internal/model"
)

const pageSpeedAPI = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed"

// lhCategory is a single Lighthouse category entry. Score is a pointer to handle null.
type lhCategory struct {
	Score *float64 `json:"score"`
}

// thirdPartiesAudit is parsed separately because its structure is more complex.
type thirdPartiesAudit struct {
	Details struct {
		Items []struct {
			Entity       string  `json:"entity"`
			TransferSize float64 `json:"transferSize"`
		} `json:"items"`
	} `json:"details"`
}

// lhAudit covers the simple numeric/display audits we use for Core Web Vitals.
type lhAudit struct {
	NumericValue float64 `json:"numericValue"`
	DisplayValue string  `json:"displayValue"`
}


// pageSpeedResponse holds the subset of the PageSpeed Insights API response we care about.
type pageSpeedResponse struct {
	LighthouseResult struct {
		// Categories uses a map so hyphenated keys like "best-practices" parse correctly.
		Categories map[string]lhCategory      `json:"categories"`
		Audits     map[string]json.RawMessage `json:"audits"`
	} `json:"lighthouseResult"`
	LoadingExperience struct {
		InitialURL string `json:"initial_url"`
		Metrics    map[string]struct {
			Percentile float64 `json:"percentile"`
			Category   string  `json:"category"` // "FAST" | "AVERAGE" | "SLOW"
		} `json:"metrics"`
	} `json:"loadingExperience"`
}

// fetchPerformance fetches both mobile and desktop PageSpeed data.
// Desktop is started 1 second after mobile to avoid simultaneous requests
// hitting the PageSpeed API rate limit (1 QPS on the free/keyless tier).
// Returns nil, err only if both strategies fail — partial success is allowed.
func fetchPerformance(siteURL string, apiKey string) (*model.PerformanceResult, error) {
	type stratResult struct {
		name string
		data *model.StrategyData
		err  error
	}
	ch := make(chan stratResult, 2)

	// Launch mobile immediately, desktop after a 1-second stagger.
	for i, strat := range []string{"mobile", "desktop"} {
		s := strat
		delay := time.Duration(i) * time.Second
		go func() {
			if delay > 0 {
				time.Sleep(delay)
			}
			d, err := fetchStrategy(siteURL, apiKey, s)
			if err != nil {
				log.Printf("PageSpeed %s failed for %s: %v", s, siteURL, err)
			}
			ch <- stratResult{s, d, err}
		}()
	}

	result := &model.PerformanceResult{Available: false}
	var firstErr error
	for i := 0; i < 2; i++ {
		r := <-ch
		if r.err != nil {
			if firstErr == nil {
				firstErr = r.err
			}
			continue
		}
		if r.name == "mobile" {
			result.Mobile = r.data
		} else {
			result.Desktop = r.data
		}
		result.Available = true
	}

	if !result.Available {
		if firstErr != nil {
			adminstate.RecordPageSpeedFailure(firstErr.Error())
		}
		return nil, firstErr
	}
	adminstate.RecordPageSpeedSuccess()
	return result, nil
}

// fetchStrategy calls the PageSpeed Insights API for one strategy and parses the response.
func fetchStrategy(siteURL string, apiKey string, strategy string) (*model.StrategyData, error) {
	client := &http.Client{Timeout: 55 * time.Second}

	// Request all four Lighthouse categories — by default the API only returns "performance".
	apiURL := fmt.Sprintf(
		"%s?url=%s&strategy=%s&key=%s&category=performance&category=accessibility&category=best-practices&category=seo",
		pageSpeedAPI, url.QueryEscape(siteURL), strategy, url.QueryEscape(apiKey),
	)
	resp, err := client.Get(apiURL)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("PageSpeed API (%s): HTTP %d", strategy, resp.StatusCode)
	}

	var data pageSpeedResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, fmt.Errorf("PageSpeed API (%s): decode error: %w", strategy, err)
	}

	cats := data.LighthouseResult.Categories
	audits := data.LighthouseResult.Audits

	out := &model.StrategyData{
		Lighthouse: model.LighthouseScores{
			Performance:   categoryScore(cats, "performance"),
			Accessibility: categoryScore(cats, "accessibility"),
			BestPractices: categoryScore(cats, "best-practices"),
			SEO:           categoryScore(cats, "seo"),
		},
		FCP:        auditMetric(audits, "first-contentful-paint", fcpRating),
		LCP:        auditMetric(audits, "largest-contentful-paint", lcpRating),
		TBT:        auditMetric(audits, "total-blocking-time", tbtRating),
		CLS:        auditMetric(audits, "cumulative-layout-shift", clsRating),
		SpeedIndex: auditMetric(audits, "speed-index", speedIndexRating),
	}

	// Parse third-parties-insight to surface real network-detected services.
	if raw, ok := audits["third-parties-insight"]; ok {
		var tp thirdPartiesAudit
		if err := json.Unmarshal(raw, &tp); err == nil {
			for _, it := range tp.Details.Items {
				if it.Entity == "" {
					continue
				}
				out.ThirdParties = append(out.ThirdParties, model.ThirdPartyEntity{
					Name:         it.Entity,
					TransferSize: int(it.TransferSize),
				})
			}
		}
	}

	// Field data (real users via CrUX) — only present when the site has enough traffic.
	if le := data.LoadingExperience; le.InitialURL != "" && len(le.Metrics) > 0 {
		if m, ok := le.Metrics["LARGEST_CONTENTFUL_PAINT_MS"]; ok {
			v := fieldMetric(m.Percentile, "ms", lcpRating)
			out.FieldLCP = &v
		}
		if m, ok := le.Metrics["CUMULATIVE_LAYOUT_SHIFT_SCORE"]; ok {
			// CrUX percentile for CLS is stored ×100 (e.g. 5 = 0.05)
			actual := m.Percentile / 100.0
			display := fmt.Sprintf("%.2f", actual)
			v := model.CoreWebVital{Value: actual, DisplayValue: display, Rating: clsRating(actual)}
			out.FieldCLS = &v
		}
		if m, ok := le.Metrics["INTERACTION_TO_NEXT_PAINT"]; ok {
			v := fieldMetric(m.Percentile, "ms", inpRating)
			out.FieldINP = &v
		}
		if m, ok := le.Metrics["FIRST_CONTENTFUL_PAINT_MS"]; ok {
			v := fieldMetric(m.Percentile, "ms", fcpRating)
			out.FieldFCP = &v
		}
	}

	return out, nil
}

// categoryScore safely extracts a Lighthouse category score (0–100) from the map.
func categoryScore(cats map[string]lhCategory, key string) int {
	if c, ok := cats[key]; ok && c.Score != nil {
		return int(math.Round(*c.Score * 100))
	}
	return 0
}

// auditMetric extracts a named audit entry and rates it.
func auditMetric(
	audits map[string]json.RawMessage,
	key string,
	rate func(float64) string,
) model.CoreWebVital {
	raw, ok := audits[key]
	if !ok {
		return model.CoreWebVital{}
	}
	var a lhAudit
	if err := json.Unmarshal(raw, &a); err != nil {
		return model.CoreWebVital{}
	}
	return model.CoreWebVital{
		Value:        a.NumericValue,
		DisplayValue: a.DisplayValue,
		Rating:       rate(a.NumericValue),
	}
}

// fieldMetric builds a CoreWebVital from a CrUX percentile value.
func fieldMetric(percentile float64, unit string, rate func(float64) string) model.CoreWebVital {
	display := fmt.Sprintf("%.0f %s", percentile, unit)
	return model.CoreWebVital{Value: percentile, DisplayValue: display, Rating: rate(percentile)}
}

// Rating threshold functions — thresholds from web.dev/vitals.

func lcpRating(ms float64) string {
	if ms < 2500 {
		return "good"
	}
	if ms < 4000 {
		return "needs-improvement"
	}
	return "poor"
}

func fcpRating(ms float64) string {
	if ms < 1800 {
		return "good"
	}
	if ms < 3000 {
		return "needs-improvement"
	}
	return "poor"
}

func tbtRating(ms float64) string {
	if ms < 200 {
		return "good"
	}
	if ms < 600 {
		return "needs-improvement"
	}
	return "poor"
}

func clsRating(score float64) string {
	if score < 0.1 {
		return "good"
	}
	if score < 0.25 {
		return "needs-improvement"
	}
	return "poor"
}

func speedIndexRating(ms float64) string {
	if ms < 3400 {
		return "good"
	}
	if ms < 5800 {
		return "needs-improvement"
	}
	return "poor"
}

func inpRating(ms float64) string {
	if ms < 200 {
		return "good"
	}
	if ms < 500 {
		return "needs-improvement"
	}
	return "poor"
}
