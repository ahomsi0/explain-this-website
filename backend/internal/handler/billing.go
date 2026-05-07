package handler

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/ahomsi/explain-website/internal/auth"
	"github.com/ahomsi/explain-website/internal/db"
)

// ── Tap env helpers ───────────────────────────────────────────────────────────

func tapConfigured() bool {
	return tapSecretKey() != "" && tapMonthlyPlanID() != "" && tapYearlyPlanID() != ""
}

func tapSecretKey() string     { return strings.TrimSpace(os.Getenv("TAP_SECRET_KEY")) }
func tapMonthlyPlanID() string { return strings.TrimSpace(os.Getenv("TAP_MONTHLY_PLAN_ID")) }
func tapYearlyPlanID() string  { return strings.TrimSpace(os.Getenv("TAP_YEARLY_PLAN_ID")) }
func tapWebhookSecret() string { return strings.TrimSpace(os.Getenv("TAP_WEBHOOK_SECRET")) }

func appURL() string {
	u := strings.TrimSpace(os.Getenv("APP_URL"))
	if u == "" {
		return "http://localhost:5173"
	}
	return strings.TrimRight(u, "/")
}

// ── Tap HTTP client ───────────────────────────────────────────────────────────

const tapBaseURL = "https://api.tap.company/v2"

func tapDo(ctx context.Context, method, path string, body any) (map[string]any, error) {
	var reqBody io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("tap marshal: %w", err)
		}
		reqBody = bytes.NewReader(b)
	}

	req, err := http.NewRequestWithContext(ctx, method, tapBaseURL+path, reqBody)
	if err != nil {
		return nil, fmt.Errorf("tap new request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+tapSecretKey())
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("tap request: %w", err)
	}
	defer resp.Body.Close()

	var result map[string]any
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("tap decode: %w", err)
	}
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("tap API error %d: %v", resp.StatusCode, result)
	}
	return result, nil
}

// ── Customer helpers ──────────────────────────────────────────────────────────

// tapEnsureCustomer returns an existing tap_customer_id for the user, or creates
// a new one and saves it to the DB.
func tapEnsureCustomer(ctx context.Context, uid int64, email string) (string, error) {
	var existing string
	_ = db.Pool.QueryRow(ctx,
		`SELECT COALESCE(tap_customer_id, '') FROM users WHERE id = $1`, uid,
	).Scan(&existing)
	if existing != "" {
		return existing, nil
	}

	resp, err := tapDo(ctx, http.MethodPost, "/customers", map[string]any{
		"email":    email,
		"metadata": map[string]string{"user_id": strconv.FormatInt(uid, 10)},
	})
	if err != nil {
		return "", fmt.Errorf("create tap customer: %w", err)
	}

	customerID, _ := resp["id"].(string)
	if customerID == "" {
		return "", fmt.Errorf("tap customer id missing from response")
	}

	if _, err := db.Pool.Exec(ctx,
		`UPDATE users SET tap_customer_id = $1 WHERE id = $2`, customerID, uid,
	); err != nil {
		return "", fmt.Errorf("save tap customer id: %w", err)
	}
	return customerID, nil
}

// ── Checkout session ──────────────────────────────────────────────────────────

type checkoutReq struct {
	Interval string `json:"interval"` // "monthly" | "yearly"
}

