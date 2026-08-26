package handler

import (
	"context"
	"net/http"
	"sort"
	"time"

	"github.com/ahomsi/explain-website/internal/adminstate"
	"github.com/ahomsi/explain-website/internal/auth"
	"github.com/ahomsi/explain-website/internal/db"
)

// ── Score trends per URL ─────────────────────────────────────────────────────

type auditTrendPoint struct {
	Date  string `json:"date"`
	Score int    `json:"score"`
}

type auditTrend struct {
	URL    string          `json:"url"`
	Count  int             `json:"count"`
	First  auditTrendPoint `json:"first"`
	Latest auditTrendPoint `json:"latest"`
}

// AuditTrendsHandler returns per-URL score movement across the user's saved
// audits — the retention hook ("72 → 81 in 3 months"). Only URLs audited at
// least twice appear; results are ordered by biggest absolute change.
func AuditTrendsHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !db.IsAvailable() {
			writeJSONError(w, http.StatusServiceUnavailable, "accounts are not enabled on this server")
			return
		}
		uid := auth.UserIDFromContext(r.Context())
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		rows, err := db.Pool.Query(ctx, `
			SELECT id, url, created_at, result
			  FROM audits
			 WHERE user_id = $1 AND deleted_at IS NULL
			 ORDER BY created_at ASC`, uid)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not load trends")
			return
		}
		defer rows.Close()

		type agg struct {
			count       int
			first, last auditTrendPoint
		}
		byURL := map[string]*agg{}
		for rows.Next() {
			var id, url string
			var createdAt time.Time
			var raw []byte
			if err := rows.Scan(&id, &url, &createdAt, &raw); err != nil {
				continue
			}
			score := 0
			if s := cachedScoreSummary(id, raw); s != nil && s.Overall != nil {
				score = *s.Overall
			}
			point := auditTrendPoint{Date: createdAt.Format("2006-01-02"), Score: score}
			a := byURL[url]
			if a == nil {
				a = &agg{}
				byURL[url] = a
			}
			a.count++
			a.last = point
			if a.count == 1 {
				a.first = point
			}
		}

		trends := []auditTrend{}
		for url, a := range byURL {
			if a.count < 2 {
				continue
			}
			trends = append(trends, auditTrend{URL: url, Count: a.count, First: a.first, Latest: a.last})
		}
		sort.SliceStable(trends, func(i, j int) bool {
			di := abs(trends[i].Latest.Score - trends[i].First.Score)
			dj := abs(trends[j].Latest.Score - trends[j].First.Score)
			if di != dj {
				return di > dj
			}
			return trends[i].Count > trends[j].Count
		})
		if len(trends) > 8 {
			trends = trends[:8]
		}
		writeJSON(w, http.StatusOK, trends)
	}
}

func abs(n int) int {
	if n < 0 {
		return -n
	}
	return n
}

// ── Public status endpoint ───────────────────────────────────────────────────

// StatusHandler reports dependency health for public status pages and
// external uptime monitors (point UptimeRobot/BetterStack at /api/status).
// Deliberately terse: booleans and coarse states only — no error strings,
// no internal details, no auth required, safe to expose.
func StatusHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		checks := map[string]string{}

		// DB: real ping.
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		if db.IsAvailable() && db.Pool.Ping(ctx) == nil {
			checks["database"] = "ok"
		} else {
			checks["database"] = "down"
		}

		checks["groq"] = healthState(adminstate.SnapshotGroqHealth())
		psHealth, resendHealth := adminstate.SnapshotHealth()
		checks["pagespeed"] = healthState(psHealth)
		checks["resend"] = healthState(resendHealth)

		status := "ok"
		for _, v := range checks {
			if v == "down" {
				status = "degraded"
				break
			}
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"status": status,
			"checks": checks,
			"time":   time.Now().UTC(),
		})
	}
}

// healthState collapses a HealthState into a coarse public state:
// ok = has succeeded and no error newer than that success;
// idle = never called in this process (unknown, not down);
// down = an error is newer than the last success.
func healthState(h adminstate.HealthState) string {
	zero := h.LastSuccessAt.IsZero()
	errNewer := !h.LastErrorAt.IsZero() && h.LastErrorAt.After(h.LastSuccessAt)
	switch {
	case errNewer:
		return "down"
	case zero && h.LastErrorAt.IsZero():
		return "idle"
	default:
		return "ok"
	}
}
