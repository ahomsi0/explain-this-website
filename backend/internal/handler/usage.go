package handler

import (
	"context"
	"errors"
	"fmt"
	"net"
	"net/http"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/ahomsi/explain-website/internal/auth"
	"github.com/ahomsi/explain-website/internal/db"
	"github.com/ahomsi/explain-website/internal/model"
	"github.com/jackc/pgx/v5"
)

const (
	freeDailyLimit = 5
	proDailyLimit  = 50
	planFree       = "free"
	planPro        = "pro"
)

var (
	errDailyLimitReached = errors.New("daily analysis limit reached")
	visitorIDPattern     = regexp.MustCompile(`^[A-Za-z0-9_-]{8,128}$`)
	memUsageStore        = newMemoryUsageStore()
)

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
	if plan == planPro {
		return proDailyLimit
	}
	return freeDailyLimit
}

func effectivePlan(plan, subscriptionStatus string) string {
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
	raw := strings.TrimSpace(r.Header.Get("X-Visitor-Id"))
	if visitorIDPattern.MatchString(raw) {
		return raw
	}
	if fwd := strings.TrimSpace(strings.Split(r.Header.Get("X-Forwarded-For"), ",")[0]); fwd != "" {
		return "ip:" + fwd
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err == nil && host != "" {
		return "ip:" + host
	}
	if r.RemoteAddr != "" {
		return "ip:" + r.RemoteAddr
	}
	return "anon:unknown"
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