// BillingCheckoutSessionHandler creates a Tap subscription and returns the
// hosted checkout URL for the user to complete payment.
// POST /api/billing/checkout-session
func BillingCheckoutSessionHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !db.IsAvailable() {
			writeJSONError(w, http.StatusServiceUnavailable, "billing is not enabled on this server")
			return
		}
		if !tapConfigured() {
			writeJSONError(w, http.StatusServiceUnavailable, "billing is not configured yet")
			return
		}

		var req checkoutReq
		_ = json.NewDecoder(r.Body).Decode(&req)
		if req.Interval != "yearly" {
			req.Interval = "monthly"
		}

		planID := tapMonthlyPlanID()
		if req.Interval == "yearly" {
			planID = tapYearlyPlanID()
		}

		uid := auth.UserIDFromContext(r.Context())
		ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
		defer cancel()

		var email string
		if err := db.Pool.QueryRow(ctx,
			`SELECT email FROM users WHERE id = $1`, uid,
		).Scan(&email); err != nil {
			writeJSONError(w, http.StatusUnauthorized, "user not found")
			return
		}

		customerID, err := tapEnsureCustomer(ctx, uid, email)
		if err != nil {
			writeJSONError(w, http.StatusBadGateway, "could not set up billing account")
			return
		}

		uidStr := strconv.FormatInt(uid, 10)
		resp, err := tapDo(ctx, http.MethodPost, "/subscriptions", map[string]any{
			"plan":         map[string]string{"id": planID},
			"customer":     map[string]string{"id": customerID},
			"auto_renewal": true,
			"redirect":     map[string]string{"url": appURL() + "/?billing=success"},
			"metadata":     map[string]string{"user_id": uidStr, "interval": req.Interval},
		})
		if err != nil {
			writeJSONError(w, http.StatusBadGateway, "could not create checkout session")
			return
		}

		txn, _ := resp["transaction"].(map[string]any)
		checkoutURL, _ := txn["url"].(string)
		if checkoutURL == "" {
			writeJSONError(w, http.StatusBadGateway, "no checkout URL returned by payment provider")
			return
		}

		writeJSON(w, http.StatusOK, billingSessionResp{URL: checkoutURL})
	}
}

// ── Cancel subscription ───────────────────────────────────────────────────────

// BillingCancelHandler cancels the user's active Tap subscription.
// POST /api/billing/cancel
func BillingCancelHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !db.IsAvailable() {
			writeJSONError(w, http.StatusServiceUnavailable, "billing is not enabled on this server")
			return
		}
		if !tapConfigured() {
			writeJSONError(w, http.StatusServiceUnavailable, "billing is not configured yet")
			return
		}

		uid := auth.UserIDFromContext(r.Context())
		ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
		defer cancel()

		var subID string
		if err := db.Pool.QueryRow(ctx,
			`SELECT COALESCE(tap_subscription_id, '') FROM users WHERE id = $1`, uid,
		).Scan(&subID); err != nil || subID == "" {
			writeJSONError(w, http.StatusBadRequest, "no active subscription found")
			return
		}

		if _, err := tapDo(ctx, http.MethodDelete, "/subscriptions/"+subID, nil); err != nil {
			writeJSONError(w, http.StatusBadGateway, "could not cancel subscription")
			return
		}

		// Immediately downgrade locally — webhook will confirm.
		_, _ = db.Pool.Exec(ctx,
			`UPDATE users SET plan = 'free', subscription_status = 'cancelled',
			    tap_subscription_id = NULL WHERE id = $1`, uid)

		w.WriteHeader(http.StatusNoContent)
	}
}

// ── Webhook handler ───────────────────────────────────────────────────────────

