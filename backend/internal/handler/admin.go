package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/ahomsi/explain-website/internal/adminstate"
	"github.com/ahomsi/explain-website/internal/auth"
	"github.com/ahomsi/explain-website/internal/db"
	"github.com/ahomsi/explain-website/internal/email"
)

type adminUserRow struct {
	ID                 int64      `json:"id"`
	Email              string     `json:"email"`
	Plan               string     `json:"plan"`
	SubscriptionStatus string     `json:"subscriptionStatus"`
	DailyLimit         int        `json:"dailyLimit"`
	DailyUsed          int        `json:"dailyUsed"`
	DailyRemaining     int        `json:"dailyRemaining"`
	CreatedAt          time.Time  `json:"createdAt"`
	SuspendedAt        *time.Time `json:"suspendedAt,omitempty"`
	AdminNote          string     `json:"adminNote,omitempty"`
}

type adminVisitorRow struct {
	VisitorID      string    `json:"visitorId"`
	DailyLimit     int       `json:"dailyLimit"`
	DailyUsed      int       `json:"dailyUsed"`
	DailyRemaining int       `json:"dailyRemaining"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

// recentAuditRow surfaces a single recent analysis (joined with the user's email).
type recentAuditRow struct {
	ID        string    `json:"id"`
	URL       string    `json:"url"`
	Title     string    `json:"title"`
	Email     string    `json:"email,omitempty"` // empty for anonymous
	CreatedAt time.Time `json:"createdAt"`
}

type dayCount struct {
	Date  string `json:"date"` // YYYY-MM-DD
	Count int    `json:"count"`
}

type urlCount struct {
	URL   string `json:"url"`
	Count int    `json:"count"`
}

type systemHealth struct {
	DBOK            bool                   `json:"dbOk"`
	DBLatencyMs     int64                  `json:"dbLatencyMs"`
	PageSpeedKeySet bool                   `json:"pagespeedKeySet"`
	ResendKeySet    bool                   `json:"resendKeySet"`
	JWTSecretSet    bool                   `json:"jwtSecretSet"`
	TapKeySet       bool                   `json:"tapKeySet"`
	GroqKeySet      bool                   `json:"groqKeySet"`
	Groq            adminstate.HealthState `json:"groq"`
	PageSpeed       adminstate.HealthState `json:"pagespeed"`
	Resend          adminstate.HealthState `json:"resend"`
}

type adminOverviewResp struct {
	CurrentDate        string                    `json:"currentDate"`
	AdminEmail         string                    `json:"adminEmail,omitempty"`
	AnySignedInIsAdmin bool                      `json:"anySignedInIsAdmin"`
	Users              []adminUserRow            `json:"users"`
	AnonymousVisitors  []adminVisitorRow         `json:"anonymousVisitors"`
	RecentAudits       []recentAuditRow          `json:"recentAudits"`
	AuditsByDay        []dayCount                `json:"auditsByDay"`
	TopURLs            []urlCount                `json:"topUrls"`
	FailureLog         []adminstate.FailureEntry `json:"failureLog"`
	SystemHealth       systemHealth              `json:"systemHealth"`
	FeatureFlags       map[string]bool           `json:"featureFlags"`
	SlowAudits         []slowAuditRow            `json:"slowAudits"`
	AuditOutcomes      []auditOutcomeRow         `json:"auditOutcomes"`
	ConversionFunnel   conversionFunnel          `json:"conversionFunnel"`
}

type updateUserUsageReq struct {
	UserID int64 `json:"userId"`
	Count  int   `json:"count"`
}

type updateAnonUsageReq struct {
	VisitorID string `json:"visitorId"`
	Count     int    `json:"count"`
}

type updateUserPlanReq struct {
	UserID             int64  `json:"userId"`
	Plan               string `json:"plan"`
	SubscriptionStatus string `json:"subscriptionStatus"`
}

type toggleFlagReq struct {
	Name    string `json:"name"`
	Enabled bool   `json:"enabled"`
}

type broadcastReq struct {
	Subject string `json:"subject"`
	Body    string `json:"body"`
}

type broadcastResp struct {
	Sent   int `json:"sent"`
	Failed int `json:"failed"`
	Total  int `json:"total"`
}

type patchUserReq struct {
	Plan      *string `json:"plan"`      // "free" | "pro" — nil means no change
	Suspended *bool   `json:"suspended"` // nil means no change
	Note      *string `json:"note"`      // nil means no change
}

type slowAuditRow struct {
	URL        string    `json:"url"`
	DurationMs int       `json:"durationMs"`
	CreatedAt  time.Time `json:"createdAt"`
}

type auditOutcomeRow struct {
	Date     string `json:"date"`
	Total    int    `json:"total"`
	PerfOK   int    `json:"perfOk"`
	PerfFail int    `json:"perfFail"`
}

type conversionFunnel struct {
	LandingViews      int `json:"landingViews"`
	AnalysisStarted   int `json:"analysisStarted"`
	AnalysisCompleted int `json:"analysisCompleted"`
	SignupCompleted   int `json:"signupCompleted"`
	RepeatUsage       int `json:"repeatUsage"`
}

func AdminOverviewHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !db.IsAvailable() {
			writeJSONError(w, http.StatusServiceUnavailable, "dashboard is not enabled on this server")
			return
		}
		if err := requireAdmin(r.Context()); err != nil {
			writeJSONError(w, http.StatusForbidden, err.Error())
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		// Users + their usage today.
		users := []adminUserRow{}
		if rows, err := db.Pool.Query(ctx, `
			SELECT u.id, u.email, u.plan, u.subscription_status,
			       COALESCE(du.count, 0), u.created_at,
			       u.suspended_at, COALESCE(u.admin_note, '')
			  FROM users u
			  LEFT JOIN user_daily_usage du
			    ON du.user_id = u.id
			   AND du.usage_date = CURRENT_DATE
			 ORDER BY u.created_at DESC
			 LIMIT 200`); err == nil {
			for rows.Next() {
				var row adminUserRow
				if err := rows.Scan(
					&row.ID, &row.Email, &row.Plan, &row.SubscriptionStatus,
					&row.DailyUsed, &row.CreatedAt, &row.SuspendedAt, &row.AdminNote,
				); err == nil {
					row.Plan = effectivePlan(row.Plan, row.SubscriptionStatus)
					row.DailyLimit = dailyLimitForPlan(row.Plan)
					row.DailyRemaining = max(0, row.DailyLimit-row.DailyUsed)
					users = append(users, row)
				}
			}
			rows.Close()
		}

		// Anonymous visitors today.
		visitors := []adminVisitorRow{}
		if rows, err := db.Pool.Query(ctx, `
			SELECT visitor_id, count, updated_at
			  FROM anonymous_daily_usage
			 WHERE usage_date = CURRENT_DATE
			 ORDER BY updated_at DESC
			 LIMIT 200`); err == nil {
			for rows.Next() {
				var row adminVisitorRow
				if err := rows.Scan(&row.VisitorID, &row.DailyUsed, &row.UpdatedAt); err == nil {
					row.DailyLimit = freeDailyLimit
					row.DailyRemaining = max(0, row.DailyLimit-row.DailyUsed)
					visitors = append(visitors, row)
				}
			}
			rows.Close()
		}

		// Recent audits — last 20 across all users. Soft-deleted rows are
		// excluded: this is an itemized list, so it must respect deletion.
		// (Aggregate views below intentionally keep deleted rows so clearing
		// history can't erase activity analytics.)
		recent := []recentAuditRow{}
		if rows, err := db.Pool.Query(ctx, `
			SELECT a.id, a.url, COALESCE(a.title, ''), COALESCE(u.email, ''), a.created_at
			  FROM audits a
			  LEFT JOIN users u ON u.id = a.user_id
			 WHERE a.deleted_at IS NULL
			 ORDER BY a.created_at DESC
			 LIMIT 20`); err == nil {
			for rows.Next() {
				var row recentAuditRow
				if err := rows.Scan(&row.ID, &row.URL, &row.Title, &row.Email, &row.CreatedAt); err == nil {
					recent = append(recent, row)
				}
			}
			rows.Close()
		}

		// Audits by day for the last 14 days (filling in zero days client-side is easier
		// than generating series in SQL across all DB engines).
		auditsByDay := []dayCount{}
		if rows, err := db.Pool.Query(ctx, `
			SELECT to_char(created_at::date, 'YYYY-MM-DD') AS d, COUNT(*) AS n
			  FROM audits
			 WHERE created_at >= NOW() - INTERVAL '14 days'
			 GROUP BY d
			 ORDER BY d ASC`); err == nil {
			counts := map[string]int{}
			for rows.Next() {
				var d string
				var n int
				if err := rows.Scan(&d, &n); err == nil {
					counts[d] = n
				}
			}
			rows.Close()
			// Fill zero-count days so the chart renders evenly.
			for i := 13; i >= 0; i-- {
				date := time.Now().AddDate(0, 0, -i).Format("2006-01-02")
				auditsByDay = append(auditsByDay, dayCount{Date: date, Count: counts[date]})
			}
		}

		// Top URLs analyzed in the last 30 days.
		topUrls := []urlCount{}
		if rows, err := db.Pool.Query(ctx, `
			SELECT url, COUNT(*) AS n
			  FROM audits
			 WHERE created_at >= NOW() - INTERVAL '30 days'
			 GROUP BY url
			 ORDER BY n DESC
			 LIMIT 10`); err == nil {
			for rows.Next() {
				var row urlCount
				if err := rows.Scan(&row.URL, &row.Count); err == nil {
					topUrls = append(topUrls, row)
				}
			}
			rows.Close()
		}

		// Slowest 10 audits in last 30 days.
		slowAudits := []slowAuditRow{}
		if rows, err := db.Pool.Query(ctx, `
			SELECT url, duration_ms, created_at
			  FROM audits
			 WHERE duration_ms IS NOT NULL AND deleted_at IS NULL
			   AND created_at > NOW() - INTERVAL '30 days'
			 ORDER BY duration_ms DESC
			 LIMIT 10`); err == nil {
			for rows.Next() {
				var r slowAuditRow
				if err := rows.Scan(&r.URL, &r.DurationMs, &r.CreatedAt); err == nil {
					slowAudits = append(slowAudits, r)
				}
			}
			rows.Close()
		}

		// Audit outcomes (PageSpeed hit rate) last 14 days.
		auditOutcomes := []auditOutcomeRow{}
		if rows, err := db.Pool.Query(ctx, `
			SELECT to_char(created_at::date, 'YYYY-MM-DD') AS d,
			       COUNT(*)                                 AS total,
			       SUM(CASE WHEN perf_available IS TRUE THEN 1 ELSE 0 END) AS perf_ok,
			       SUM(CASE WHEN perf_available IS NOT TRUE THEN 1 ELSE 0 END) AS perf_fail
			  FROM audits
			 WHERE deleted_at IS NULL
			   AND created_at > NOW() - INTERVAL '14 days'
			 GROUP BY d
			 ORDER BY d DESC`); err == nil {
			for rows.Next() {
				var r auditOutcomeRow
				if err := rows.Scan(&r.Date, &r.Total, &r.PerfOK, &r.PerfFail); err == nil {
					auditOutcomes = append(auditOutcomes, r)
				}
			}
			rows.Close()
		}

		// Consent-gated first-party conversion events over the last 30 days.
		funnel := conversionFunnel{}
		if rows, err := db.Pool.Query(ctx, `
			SELECT event_name, COUNT(*)
			  FROM conversion_events
			 WHERE created_at > NOW() - INTERVAL '30 days'
			 GROUP BY event_name`); err == nil {
			for rows.Next() {
				var name string
				var count int
				if err := rows.Scan(&name, &count); err != nil {
					continue
				}
				switch name {
				case "landing_view":
					funnel.LandingViews = count
				case "analysis_started":
					funnel.AnalysisStarted = count
				case "analysis_completed":
					funnel.AnalysisCompleted = count
				case "signup_completed":
					funnel.SignupCompleted = count
				case "repeat_usage":
					funnel.RepeatUsage = count
				}
			}
			rows.Close()
		}

		// Failure log + health: in-memory.
		failures := adminstate.SnapshotFailures()
		psHealth, resendHealth := adminstate.SnapshotHealth()
		flags := adminstate.SnapshotFlags()

		// DB health: ping with a trivial query and time it.
		health := systemHealth{
			PageSpeedKeySet: os.Getenv("PAGESPEED_API_KEY") != "",
			ResendKeySet:    os.Getenv("RESEND_API_KEY") != "",
			JWTSecretSet:    os.Getenv("JWT_SECRET") != "",
			TapKeySet:       os.Getenv("TAP_SECRET_KEY") != "",
			GroqKeySet:      os.Getenv("GROQ_API_KEY") != "",
			Groq:            adminstate.SnapshotGroqHealth(),
			PageSpeed:       psHealth,
			Resend:          resendHealth,
		}
		pingCtx, pingCancel := context.WithTimeout(ctx, 2*time.Second)
		startPing := time.Now()
		if err := db.Pool.Ping(pingCtx); err == nil {
			health.DBOK = true
			health.DBLatencyMs = time.Since(startPing).Milliseconds()
		}
		pingCancel()

		adminEmail := strings.TrimSpace(os.Getenv("ADMIN_EMAIL"))
		writeJSON(w, http.StatusOK, adminOverviewResp{
			CurrentDate:        time.Now().Format("2006-01-02"),
			AdminEmail:         adminEmail,
			AnySignedInIsAdmin: adminEmail == "",
			Users:              users,
			AnonymousVisitors:  visitors,
			RecentAudits:       recent,
			AuditsByDay:        auditsByDay,
			TopURLs:            topUrls,
			FailureLog:         failures,
			SystemHealth:       health,
			FeatureFlags:       flags,
			SlowAudits:         slowAudits,
			AuditOutcomes:      auditOutcomes,
			ConversionFunnel:   funnel,
		})
	}
}

func AdminUpdateUserUsageHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !db.IsAvailable() {
			writeJSONError(w, http.StatusServiceUnavailable, "dashboard is not enabled on this server")
			return
		}
		if err := requireAdmin(r.Context()); err != nil {
			writeJSONError(w, http.StatusForbidden, err.Error())
			return
		}

		limitAdminBody(w, r)
		var body updateUserUsageReq
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeJSONError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		if body.UserID == 0 || body.Count < 0 {
			writeJSONError(w, http.StatusBadRequest, "userId and non-negative count are required")
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()
		_, err := db.Pool.Exec(ctx, `
			INSERT INTO user_daily_usage (user_id, usage_date, count, created_at, updated_at)
			VALUES ($1, CURRENT_DATE, $2, NOW(), NOW())
			ON CONFLICT (user_id, usage_date) DO UPDATE
			SET count = EXCLUDED.count,
			    updated_at = NOW()`,
			body.UserID, body.Count)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not update usage")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"ok": true})
	}
}

func AdminUpdateAnonUsageHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !db.IsAvailable() {
			writeJSONError(w, http.StatusServiceUnavailable, "dashboard is not enabled on this server")
			return
		}
		if err := requireAdmin(r.Context()); err != nil {
			writeJSONError(w, http.StatusForbidden, err.Error())
			return
		}

		limitAdminBody(w, r)
		var body updateAnonUsageReq
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeJSONError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		body.VisitorID = strings.TrimSpace(body.VisitorID)
		if body.VisitorID == "" || body.Count < 0 {
			writeJSONError(w, http.StatusBadRequest, "visitorId and non-negative count are required")
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()
		_, err := db.Pool.Exec(ctx, `
			INSERT INTO anonymous_daily_usage (visitor_id, usage_date, count, created_at, updated_at)
			VALUES ($1, CURRENT_DATE, $2, NOW(), NOW())
			ON CONFLICT (visitor_id, usage_date) DO UPDATE
			SET count = EXCLUDED.count,
			    updated_at = NOW()`,
			body.VisitorID, body.Count)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not update visitor usage")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"ok": true})
	}
}

func AdminUpdateUserPlanHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !db.IsAvailable() {
			writeJSONError(w, http.StatusServiceUnavailable, "dashboard is not enabled on this server")
			return
		}
		if err := requireAdmin(r.Context()); err != nil {
			writeJSONError(w, http.StatusForbidden, err.Error())
			return
		}

		limitAdminBody(w, r)
		var body updateUserPlanReq
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeJSONError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		body.Plan = strings.ToLower(strings.TrimSpace(body.Plan))
		body.SubscriptionStatus = strings.ToLower(strings.TrimSpace(body.SubscriptionStatus))
		if body.UserID == 0 || (body.Plan != planFree && body.Plan != planPro) {
			writeJSONError(w, http.StatusBadRequest, "valid userId and plan are required")
			return
		}
		if body.SubscriptionStatus == "" {
			if body.Plan == planPro {
				body.SubscriptionStatus = "active"
			} else {
				body.SubscriptionStatus = "inactive"
			}
		}

		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()
		_, err := db.Pool.Exec(ctx, `
			UPDATE users
			   SET plan = $1,
			       subscription_status = $2
			 WHERE id = $3`,
			body.Plan, body.SubscriptionStatus, body.UserID)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not update plan")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"ok": true})
	}
}

// AdminPatchUserHandler handles PATCH /api/admin/users/{id}.
// Accepts { plan?, suspended?, note? } and updates only present fields.
func AdminPatchUserHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !db.IsAvailable() {
			writeJSONError(w, http.StatusServiceUnavailable, "dashboard is not enabled on this server")
			return
		}
		if err := requireAdmin(r.Context()); err != nil {
			writeJSONError(w, http.StatusForbidden, err.Error())
			return
		}
		idStr := r.PathValue("id")
		if idStr == "" {
			writeJSONError(w, http.StatusBadRequest, "missing id")
			return
		}
		userID, err := strconv.ParseInt(idStr, 10, 64)
		if err != nil || userID == 0 {
			writeJSONError(w, http.StatusBadRequest, "invalid id")
			return
		}

		limitAdminBody(w, r)
		var body patchUserReq
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeJSONError(w, http.StatusBadRequest, "invalid request body")
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		if body.Plan != nil {
			plan := *body.Plan
			if plan != "free" && plan != "pro" {
				writeJSONError(w, http.StatusBadRequest, "plan must be 'free' or 'pro'")
				return
			}
			status := "inactive"
			if plan == "pro" {
				status = "active"
			}
			tag, execErr := db.Pool.Exec(ctx,
				`UPDATE users SET plan = $1, subscription_status = $2 WHERE id = $3`,
				plan, status, userID)
			if execErr != nil {
				writeJSONError(w, http.StatusInternalServerError, "could not update plan")
				return
			}
			if tag.RowsAffected() == 0 {
				writeJSONError(w, http.StatusNotFound, "user not found")
				return
			}
		}

		if body.Suspended != nil {
			if *body.Suspended {
				_, err = db.Pool.Exec(ctx,
					`UPDATE users SET suspended_at = NOW() WHERE id = $1 AND suspended_at IS NULL`, userID)
			} else {
				_, err = db.Pool.Exec(ctx,
					`UPDATE users SET suspended_at = NULL WHERE id = $1`, userID)
			}
			if err != nil {
				writeJSONError(w, http.StatusInternalServerError, "could not update suspension")
				return
			}
		}

		if body.Note != nil {
			note := strings.TrimSpace(*body.Note)
			_, err = db.Pool.Exec(ctx,
				`UPDATE users SET admin_note = NULLIF($1, '') WHERE id = $2`, note, userID)
			if err != nil {
				writeJSONError(w, http.StatusInternalServerError, "could not update note")
				return
			}
		}

		w.WriteHeader(http.StatusNoContent)
	}
}

// AdminToggleFlagHandler turns a feature flag on or off and persists it when a DB is available.
func AdminToggleFlagHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if err := requireAdmin(r.Context()); err != nil {
			writeJSONError(w, http.StatusForbidden, err.Error())
			return
		}
		limitAdminBody(w, r)
		var body toggleFlagReq
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeJSONError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		body.Name = strings.TrimSpace(body.Name)
		if body.Name == "" {
			writeJSONError(w, http.StatusBadRequest, "flag name is required")
			return
		}
		if db.IsAvailable() {
			ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
			_, err := db.Pool.Exec(ctx, `
				INSERT INTO feature_flags (name, enabled, updated_at)
				VALUES ($1, $2, NOW())
				ON CONFLICT (name) DO UPDATE SET enabled = EXCLUDED.enabled, updated_at = NOW()`,
				body.Name, body.Enabled)
			cancel()
			if err != nil {
				writeJSONError(w, http.StatusInternalServerError, "could not persist feature flag")
				return
			}
		}
		adminstate.SetFlag(body.Name, body.Enabled)
		writeJSON(w, http.StatusOK, map[string]any{"ok": true, "name": body.Name, "enabled": body.Enabled})
	}
}

// AdminBroadcastHandler sends an email to every user. Best-effort: returns the
// counts of successful + failed sends so the admin sees what happened.
func AdminBroadcastHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !db.IsAvailable() {
			writeJSONError(w, http.StatusServiceUnavailable, "broadcasts are not enabled on this server")
			return
		}
		if err := requireAdmin(r.Context()); err != nil {
			writeJSONError(w, http.StatusForbidden, err.Error())
			return
		}
		limitAdminBody(w, r)
		var body broadcastReq
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeJSONError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		body.Subject = strings.TrimSpace(body.Subject)
		body.Body = strings.TrimSpace(body.Body)
		if body.Subject == "" || body.Body == "" {
			writeJSONError(w, http.StatusBadRequest, "subject and body are required")
			return
		}

		// Fetch every user's email.
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()
		rows, err := db.Pool.Query(ctx, `SELECT email FROM users WHERE email <> ''`)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not load recipients")
			return
		}
		defer rows.Close()
		recipients := []string{}
		for rows.Next() {
			var e string
			if err := rows.Scan(&e); err == nil && e != "" {
				recipients = append(recipients, e)
			}
		}

		// Send in parallel with a small pool to avoid hammering Resend.
		const concurrency = 4
		sem := make(chan struct{}, concurrency)
		var (
			wg     sync.WaitGroup
			mu     sync.Mutex
			sent   int
			failed int
		)
		for _, addr := range recipients {
			to := addr
			wg.Add(1)
			sem <- struct{}{}
			go func() {
				defer wg.Done()
				defer func() { <-sem }()
				sendCtx, sendCancel := context.WithTimeout(context.Background(), 15*time.Second)
				defer sendCancel()
				if err := email.SendBroadcast(sendCtx, to, body.Subject, body.Body); err != nil {
					mu.Lock()
					failed++
					mu.Unlock()
					return
				}
				mu.Lock()
				sent++
				mu.Unlock()
			}()
		}
		wg.Wait()

		writeJSON(w, http.StatusOK, broadcastResp{Sent: sent, Failed: failed, Total: len(recipients)})
	}
}

func requireAdmin(ctx context.Context) error {
	uid := auth.UserIDFromContext(ctx)
	if uid == 0 {
		return errForbidden("authentication required")
	}

	adminEmail := strings.TrimSpace(strings.ToLower(os.Getenv("ADMIN_EMAIL")))
	if adminEmail == "" {
		return errForbidden("admin access is not configured")
	}

	var emailAddr string
	qctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	if err := db.Pool.QueryRow(qctx, `SELECT email FROM users WHERE id = $1`, uid).Scan(&emailAddr); err != nil {
		return errForbidden("admin access required")
	}
	if strings.ToLower(strings.TrimSpace(emailAddr)) != adminEmail {
		return errForbidden("admin access required")
	}
	return nil
}

func limitAdminBody(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 64*1024)
}

type forbiddenError string

func (e forbiddenError) Error() string { return string(e) }

func errForbidden(msg string) error { return forbiddenError(msg) }

// AdminUsersHandler returns a cursor-paginated list of all users.
// Query params: limit (default 50, max 200), before (user ID — returns rows with id < before).
func AdminUsersHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if err := requireAdmin(r.Context()); err != nil {
			writeJSONError(w, http.StatusForbidden, err.Error())
			return
		}

		limit := 50
		if v := r.URL.Query().Get("limit"); v != "" {
			if n, err := strconv.Atoi(v); err == nil && n > 0 {
				if n > 200 {
					n = 200
				}
				limit = n
			}
		}

		var before int64
		if v := r.URL.Query().Get("before"); v != "" {
			if n, err := strconv.ParseInt(v, 10, 64); err == nil {
				before = n
			}
		}

		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		var rows *struct{ Rows interface{} }
		_ = rows

		type userRow struct {
			ID                 int64      `json:"id"`
			Email              string     `json:"email"`
			Plan               string     `json:"plan"`
			SubscriptionStatus string     `json:"subscriptionStatus"`
			EmailVerifiedAt    *time.Time `json:"emailVerifiedAt,omitempty"`
			SuspendedAt        *time.Time `json:"suspendedAt,omitempty"`
			AdminNote          string     `json:"adminNote,omitempty"`
			CreatedAt          time.Time  `json:"createdAt"`
		}

		query := `SELECT id, email, plan, subscription_status, email_verified_at,
		                 suspended_at, COALESCE(admin_note,''), created_at
		            FROM users
		           WHERE ($1 = 0 OR id < $1)
		        ORDER BY id DESC
		           LIMIT $2`

		pgRows, err := db.Pool.Query(ctx, query, before, limit+1)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not list users")
			return
		}
		defer pgRows.Close()

		users := make([]userRow, 0, limit)
		for pgRows.Next() {
			var u userRow
			if err := pgRows.Scan(&u.ID, &u.Email, &u.Plan, &u.SubscriptionStatus,
				&u.EmailVerifiedAt, &u.SuspendedAt, &u.AdminNote, &u.CreatedAt); err != nil {
				writeJSONError(w, http.StatusInternalServerError, "could not read users")
				return
			}
			users = append(users, u)
		}
		if err := pgRows.Err(); err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not list users")
			return
		}

		var nextCursor int64
		hasMore := len(users) > limit
		if hasMore {
			users = users[:limit]
			nextCursor = users[len(users)-1].ID
		}

		writeJSON(w, http.StatusOK, map[string]any{
			"users":      users,
			"hasMore":    hasMore,
			"nextCursor": nextCursor,
		})
	}
}
