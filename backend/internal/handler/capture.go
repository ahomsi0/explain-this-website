package handler

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/ahomsi/explain-website/internal/auth"
	"github.com/ahomsi/explain-website/internal/db"
	"github.com/ahomsi/explain-website/internal/model"
	"github.com/ahomsi/explain-website/internal/parser"
)

// captureRequest is the body of POST /api/analyze-capture: a page as the
// user's own browser saw it, usually one behind a login.
type captureRequest struct {
	URL     string                `json:"url"`
	HTML    string                `json:"html"`
	Source  string                `json:"source"`
	Headers map[string]string     `json:"headers"`
	Timings *model.BrowserTimings `json:"timings"`
}

// capturedHeaderAllowlist is every response header a capture may contribute.
// The browser can read more than this, and none of the rest is needed: the
// list is what the security audit and tech detection actually look at.
var capturedHeaderAllowlist = []string{
	"Strict-Transport-Security",
	"Content-Security-Policy",
	"X-Frame-Options",
	"X-Content-Type-Options",
	"Referrer-Policy",
	"Permissions-Policy",
	"Server",
	"X-Powered-By",
	"X-Generator",
}

const (
	maxCapturedHeaderValue = 4096
	maxTimingMs            = 10 * 60 * 1000
	maxCapturedRequests    = 100_000
	maxTransferBytes       = 10 << 30
)

// CaptureHandler returns an http.HandlerFunc for POST /api/analyze-capture.
//
// It analyses HTML supplied by a signed-in user's browser. The server never
// requests the page itself, so no credential is involved and private or
// internal addresses are fine as the page URL: it is a label, not a target.
// The report belongs to the account, is never public and is never cached.
func CaptureHandler(cfg Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")

		// JSON escaping inflates HTML, so the body may be larger than the page
		// limit; the page itself is checked against the real limit below.
		r.Body = http.MaxBytesReader(w, r.Body, cfg.MaxBodyBytes*2+64*1024)

		var req captureRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			var tooLarge *http.MaxBytesError
			if errors.As(err, &tooLarge) {
				writeError(w, http.StatusRequestEntityTooLarge, capturedTooLargeMessage(cfg.MaxBodyBytes))
				return
			}
			writeError(w, http.StatusBadRequest, "invalid request body: expected {\"url\": \"...\", \"html\": \"...\"}")
			return
		}

		rawURL, urlError := normalizeAnalyzeURL(req.URL)
		if urlError != "" {
			writeError(w, http.StatusUnprocessableEntity, urlError)
			return
		}
		if strings.TrimSpace(req.HTML) == "" {
			writeError(w, http.StatusUnprocessableEntity, "the page arrived empty: open the page, wait for it to finish loading, and try again")
			return
		}
		if int64(len(req.HTML)) > cfg.MaxBodyBytes {
			writeError(w, http.StatusRequestEntityTooLarge, capturedTooLargeMessage(cfg.MaxBodyBytes))
			return
		}

		uid := auth.UserIDFromContext(r.Context())
		usage, err := currentUsage(r.Context(), uid, "")
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not check daily usage")
			return
		}
		if usage.DailyRemaining <= 0 {
			writeError(w, http.StatusTooManyRequests, usageLimitMessage(usage.DailyLimit, true))
			return
		}
		if isSuspended(r.Context(), uid) {
			writeError(w, http.StatusForbidden, "Your account has been suspended. Please contact support.")
			return
		}

		headers := capturedHeaders(req.Headers)

		parseStart := time.Now()
		parseCtx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
		result, err := parser.ParseCaptured(parseCtx, req.HTML, rawURL, headers)
		cancel()
		parseDurationMs := int(time.Since(parseStart).Milliseconds())
		if err != nil {
			if r.Context().Err() != nil {
				return
			}
			log.Printf("capture analysis failed for user %d: %v", uid, err)
			writeError(w, http.StatusInternalServerError, "analysis failed: "+err.Error())
			return
		}

		capture := &model.CaptureInfo{
			Source:     captureSource(req.Source),
			HasHeaders: len(headers) > 0,
			Timings:    sanitizeTimings(req.Timings),
		}
		result.Capture = capture
		// Without the page's real headers every check would read "missing",
		// which is a guess presented as a finding. Leave the audit out.
		if capture.HasHeaders {
			result.SecurityHeaders = parser.AuditSecurityHeaders(headers)
		} else {
			result.SecurityHeaders = []model.SecurityHeaderCheck{}
		}

		usage, err = incrementUsage(r.Context(), uid, "")
		if err != nil {
			if err == errDailyLimitReached {
				writeError(w, http.StatusTooManyRequests, usageLimitMessage(usage.DailyLimit, true))
				return
			}
			writeError(w, http.StatusInternalServerError, "could not record daily usage")
			return
		}

		// Owner-only: saved to memory and to history as not shareable, so the
		// report endpoint serves it to this account and to nobody else.
		persisted := result
		reportID := globalStore.save(persisted, uid, false)
		saveAuditForUser(r.Context(), uid, reportID, persisted, false, parseDurationMs, false)

		// The owner still needs the ID to open the report's own address.
		result.ReportID = reportID
		result.Usage = &usage

		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(result)
	}
}

