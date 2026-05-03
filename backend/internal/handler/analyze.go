package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/ahomsi/explain-website/internal/fetcher"
	"github.com/ahomsi/explain-website/internal/model"
	"github.com/ahomsi/explain-website/internal/parser"
)

// Config holds the handler's runtime dependencies.
type Config struct {
	FetchTimeoutSec int
	MaxBodyBytes    int64
	PageSpeedAPIKey string
}

// AnalyzeHandler returns an http.HandlerFunc for POST /api/analyze.
func AnalyzeHandler(cfg Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		// Cap the request body at 8 KB — a URL payload is never legitimately larger.
		r.Body = http.MaxBytesReader(w, r.Body, 8192)

		// Decode request body.
		var req model.AnalyzeRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body: expected {\"url\": \"...\"}")
			return
		}

		rawURL := strings.TrimSpace(req.URL)
		if rawURL == "" {
			writeError(w, http.StatusUnprocessableEntity, "url is required")
			return
		}

		// Auto-prepend scheme if missing.
		if !strings.HasPrefix(rawURL, "http://") && !strings.HasPrefix(rawURL, "https://") {
			rawURL = "https://" + rawURL
		}

		// Validate URL structure.
		parsed, err := url.ParseRequestURI(rawURL)
		if err != nil || parsed.Host == "" {
			writeError(w, http.StatusUnprocessableEntity, "invalid URL: please provide a full URL (e.g. https://example.com)")
			return
		}
		if parsed.Scheme != "http" && parsed.Scheme != "https" {
			writeError(w, http.StatusUnprocessableEntity, "invalid URL: must use http or https scheme")
			return
		}
		// Reject URLs that embed credentials (http://user:pass@host) — these
		// are never needed for public page analysis and can mask intent.
		if parsed.User != nil {
			writeError(w, http.StatusUnprocessableEntity, "invalid URL: credentials in URLs are not supported")
			return
		}

		// Fetch HTML with a deadline.
		timeout := time.Duration(cfg.FetchTimeoutSec) * time.Second
		ctx, cancel := context.WithTimeout(r.Context(), timeout)
		defer cancel()

		rawHTML, respHeaders, err := fetcher.FetchHTML(ctx, rawURL, cfg.MaxBodyBytes)
		if err != nil {
			writeError(w, http.StatusUnprocessableEntity, "could not fetch URL: "+err.Error())
			return
		}

		// Parse and analyse.
		result, err := parser.Parse(rawHTML, rawURL, cfg.PageSpeedAPIKey)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "analysis failed: "+err.Error())
			return
		}

		// Persist result so it can be retrieved via GET /api/report/:id.
		result.ReportID = globalStore.save(result)

		result.SecurityHeaders = parser.AuditSecurityHeaders(respHeaders)

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(result)
	}
}

// ReportHandler returns an http.HandlerFunc for GET /api/report/{id}.
func ReportHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		id := r.PathValue("id")
		if id == "" {
			writeError(w, http.StatusBadRequest, "report id is required")
			return
		}
		result, ok := globalStore.get(id)
		if !ok {
			writeError(w, http.StatusNotFound, "report not found or expired")
			return
		}
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(result)
	}
}

func writeError(w http.ResponseWriter, status int, msg string) {
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(model.ErrorResponse{Error: msg})
}
