package handler

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/ahomsi/explain-website/internal/auth"
	"github.com/ahomsi/explain-website/internal/db"
)

type adminUserRow struct {
	ID                 int64     `json:"id"`
	Email              string    `json:"email"`
	Plan               string    `json:"plan"`
	SubscriptionStatus string    `json:"subscriptionStatus"`
	DailyLimit         int       `json:"dailyLimit"`
	DailyUsed          int       `json:"dailyUsed"`
	DailyRemaining     int       `json:"dailyRemaining"`
	CreatedAt          time.Time `json:"createdAt"`
}

type adminVisitorRow struct {
	VisitorID      string    `json:"visitorId"`
	DailyLimit     int       `json:"dailyLimit"`
	DailyUsed      int       `json:"dailyUsed"`
	DailyRemaining int       `json:"dailyRemaining"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

type adminOverviewResp struct {
	CurrentDate        string            `json:"currentDate"`
	AdminEmail         string            `json:"adminEmail,omitempty"`
	AnySignedInIsAdmin bool              `json:"anySignedInIsAdmin"`
	Users              []adminUserRow    `json:"users"`
	AnonymousVisitors  []adminVisitorRow `json:"anonymousVisitors"`
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

		ctx, cancel := context.WithTimeout(r.Context(), 8*time.Second)
		defer cancel()

		rows, err := db.Pool.Query(ctx, `
			SELECT u.id, u.email, u.plan, u.subscription_status, COALESCE(du.count, 0), u.created_at
			  FROM users u
			  LEFT JOIN user_daily_usage du
			    ON du.user_id = u.id
			   AND du.usage_date = CURRENT_DATE
			 ORDER BY u.created_at DESC
			 LIMIT 200`)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not load dashboard")
			return
		}
		defer rows.Close()

		users := []adminUserRow{}
		for rows.Next() {
			var row adminUserRow
			if err := rows.Scan(&row.ID, &row.Email, &row.Plan, &row.SubscriptionStatus, &row.DailyUsed, &row.CreatedAt); err != nil {
				writeJSONError(w, http.StatusInternalServerError, "could not load dashboard")
				return
			}
			row.Plan = effectivePlan(row.Plan, row.SubscriptionStatus)
			row.DailyLimit = dailyLimitForPlan(row.Plan)
			row.DailyRemaining = max(0, row.DailyLimit-row.DailyUsed)
			users = append(users, row)
		}

		anonRows, err := db.Pool.Query(ctx, `
			SELECT visitor_id, count, updated_at
			  FROM anonymous_daily_usage
			 WHERE usage_date = CURRENT_DATE
			 ORDER BY updated_at DESC
			 LIMIT 200`)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not load dashboard")
			return
		}
		defer anonRows.Close()

		visitors := []adminVisitorRow{}
		for anonRows.Next() {
			var row adminVisitorRow
			if err := anonRows.Scan(&row.VisitorID, &row.DailyUsed, &row.UpdatedAt); err != nil {
				writeJSONError(w, http.StatusInternalServerError, "could not load dashboard")
				return
			}
			row.DailyLimit = freeDailyLimit
			row.DailyRemaining = max(0, row.DailyLimit-row.DailyUsed)
			visitors = append(visitors, row)
		}

		adminEmail := strings.TrimSpace(os.Getenv("ADMIN_EMAIL"))
		writeJSON(w, http.StatusOK, adminOverviewResp{
			CurrentDate:        time.Now().Format("2006-01-02"),
			AdminEmail:         adminEmail,
			AnySignedInIsAdmin: adminEmail == "",
			Users:              users,
			AnonymousVisitors:  visitors,
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

func requireAdmin(ctx context.Context) error {
	uid := auth.UserIDFromContext(ctx)
	if uid == 0 {
		return errForbidden("authentication required")
	}

	adminEmail := strings.TrimSpace(strings.ToLower(os.Getenv("ADMIN_EMAIL")))
	if adminEmail == "" {
		adminEmail = "homsiahmed16@gmail.com"
	}

	var email string
	qctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	if err := db.Pool.QueryRow(qctx, `SELECT email FROM users WHERE id = $1`, uid).Scan(&email); err != nil {
		return errForbidden("admin access required")
	}
	if strings.ToLower(strings.TrimSpace(email)) != adminEmail {
		return errForbidden("admin access required")
	}
	return nil
}

type forbiddenError string

func (e forbiddenError) Error() string { return string(e) }

func errForbidden(msg string) error { return forbiddenError(msg) }

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
