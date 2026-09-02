package handler

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/ahomsi/explain-website/internal/auth"
	"github.com/ahomsi/explain-website/internal/db"
	"github.com/ahomsi/explain-website/internal/model"
	"github.com/ahomsi/explain-website/internal/requestip"
	"github.com/jackc/pgx/v5"
)

const (
	freeDailyLimit  = 5
	proDailyLimit   = 50
	ownerDailyLimit = 999999
	planFree        = "free"
	planPro         = "pro"
	planOwner       = "owner"
)

var (
	errDailyLimitReached = errors.New("daily analysis limit reached")
	memUsageStore        = newMemoryUsageStore()
	visitorProcessSecret = newVisitorProcessSecret()
)

const visitorCookieName = "etw_visitor"

func newVisitorProcessSecret() []byte {
	secret := make([]byte, 32)
	if _, err := rand.Read(secret); err == nil {
		return secret
	}
	sum := sha256.Sum256([]byte(fmt.Sprintf("%d", time.Now().UnixNano())))
	return sum[:]
}

type memoryUsageStore struct {
	mu      sync.Mutex
	entries map[string]memoryUsageEntry
}

type memoryUsageEntry struct {
	day   string
	count int
}

func newMemoryUsageStore() *memoryUsageStore {
	return &memoryUsageStore{entries: make(map[string]memoryUsageEntry)}
}

// maxMemUsageEntries bounds the in-memory fallback store. When the cap is
// reached, entries from earlier days are swept so the map cannot grow
// without limit under high anonymous traffic.
const maxMemUsageEntries = 100_000

func (s *memoryUsageStore) sweepLocked(today string) {
	for k, e := range s.entries {
		if e.day != today {
			delete(s.entries, k)
		}
	}
}

func (s *memoryUsageStore) get(key string, limit int) model.UsageSummary {
	s.mu.Lock()
	defer s.mu.Unlock()

	day := time.Now().UTC().Format("2006-01-02")
	entry := s.entries[key]
	if entry.day != day {
		entry = memoryUsageEntry{day: day}
	}
	return usageSummaryFor(planFree, limit, entry.count)
}

func (s *memoryUsageStore) increment(key string, limit int) (model.UsageSummary, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	day := time.Now().UTC().Format("2006-01-02")
	if len(s.entries) >= maxMemUsageEntries {
		s.sweepLocked(day)
	}
	entry := s.entries[key]
	if entry.day != day {
		entry = memoryUsageEntry{day: day}
	}
	if entry.count >= limit {
		s.entries[key] = entry
		return usageSummaryFor(planFree, limit, entry.count), errDailyLimitReached
	}
	entry.count++
	s.entries[key] = entry
	return usageSummaryFor(planFree, limit, entry.count), nil
}

type userPlan struct {
	Plan               string
	SubscriptionStatus string
}

func usageSummaryFor(plan string, limit, used int) model.UsageSummary {
	if used < 0 {
		used = 0
	}
	remaining := limit - used
	if remaining < 0 {
		remaining = 0
	}
	return model.UsageSummary{
		Plan:           plan,
		DailyLimit:     limit,
		DailyUsed:      used,
		DailyRemaining: remaining,
	}
}

func dailyLimitForPlan(plan string) int {
	switch plan {
	case planOwner:
		return ownerDailyLimit
	case planPro:
		return proDailyLimit
	default:
		return freeDailyLimit
	}
}

func effectivePlan(plan, subscriptionStatus string) string {
	if plan == planOwner {
		return planOwner
	}
	if plan == planPro {
		switch subscriptionStatus {
		case "active", "trialing", "past_due":
			return planPro
		}
	}
	return planFree
}

func usageLimitMessage(limit int, signedIn bool) string {
	if signedIn {
		if limit >= proDailyLimit {
			return fmt.Sprintf("You've reached your %d analyses for today. Your Pro plan resets tomorrow.", proDailyLimit)
		}
		return fmt.Sprintf("You've reached your %d free analyses for today. Upgrade to Pro for %d analyses a day.", freeDailyLimit, proDailyLimit)
	}
	return fmt.Sprintf("You've used your %d free analyses for today. Sign in to save history and upgrade to Pro for %d analyses a day.", freeDailyLimit, proDailyLimit)
}

func visitorIDFromRequest(r *http.Request) string {
	if cookie, err := r.Cookie(visitorCookieName); err == nil && validVisitorCookie(cookie.Value) {
		return "cookie:" + strings.SplitN(cookie.Value, ".", 2)[0]
	}
	return "ip:" + requestip.ClientIP(r)
}

