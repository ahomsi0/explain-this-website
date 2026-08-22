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
	// FetchHTML and Parse are injectable for API integration tests. Production
	// uses the secure public fetcher and parser defaults below.
	FetchHTML func(context.Context, string, int64) (string, http.Header, error)
	Parse     func(context.Context, string, string, string) (model.AnalysisResult, error)
}

// parseTimeoutSec bounds the parse phase (PageSpeed + link probes + heuristics).
// It is deliberately longer than FETCH_TIMEOUT_SEC: desktop PageSpeed runs
// regularly take 60–80s. Worst case fetch(60s) + parse(150s) + AI summary(20s)
// stays inside the server's 4-minute write timeout.
const parseTimeoutSec = 150 * time.Second

// AnalyzeHandler returns an http.HandlerFunc for POST /api/analyze.
func AnalyzeHandler(cfg Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		visitorID := ensureVisitorCookieValue(w, r)

		// Cap the request body at 8 KB — a URL payload is never legitimately larger.
		r.Body = http.MaxBytesReader(w, r.Body, 8192)

		// Decode request body.
		var req model.AnalyzeRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid request body: expected {\"url\": \"...\"}")
			return
		}

		rawURL, urlError := normalizeAnalyzeURL(req.URL)
		if urlError != "" {
			writeError(w, http.StatusUnprocessableEntity, urlError)
			return
		}

		uid := auth.UserIDFromContext(r.Context())
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
		// ?refresh=true (the dashboard's "Re-run fresh") bypasses it.
		var (
			result          model.AnalysisResult
			respHeaders     http.Header
			parseDurationMs int
			cacheHit        bool
		)
		if !req.Refresh {
			if cached, cachedHeaders, ok := cache.Default.Get(rawURL); ok {
				result = *cached
				respHeaders = cachedHeaders
				cacheHit = true
			}
		}
		if !cacheHit {
			parseStart := time.Now()
			parsed, headers, stage, err := runAnalysis(r.Context(), cfg, rawURL, req.Deep)
			parseDurationMs = int(time.Since(parseStart).Milliseconds())
			if err != nil {
				if r.Context().Err() != nil {
					return
				}
				adminstate.RecordAnalyzeFailure(rawURL, uid, stage+": "+err.Error())
				if stage == "fetch" {
					writeError(w, http.StatusUnprocessableEntity, "could not fetch URL: "+err.Error())
				} else {
					writeError(w, http.StatusInternalServerError, "analysis failed: "+err.Error())
				}
				return
			}
			result = parsed
			respHeaders = headers

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

		// Persist a copy without the caller's usage snapshot: shared reports
		// are public and must not expose the owner's plan or daily quota.
		persisted := result
		persisted.Usage = nil

		// Persist result so it can be retrieved via history and, for Pro users,
		// via public shared links.
		reportID := globalStore.save(persisted, uid, shareable)
		if shareable {
			result.ReportID = reportID
		}

		// If the user is logged in, also save to their permanent history.
		if uid != 0 {
			saveAuditForUser(r.Context(), uid, reportID, persisted, shareable, parseDurationMs, perfAvailable)
			dispatchAnalysisCompleted(uid, reportID, persisted)
		}

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(result)
	}
}

// normalizeAnalyzeURL validates and canonicalizes user input before it is used
// as a fetch target or cache key. Fragments never reach the target server, so
// removing them prevents the same page from producing separate reports.
func normalizeAnalyzeURL(input string) (string, string) {
	rawURL := strings.TrimSpace(input)
	if rawURL == "" {
		return "", "url is required"
	}
	lowerURL := strings.ToLower(rawURL)
	if !strings.HasPrefix(lowerURL, "http://") && !strings.HasPrefix(lowerURL, "https://") && !strings.Contains(rawURL, "://") {
		rawURL = "https://" + rawURL
	}

	parsed, err := url.Parse(rawURL)
	if err != nil || parsed.Host == "" || parsed.Hostname() == "" {
		return "", "invalid URL: please provide a full URL (e.g. https://example.com)"
	}
	parsed.Scheme = strings.ToLower(parsed.Scheme)
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return "", "invalid URL: must use http or https scheme"
	}
	if parsed.User != nil {
		return "", "invalid URL: credentials in URLs are not supported"
	}
	parsed.Fragment = ""
	return parsed.String(), ""
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
			var shareExpiresAt *time.Time
			var shareRevokedAt *time.Time
			err := db.Pool.QueryRow(ctx, `
				SELECT result, COALESCE(user_id, 0), is_shareable, share_expires_at, share_revoked_at
				  FROM audits
				 WHERE id = $1 AND deleted_at IS NULL`, id).Scan(&raw, &ownerID, &shareable, &shareExpiresAt, &shareRevokedAt)
			if err == nil {
				publicShareActive := shareable && shareRevokedAt == nil && shareExpiresAt != nil && shareExpiresAt.After(time.Now())
				if publicShareActive || (uid != 0 && uid == ownerID) {
					if !publicShareActive {
						var privateResult model.AnalysisResult
						if json.Unmarshal(raw, &privateResult) == nil {
							privateResult.ReportID = ""
							w.WriteHeader(http.StatusOK)
							json.NewEncoder(w).Encode(privateResult)
							return
						}
					}
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

// runAnalysis performs the fetch+parse core shared by /api/analyze and
// /api/compare-live. It returns the stage that failed ("fetch" or "parse")
// alongside the bare error so callers can pick status codes and messages.
func runAnalysis(ctx context.Context, cfg Config, rawURL string, deep bool) (model.AnalysisResult, http.Header, string, error) {
	fetchHTML := fetcher.FetchHTML
	if cfg.FetchHTML != nil {
		fetchHTML = cfg.FetchHTML
	}

	// Fetch HTML with a deadline.
	fetchCtx, fetchCancel := context.WithTimeout(ctx, time.Duration(cfg.FetchTimeoutSec)*time.Second)
	rawBody, headers, err := fetchHTML(fetchCtx, rawURL, cfg.MaxBodyBytes)
	fetchCancel()
	if err != nil {
		return model.AnalysisResult{}, nil, "fetch", err
	}

	// Parse and analyse. Parsing gets its own, longer budget because it
	// includes the PageSpeed calls, whose desktop runs regularly take 60–80s
	// and must not be cut off by the HTML-fetch deadline. The fetched response
	// headers are passed through so tech detection can use explicit signals.
	parseCtx, parseCancel := context.WithTimeout(ctx, parseTimeoutSec)
	defer parseCancel()
	var parsed model.AnalysisResult
	if cfg.Parse != nil {
		parsed, err = cfg.Parse(parseCtx, rawBody, rawURL, cfg.PageSpeedAPIKey)
	} else {
		parsed, err = parser.ParseWithOptions(parseCtx, rawBody, rawURL, cfg.PageSpeedAPIKey, deep, headers)
	}
	if err != nil {
		return model.AnalysisResult{}, nil, "parse", err
	}
	return parsed, headers, "", nil
}
