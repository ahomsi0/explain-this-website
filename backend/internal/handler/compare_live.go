package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/ahomsi/explain-website/internal/model"
)

// compareLiveRequest asks for a fresh head-to-head analysis of two URLs.
type compareLiveRequest struct {
	Yours      string `json:"yours"`
	Competitor string `json:"competitor"`
}

// CompareLiveHandler runs fresh analyses of two URLs concurrently and returns
// their comparison snapshots in the same before/after shape as saved-audit
// comparison (before = your site). Requires an authenticated session; it is
// rate-limited separately because each request doubles analysis cost.
func CompareLiveHandler(cfg Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		r.Body = http.MaxBytesReader(w, r.Body, 8192)
		var req compareLiveRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, `invalid request body: expected {"yours": "...", "competitor": "..."}`)
			return
		}

		yoursURL, e1 := normalizeAnalyzeURL(req.Yours)
		if e1 != "" {
			writeError(w, http.StatusUnprocessableEntity, "your URL: "+e1)
			return
		}
		compURL, e2 := normalizeAnalyzeURL(req.Competitor)
		if e2 != "" {
			writeError(w, http.StatusUnprocessableEntity, "competitor URL: "+e2)
			return
		}
		if strings.EqualFold(yoursURL, compURL) {
			writeError(w, http.StatusBadRequest, "the two URLs must be different")
			return
		}

		type outcome struct {
			result model.AnalysisResult
			stage  string
			err    error
		}
		run := func(rawURL string) <-chan outcome {
			ch := make(chan outcome, 1)
			go func() {
				res, _, stage, err := runAnalysis(context.WithoutCancel(r.Context()), cfg, rawURL, false)
				ch <- outcome{result: res, stage: stage, err: err}
			}()
			return ch
		}
		yoursOut := <-run(yoursURL)
		compOut := <-run(compURL)

		if yoursOut.err != nil || compOut.err != nil {
			side, o := "your site", yoursOut
			if o.err == nil {
				side, o = "the competitor site", compOut
			}
			status := http.StatusInternalServerError
			prefix := "analysis failed for"
			if o.stage == "fetch" {
				status = http.StatusUnprocessableEntity
				prefix = "could not fetch"
			}
			writeError(w, status, fmt.Sprintf("%s %s: %s", prefix, side, o.err))
			return
		}

		before := comparisonSnapshot(yoursURL, yoursOut.result.Overview.Title, yoursOut.result.FetchedAt, yoursOut.result)
		after := comparisonSnapshot(compURL, compOut.result.Overview.Title, compOut.result.FetchedAt, compOut.result)
		writeJSON(w, http.StatusOK, auditComparisonResponse{Before: before, After: after})
	}
}
