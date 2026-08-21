package handler

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/ahomsi/explain-website/internal/auth"
	"github.com/ahomsi/explain-website/internal/db"
)

var conversionEventNames = map[string]struct{}{
	"landing_view":              {},
	"analysis_started":          {},
	"analysis_completed":        {},
	"analysis_failed":           {},
	"signup_started":            {},
	"signup_completed":          {},
	"signup_failed":             {},
	"login_started":             {},
	"login_completed":           {},
	"login_failed":              {},
	"analytics_consent_granted": {},
	"repeat_usage":              {},
	"pricing_view":              {},
	"upgrade_started":           {},
	"upgrade_failed":            {},
	"subscription_cancelled":    {},
}

type conversionEventRequest struct {
	Event      string         `json:"event"`
	Source     string         `json:"source,omitempty"`
	Properties map[string]any `json:"properties,omitempty"`
}

// ConversionEventHandler records consented, first-party funnel events. It
// stores only a signed pseudonymous visitor ID, an optional account ID, and
// small allowlisted event properties; it does not collect page contents or
// credentials.
func ConversionEventHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		visitorID := ensureVisitorCookieValue(w, r)
		if !db.IsAvailable() {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		r.Body = http.MaxBytesReader(w, r.Body, 8*1024)
		var req conversionEventRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSONError(w, http.StatusBadRequest, "invalid event body")
			return
		}
		req.Event = strings.TrimSpace(req.Event)
		if _, ok := conversionEventNames[req.Event]; !ok {
			writeJSONError(w, http.StatusBadRequest, "unsupported event")
			return
		}
		req.Source = strings.TrimSpace(req.Source)
		if len(req.Source) > 64 {
			writeJSONError(w, http.StatusBadRequest, "event source is too long")
			return
		}
		if req.Properties == nil {
			req.Properties = map[string]any{}
		}
		properties, err := json.Marshal(req.Properties)
		if err != nil {
			writeJSONError(w, http.StatusBadRequest, "invalid event properties")
			return
		}

		var userID any
		if uid := auth.UserIDFromContext(r.Context()); uid != 0 {
			userID = uid
		}
		_, err = db.Pool.Exec(r.Context(), `
			INSERT INTO conversion_events (event_name, anonymous_id, user_id, source, properties)
			VALUES ($1, $2, $3, NULLIF($4, ''), $5)`,
			req.Event, visitorID, userID, req.Source, properties)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not record event")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}
