package handler

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/ahomsi/explain-website/internal/adminstate"
	"github.com/ahomsi/explain-website/internal/auth"
	"github.com/ahomsi/explain-website/internal/cache"
	"github.com/ahomsi/explain-website/internal/db"
	"github.com/ahomsi/explain-website/internal/fetcher"
	"github.com/ahomsi/explain-website/internal/llm"
	"github.com/ahomsi/explain-website/internal/model"
	"github.com/ahomsi/explain-website/internal/parser"
)

// Config holds the handler's runtime dependencies.
type Config struct {
	FetchTimeoutSec int
	MaxBodyBytes    int64
	PageSpeedAPIKey string
	Groq            *llm.Client // optional; nil disables AI summary
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

		uid := auth.UserIDFromContext(r.Context())
		visitorID := visitorIDFromRequest(r)
		usage, err := currentUsage(r.Context(), uid, visitorID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not check daily usage")
			return
		}
		if usage.DailyRemaining <= 0 {
			writeError(w, http.StatusTooManyRequests, usageLimitMessage(usage.DailyLimit, uid != 0))
			return
		}

		// Block suspended users before wasting resources on a fetch.
		if uid != 0 && db.IsAvailable() {
			var suspendedAt *time.Time
			suspendCtx, suspendCancel := context.WithTimeout(r.Context(), 3*time.Second)
			_ = db.Pool.QueryRow(suspendCtx,
				`SELECT suspended_at FROM users WHERE id = $1`, uid,
			).Scan(&suspendedAt)
			suspendCancel()
			if suspendedAt != nil {
				writeError(w, http.StatusForbidden, "Your account has been suspended. Please contact support.")
				return
			}
		}

		// Cache lookup — skips the fetch + parse + PageSpeed call when the
		// same URL was analysed in the last 10 minutes. Demos, shared
		// examples, and "re-run" clicks all become near-instant. Usage
		// still counts and the result is still saved to the user's history.
		var (
			result          model.AnalysisResult
			respHeaders     http.Header
			parseDurationMs int
			cacheHit        bool
		)
		if cached, cachedHeaders, ok := cache.Default.Get(rawURL); ok {
			result = *cached
			respHeaders = cachedHeaders
			cacheHit = true
		} else {
			// Fetch HTML with a deadline.
			timeout := time.Duration(cfg.FetchTimeoutSec) * time.Second
			ctx, cancel := context.WithTimeout(r.Context(), timeout)
			defer cancel()

			rawHTML, headers, err := fetcher.FetchHTML(ctx, rawURL, cfg.MaxBodyBytes)
			if err != nil {
				adminstate.RecordAnalyzeFailure(rawURL, uid, "fetch: "+err.Error())
				writeError(w, http.StatusUnprocessableEntity, "could not fetch URL: "+err.Error())
				return
			}
			respHeaders = headers

			// Parse and analyse.
			parseStart := time.Now()
			parsed, err := parser.Parse(r.Context(), rawHTML, rawURL, cfg.PageSpeedAPIKey)
			parseDurationMs = int(time.Since(parseStart).Milliseconds())
			if err != nil {
				if r.Context().Err() != nil {
					return
				}
				adminstate.RecordAnalyzeFailure(rawURL, uid, "parse: "+err.Error())
				writeError(w, http.StatusInternalServerError, "analysis failed: "+err.Error())
				return
			}
			result = parsed

			// Populate the cache *before* per-request decoration so cached
			// hits don't carry stale usage/reportID/security-headers state.
			cache.Default.Set(rawURL, &result, respHeaders)
		}

		// Per-request decoration — runs for both fresh and cached results so
		// security headers reflect whatever the fetch saw, and usage/reportID
		// are per-caller.
		result.SecurityHeaders = parser.AuditSecurityHeaders(respHeaders)
		if cacheHit {
			w.Header().Set("X-Cache", "HIT")
		} else {
			w.Header().Set("X-Cache", "MISS")
		}

		// AI summary — best-effort. If Groq is unconfigured or the call
		// fails, the analysis still succeeds and AISummary stays "". The
		// UI hides the section in that case. Cache hits already include
		// whatever summary the cached entry was created with, so we skip
		// the call entirely on hit to save Groq spend.
		if !cacheHit && cfg.Groq != nil && cfg.Groq.Enabled() {
			summaryCtx, cancelSummary := context.WithTimeout(r.Context(), 20*time.Second)
			summary, err := cfg.Groq.Summarise(summaryCtx, &result)
			cancelSummary()
			if err != nil {
				if err != llm.ErrDisabled {
					log.Printf("groq summary failed for %s: %v", rawURL, err)
				}
			} else {
				result.AISummary = strings.TrimSpace(summary)
				// Re-cache so the next hit returns the summary too.
				cache.Default.Set(rawURL, &result, respHeaders)
			}
		}

		usage, err = incrementUsage(r.Context(), uid, visitorID)
		if err != nil {
			if err == errDailyLimitReached {
				writeError(w, http.StatusTooManyRequests, usageLimitMessage(usage.DailyLimit, uid != 0))
				return
			}
			writeError(w, http.StatusInternalServerError, "could not record daily usage")
			return
		}
		result.Usage = &usage
		shareable := uid != 0 && usage.Plan == planPro
		perfAvailable := result.Performance != nil && result.Performance.Available

		// Persist result so it can be retrieved via history and, for Pro users,
		// via public shared links.
		reportID := globalStore.save(result, uid, shareable)
		if shareable {
			result.ReportID = reportID
		}

		// If the user is logged in, also save to their permanent history.
		if uid != 0 {
			saveAuditForUser(r.Context(), uid, reportID, result, shareable, parseDurationMs, perfAvailable)
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(result)
	}
}

// ReportHandler returns an http.HandlerFunc for GET /api/report/{id}.
// Tries the in-memory store first (fast, fresh), falling back to the user's
// persisted DB audits when the report has aged out of memory.
func ReportHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		id := r.PathValue("id")
		if id == "" {
			writeError(w, http.StatusBadRequest, "report id is required")
			return
		}
		uid := auth.UserIDFromContext(r.Context())
		if entry, ok := globalStore.get(id); ok {
			if entry.shared || (uid != 0 && uid == entry.userID) {
				if entry.shared {
					entry.result.ReportID = id
				} else {
					entry.result.ReportID = ""
				}
				w.WriteHeader(http.StatusOK)
				json.NewEncoder(w).Encode(entry.result)
				return
			}
			writeError(w, http.StatusNotFound, "report not found or expired")
			return
		}
		if db.IsAvailable() {
			ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
			defer cancel()
			var raw []byte
			var ownerID int64
			var shareable bool
			err := db.Pool.QueryRow(ctx, `SELECT result, COALESCE(user_id, 0), is_shareable FROM audits WHERE id = $1`, id).Scan(&raw, &ownerID, &shareable)
			if err == nil {
				if shareable || (uid != 0 && uid == ownerID) {
					w.WriteHeader(http.StatusOK)
					w.Write(raw)
					return
				}
				writeError(w, http.StatusNotFound, "report not found or expired")
				return
			}
		}
		writeError(w, http.StatusNotFound, "report not found or expired")
	}
}

func writeError(w http.ResponseWriter, status int, msg string) {
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(model.ErrorResponse{Error: msg})
}