func capturedTooLargeMessage(limit int64) string {
	mb := limit / (1024 * 1024)
	if mb < 1 {
		mb = 1
	}
	return "this page is too large to analyze: the limit is " + strconv.FormatInt(mb, 10) + " MB of HTML"
}

func captureSource(raw string) string {
	if strings.EqualFold(strings.TrimSpace(raw), "paste") {
		return "paste"
	}
	return "browser"
}

// capturedHeaders keeps only allowlisted response headers, with bounded
// values. Anything else the browser sent is dropped.
func capturedHeaders(in map[string]string) http.Header {
	out := http.Header{}
	if len(in) == 0 {
		return out
	}
	lower := make(map[string]string, len(in))
	for k, v := range in {
		lower[strings.ToLower(strings.TrimSpace(k))] = v
	}
	for _, name := range capturedHeaderAllowlist {
		v := strings.TrimSpace(lower[strings.ToLower(name)])
		if v == "" {
			continue
		}
		if len(v) > maxCapturedHeaderValue {
			v = v[:maxCapturedHeaderValue]
		}
		out.Set(name, v)
	}
	return out
}

// sanitizeTimings clamps browser-reported numbers: they come from a client and
// are shown in the report, so absurd or negative values are dropped.
func sanitizeTimings(t *model.BrowserTimings) *model.BrowserTimings {
	if t == nil {
		return nil
	}
	ms := func(v int) int {
		if v < 0 || v > maxTimingMs {
			return 0
		}
		return v
	}
	out := &model.BrowserTimings{
		TTFBMs:             ms(t.TTFBMs),
		DOMContentLoadedMs: ms(t.DOMContentLoadedMs),
		LoadMs:             ms(t.LoadMs),
		LCPMs:              ms(t.LCPMs),
	}
	if t.HasCLS && t.CLS >= 0 && t.CLS <= 100 {
		out.CLS, out.HasCLS = t.CLS, true
	}
	if t.Requests > 0 && t.Requests <= maxCapturedRequests {
		out.Requests = t.Requests
	}
	if t.TransferBytes > 0 && t.TransferBytes <= maxTransferBytes {
		out.TransferBytes = t.TransferBytes
	}
	if *out == (model.BrowserTimings{}) {
		return nil
	}
	return out
}

// isSuspended reports whether an account has been suspended. It fails open on
// a database error, like the rest of the request path: a brief outage must not
// lock every user out.
func isSuspended(ctx context.Context, uid int64) bool {
	if uid == 0 || !db.IsAvailable() {
		return false
	}
	var suspendedAt *time.Time
	qctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	_ = db.Pool.QueryRow(qctx, `SELECT suspended_at FROM users WHERE id = $1`, uid).Scan(&suspendedAt)
	return suspendedAt != nil
}