func visitorCookieSecret() []byte {
	if secret := strings.TrimSpace(os.Getenv("JWT_SECRET")); secret != "" {
		return []byte(secret)
	}
	return visitorProcessSecret
}

func validVisitorCookie(value string) bool {
	parts := strings.SplitN(value, ".", 2)
	if len(parts) != 2 || len(parts[0]) != 32 || len(parts[1]) != 64 {
		return false
	}
	if _, err := hex.DecodeString(parts[0]); err != nil {
		return false
	}
	sig := hmac.New(sha256.New, visitorCookieSecret())
	_, _ = sig.Write([]byte(parts[0]))
	expected := hex.EncodeToString(sig.Sum(nil))
	return hmac.Equal([]byte(parts[1]), []byte(expected))
}

// EnsureVisitorCookie gives anonymous browsers a stable, signed quota key.
func EnsureVisitorCookie(w http.ResponseWriter, r *http.Request) {
	_ = ensureVisitorCookieValue(w, r)
}

// ensureVisitorCookieValue returns a stable pseudonymous visitor ID and sets a
// cookie when the request does not already have one. Returning the ID lets the
// first request use the cookie-backed key immediately instead of falling back
// to storing an IP address in usage or conversion data.
func ensureVisitorCookieValue(w http.ResponseWriter, r *http.Request) string {
	if cookie, err := r.Cookie(visitorCookieName); err == nil && validVisitorCookie(cookie.Value) {
		return "cookie:" + strings.SplitN(cookie.Value, ".", 2)[0]
	}
	id := make([]byte, 16)
	if _, err := rand.Read(id); err != nil {
		return "cookie:unavailable"
	}
	idHex := hex.EncodeToString(id)
	sig := hmac.New(sha256.New, visitorCookieSecret())
	_, _ = sig.Write([]byte(idHex))
	value := idHex + "." + hex.EncodeToString(sig.Sum(nil))
	secure := r.TLS != nil || strings.EqualFold(r.Header.Get("X-Forwarded-Proto"), "https")
	sameSite := http.SameSiteLaxMode
	if secure {
		sameSite = http.SameSiteNoneMode
	}
	http.SetCookie(w, &http.Cookie{
		Name:     visitorCookieName,
		Value:    value,
		Path:     "/",
		MaxAge:   365 * 24 * 60 * 60,
		HttpOnly: true,
		Secure:   secure,
		SameSite: sameSite,
	})
	return "cookie:" + idHex
}

func loadUserPlan(ctx context.Context, userID int64) (userPlan, error) {
	plan := userPlan{Plan: planFree, SubscriptionStatus: "inactive"}
	if !db.IsAvailable() || userID == 0 {
		return plan, nil
	}
	err := db.Pool.QueryRow(ctx,
		`SELECT plan, subscription_status FROM users WHERE id = $1`,
		userID,
	).Scan(&plan.Plan, &plan.SubscriptionStatus)
	if err != nil {
		return userPlan{}, err
	}
	plan.Plan = effectivePlan(plan.Plan, plan.SubscriptionStatus)
	return plan, nil
}

func currentUsage(ctx context.Context, userID int64, visitorID string) (model.UsageSummary, error) {
	if userID != 0 {
		plan, err := loadUserPlan(ctx, userID)
		if err != nil {
			return model.UsageSummary{}, err
		}
		limit := dailyLimitForPlan(plan.Plan)
		if !db.IsAvailable() {
			return usageSummaryFor(plan.Plan, limit, 0), nil
		}
		var used int
		err = db.Pool.QueryRow(ctx,
			`SELECT count FROM user_daily_usage WHERE user_id = $1 AND usage_date = CURRENT_DATE`,
			userID,
		).Scan(&used)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				return usageSummaryFor(plan.Plan, limit, 0), nil
			}
			return model.UsageSummary{}, err
		}
		return usageSummaryFor(plan.Plan, limit, used), nil
	}

	limit := freeDailyLimit
	if !db.IsAvailable() {
		return memUsageStore.get(visitorID, limit), nil
	}
	var used int
	err := db.Pool.QueryRow(ctx,
		`SELECT count FROM anonymous_daily_usage WHERE visitor_id = $1 AND usage_date = CURRENT_DATE`,
		visitorID,
	).Scan(&used)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return usageSummaryFor(planFree, limit, 0), nil
		}
		return model.UsageSummary{}, err
	}
	return usageSummaryFor(planFree, limit, used), nil
}