// BillingWebhookHandler processes incoming Tap webhook events.
// POST /api/tap/webhook
func BillingWebhookHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !db.IsAvailable() {
			http.Error(w, "billing unavailable", http.StatusServiceUnavailable)
			return
		}

		r.Body = http.MaxBytesReader(w, r.Body, 64*1024)
		payload, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "invalid payload", http.StatusBadRequest)
			return
		}

		// Verify HMAC-SHA256 signature when a webhook secret is configured.
		if secret := tapWebhookSecret(); secret != "" {
			sig := r.Header.Get("hashstring")
			mac := hmac.New(sha256.New, []byte(secret))
			mac.Write(payload)
			expected := hex.EncodeToString(mac.Sum(nil))
			if !hmac.Equal([]byte(sig), []byte(expected)) {
				http.Error(w, "invalid signature", http.StatusBadRequest)
				return
			}
		}

		var event map[string]any
		if err := json.Unmarshal(payload, &event); err != nil {
			http.Error(w, "invalid JSON", http.StatusBadRequest)
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		status, _ := event["status"].(string)
		switch status {
		case "SUBSCRIPTION_ACTIVATED", "SUBSCRIPTION_UPDATED":
			_ = handleTapSubscriptionActive(ctx, event)
		case "SUBSCRIPTION_CANCELLED":
			_ = handleTapSubscriptionCancelled(ctx, event)
		}

		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"received":true}`))
	}
}

func handleTapSubscriptionActive(ctx context.Context, event map[string]any) error {
	sub, _ := event["subscription"].(map[string]any)
	if sub == nil {
		return nil
	}

	subID, _ := sub["id"].(string)
	customerID := nestedStr(sub, "customer", "id")
	planID := nestedStr(sub, "plan", "id")
	interval := "monthly"
	if planID == tapYearlyPlanID() {
		interval = "yearly"
	}

	var periodEnd time.Time
	if period, ok := sub["period"].(map[string]any); ok {
		if ts, ok := period["current_period_end"].(float64); ok {
			periodEnd = time.Unix(int64(ts), 0).UTC()
		}
	}

	// Resolve user from metadata or customer ID.
	uid := int64FromAny(nestedMapValue(sub, "metadata", "user_id"))

	if uid != 0 {
		_, err := db.Pool.Exec(ctx,
			`UPDATE users
			    SET plan = 'pro',
			        subscription_status = 'active',
			        tap_customer_id = COALESCE(NULLIF($1,''), tap_customer_id),
			        tap_subscription_id = NULLIF($2,''),
			        subscription_interval = $3,
			        subscription_current_period_end = $4
			  WHERE id = $5`,
			customerID, subID, interval, periodEnd, uid,
		)
		return err
	}
	if customerID != "" {
		_, err := db.Pool.Exec(ctx,
			`UPDATE users
			    SET plan = 'pro',
			        subscription_status = 'active',
			        tap_subscription_id = NULLIF($1,''),
			        subscription_interval = $2,
			        subscription_current_period_end = $3
			  WHERE tap_customer_id = $4`,
			subID, interval, periodEnd, customerID,
		)
		return err
	}
	return nil
}

func handleTapSubscriptionCancelled(ctx context.Context, event map[string]any) error {
	sub, _ := event["subscription"].(map[string]any)
	if sub == nil {
		return nil
	}

	customerID := nestedStr(sub, "customer", "id")
	uid := int64FromAny(nestedMapValue(sub, "metadata", "user_id"))

	if uid != 0 {
		_, err := db.Pool.Exec(ctx,
			`UPDATE users SET plan = 'free', subscription_status = 'cancelled',
			    tap_subscription_id = NULL WHERE id = $1`, uid)
		return err
	}
	if customerID != "" {
		_, err := db.Pool.Exec(ctx,
			`UPDATE users SET plan = 'free', subscription_status = 'cancelled',
			    tap_subscription_id = NULL WHERE tap_customer_id = $1`, customerID)
		return err
	}
	return nil
}

// ── Shared response type ──────────────────────────────────────────────────────

type billingSessionResp struct {
	URL string `json:"url"`
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// nestedMapValue traverses a nested map[string]any using the given key path.
func nestedMapValue(root map[string]any, path ...string) any {
	var cur any = root
	for _, key := range path {
		m, ok := cur.(map[string]any)
		if !ok {
			return nil
		}
		cur = m[key]
	}
	return cur
}

// nestedStr returns the string value at path in root, or "" if not found.
func nestedStr(root map[string]any, path ...string) string {
	v := nestedMapValue(root, path...)
	s, _ := v.(string)
	return s
}

// int64FromAny converts an any value (string or float64) to int64.
func int64FromAny(v any) int64 {
	switch x := v.(type) {
	case string:
		n, _ := strconv.ParseInt(x, 10, 64)
		return n
	case float64:
		return int64(x)
	case int64:
		return x
	}
	return 0
}