func incrementUsage(ctx context.Context, userID int64, visitorID string) (model.UsageSummary, error) {
	if userID != 0 {
		plan, err := loadUserPlan(ctx, userID)
		if err != nil {
			return model.UsageSummary{}, err
		}
		limit := dailyLimitForPlan(plan.Plan)
		if !db.IsAvailable() {
			return usageSummaryFor(plan.Plan, limit, 0), nil
		}

		var used int
		err = db.Pool.QueryRow(ctx,
			`INSERT INTO user_daily_usage (user_id, usage_date, count, created_at, updated_at)
			 VALUES ($1, CURRENT_DATE, 1, NOW(), NOW())
			 ON CONFLICT (user_id, usage_date) DO UPDATE
			     SET count = user_daily_usage.count + 1,
			         updated_at = NOW()
			   WHERE user_daily_usage.count < $2
			 RETURNING count`,
			userID, limit,
		).Scan(&used)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				current, curErr := currentUsage(ctx, userID, "")
				if curErr != nil {
					return model.UsageSummary{}, errDailyLimitReached
				}
				return current, errDailyLimitReached
			}
			return model.UsageSummary{}, err
		}
		return usageSummaryFor(plan.Plan, limit, used), nil
	}

	limit := freeDailyLimit
	if !db.IsAvailable() {
		return memUsageStore.increment(visitorID, limit)
	}

	var used int
	err := db.Pool.QueryRow(ctx,
		`INSERT INTO anonymous_daily_usage (visitor_id, usage_date, count, created_at, updated_at)
		 VALUES ($1, CURRENT_DATE, 1, NOW(), NOW())
		 ON CONFLICT (visitor_id, usage_date) DO UPDATE
		     SET count = anonymous_daily_usage.count + 1,
		         updated_at = NOW()
		   WHERE anonymous_daily_usage.count < $2
		 RETURNING count`,
		visitorID, limit,
	).Scan(&used)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			current, curErr := currentUsage(ctx, 0, visitorID)
			if curErr != nil {
				return model.UsageSummary{}, errDailyLimitReached
			}
			return current, errDailyLimitReached
		}
		return model.UsageSummary{}, err
	}
	return usageSummaryFor(planFree, limit, used), nil
}

func UsageHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		uid := auth.UserIDFromContext(r.Context())
		visitorID := visitorIDFromRequest(r)
		usage, err := currentUsage(r.Context(), uid, visitorID)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not load usage")
			return
		}
		writeJSON(w, http.StatusOK, usage)
	}
}

type usageHistoryDay struct {
	Date  string `json:"date"`
	Count int    `json:"count"`
}

type usageHistoryResponse struct {
	Current               model.UsageSummary `json:"current"`
	Days                  []usageHistoryDay  `json:"days"`
	APIRequestsLast30Days int                `json:"apiRequestsLast30Days"`
}

// UsageHistoryHandler returns the authenticated user's recent analysis and API
// request activity for the usage dashboard.
func UsageHistoryHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !db.IsAvailable() {
			writeJSONError(w, http.StatusServiceUnavailable, "accounts are not enabled on this server")
			return
		}
		uid := auth.UserIDFromContext(r.Context())
		current, err := currentUsage(r.Context(), uid, "")
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not load usage")
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		rows, err := db.Pool.Query(ctx, `
			SELECT usage_date::text, count
			  FROM user_daily_usage
			 WHERE user_id = $1 AND usage_date >= CURRENT_DATE - 29
			 ORDER BY usage_date ASC`, uid)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not load usage history")
			return
		}
		defer rows.Close()

		days := []usageHistoryDay{}
		for rows.Next() {
			var day usageHistoryDay
			if err := rows.Scan(&day.Date, &day.Count); err != nil {
				writeJSONError(w, http.StatusInternalServerError, "could not load usage history")
				return
			}
			days = append(days, day)
		}
		if err := rows.Err(); err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not load usage history")
			return
		}

		var apiRequests int
		if err := db.Pool.QueryRow(ctx, `
			SELECT COALESCE(SUM(d.request_count), 0)
			  FROM api_key_daily_usage d
			  JOIN api_keys k ON k.id = d.api_key_id
			 WHERE k.user_id = $1 AND d.usage_date >= CURRENT_DATE - 29`, uid).Scan(&apiRequests); err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not load API usage")
			return
		}

		writeJSON(w, http.StatusOK, usageHistoryResponse{Current: current, Days: days, APIRequestsLast30Days: apiRequests})
	}
}
