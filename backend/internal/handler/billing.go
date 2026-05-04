package handler

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/ahomsi/explain-website/internal/auth"
	"github.com/ahomsi/explain-website/internal/db"
	"github.com/stripe/stripe-go/v82"
	stripebillingportal "github.com/stripe/stripe-go/v82/billingportal/session"
	stripecheckoutsession "github.com/stripe/stripe-go/v82/checkout/session"
	stripecustomer "github.com/stripe/stripe-go/v82/customer"
	stripewebhook "github.com/stripe/stripe-go/v82/webhook"
)

type billingSessionResp struct {
	URL string `json:"url"`
}

func billingConfigured() bool {
	return os.Getenv("STRIPE_SECRET_KEY") != "" &&
		os.Getenv("STRIPE_PRICE_ID") != "" &&
		os.Getenv("STRIPE_WEBHOOK_SECRET") != ""
}

func appURL() string {
	if v := strings.TrimSpace(os.Getenv("APP_URL")); v != "" {
		return strings.TrimRight(v, "/")
	}
	if v := strings.TrimSpace(os.Getenv("FRONTEND_URL")); v != "" {
		return strings.TrimRight(v, "/")
	}
	return "http://localhost:5173"
}

func stripeAPIKey() string {
	return strings.TrimSpace(os.Getenv("STRIPE_SECRET_KEY"))
}

func stripePriceID() string {
	return strings.TrimSpace(os.Getenv("STRIPE_PRICE_ID"))
}

func stripeWebhookSecret() string {
	return strings.TrimSpace(os.Getenv("STRIPE_WEBHOOK_SECRET"))
}

func BillingCheckoutSessionHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !db.IsAvailable() {
			writeJSONError(w, http.StatusServiceUnavailable, "billing is not enabled on this server")
			return
		}
		if !billingConfigured() {
			writeJSONError(w, http.StatusServiceUnavailable, "billing is not configured yet")
			return
		}

		uid := auth.UserIDFromContext(r.Context())
		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		var emailAddr string
		var customerID string
		if err := db.Pool.QueryRow(ctx,
			`SELECT email, COALESCE(stripe_customer_id, '') FROM users WHERE id = $1`,
			uid,
		).Scan(&emailAddr, &customerID); err != nil {
			writeJSONError(w, http.StatusUnauthorized, "user not found")
			return
		}

		stripe.Key = stripeAPIKey()
		if customerID == "" {
			params := &stripe.CustomerParams{
				Email:    stripe.String(emailAddr),
				Metadata: map[string]string{"user_id": strconv.FormatInt(uid, 10)},
			}
			customer, err := stripecustomer.New(params)
			if err != nil {
				writeJSONError(w, http.StatusBadGateway, "could not start billing")
				return
			}
			customerID = customer.ID
			if _, err := db.Pool.Exec(ctx,
				`UPDATE users SET stripe_customer_id = $1 WHERE id = $2`,
				customerID, uid,
			); err != nil {
				writeJSONError(w, http.StatusInternalServerError, "could not start billing")
				return
			}
		}

		successURL := appURL() + "/?billing=success"
		cancelURL := appURL() + "/?billing=cancelled"
		params := &stripe.CheckoutSessionParams{
			Mode:              stripe.String(string(stripe.CheckoutSessionModeSubscription)),
			Customer:          stripe.String(customerID),
			SuccessURL:        stripe.String(successURL),
			CancelURL:         stripe.String(cancelURL),
			ClientReferenceID: stripe.String(strconv.FormatInt(uid, 10)),
			LineItems: []*stripe.CheckoutSessionLineItemParams{{
				Price:    stripe.String(stripePriceID()),
				Quantity: stripe.Int64(1),
			}},
			Metadata: map[string]string{
				"user_id": strconv.FormatInt(uid, 10),
			},
			SubscriptionData: &stripe.CheckoutSessionSubscriptionDataParams{
				Metadata: map[string]string{
					"user_id": strconv.FormatInt(uid, 10),
				},
			},
		}
		session, err := stripecheckoutsession.New(params)
		if err != nil {
			writeJSONError(w, http.StatusBadGateway, "could not create checkout session")
			return
		}

		writeJSON(w, http.StatusOK, billingSessionResp{URL: session.URL})
	}
}

func BillingPortalSessionHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !db.IsAvailable() {
			writeJSONError(w, http.StatusServiceUnavailable, "billing is not enabled on this server")
			return
		}
		if !billingConfigured() {
			writeJSONError(w, http.StatusServiceUnavailable, "billing is not configured yet")
			return
		}

		uid := auth.UserIDFromContext(r.Context())
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		var customerID string
		if err := db.Pool.QueryRow(ctx,
			`SELECT COALESCE(stripe_customer_id, '') FROM users WHERE id = $1`,
			uid,
		).Scan(&customerID); err != nil {
			writeJSONError(w, http.StatusUnauthorized, "user not found")
			return
		}
		if customerID == "" {
			writeJSONError(w, http.StatusBadRequest, "no billing account found yet")
			return
		}

		stripe.Key = stripeAPIKey()
		session, err := stripebillingportal.New(&stripe.BillingPortalSessionParams{
			Customer:  stripe.String(customerID),
			ReturnURL: stripe.String(appURL()),
		})
		if err != nil {
			writeJSONError(w, http.StatusBadGateway, "could not open billing portal")
			return
		}
		writeJSON(w, http.StatusOK, billingSessionResp{URL: session.URL})
	}
}

func BillingWebhookHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !db.IsAvailable() || stripeWebhookSecret() == "" {
			http.Error(w, "billing unavailable", http.StatusServiceUnavailable)
			return
		}

		r.Body = http.MaxBytesReader(w, r.Body, 64*1024)
		payload, err := io.ReadAll(r.Body)
		if err != nil {
			http.Error(w, "invalid payload", http.StatusBadRequest)
			return
		}
		event, err := stripewebhook.ConstructEvent(payload, r.Header.Get("Stripe-Signature"), stripeWebhookSecret())
		if err != nil {
			http.Error(w, "invalid signature", http.StatusBadRequest)
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		switch event.Type {
		case "checkout.session.completed":
			if err := handleCheckoutCompleted(ctx, event.Data.Raw); err != nil {
				http.Error(w, "webhook error", http.StatusInternalServerError)
				return
			}
		case "customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted":
			if err := handleSubscriptionEvent(ctx, event.Data.Raw); err != nil {
				http.Error(w, "webhook error", http.StatusInternalServerError)
				return
			}
		}

		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"received":true}`))
	}
}

func handleCheckoutCompleted(ctx context.Context, raw json.RawMessage) error {
	var payload map[string]any
	if err := json.Unmarshal(raw, &payload); err != nil {
		return err
	}

	userID := int64FromStringMap(payload["client_reference_id"])
	customerID := stringFromMap(payload["customer"])
	subscriptionID := stringFromMap(payload["subscription"])
	if userID == 0 {
		userID = int64FromStringMap(nestedMapValue(payload, "metadata", "user_id"))
	}
	if userID == 0 || customerID == "" {
		return nil
	}

	_, err := db.Pool.Exec(ctx,
		`UPDATE users
		    SET stripe_customer_id = $1,
		        stripe_subscription_id = NULLIF($2, '')
		  WHERE id = $3`,
		customerID, subscriptionID, userID,
	)
	return err
}

func handleSubscriptionEvent(ctx context.Context, raw json.RawMessage) error {
	var payload map[string]any
	if err := json.Unmarshal(raw, &payload); err != nil {
		return err
	}

	customerID := stringFromMap(payload["customer"])
	subscriptionID := stringFromMap(payload["id"])
	status := stringFromMap(payload["status"])
	currentPeriodEnd := time.Unix(int64FromNumber(payload["current_period_end"]), 0).UTC()
	plan := effectivePlan(planPro, status)

	var metadataUserID int64
	if meta, ok := payload["metadata"].(map[string]any); ok {
		metadataUserID = int64FromStringMap(meta["user_id"])
	}

	if customerID == "" && metadataUserID == 0 {
		return nil
	}

	var err error
	if customerID != "" {
		_, err = db.Pool.Exec(ctx,
			`UPDATE users
			    SET plan = $1,
			        subscription_status = $2,
			        stripe_customer_id = $3,
			        stripe_subscription_id = NULLIF($4, ''),
			        subscription_current_period_end = $5
			  WHERE stripe_customer_id = $3`,
			plan, status, customerID, subscriptionID, currentPeriodEnd,
		)
	}
	if err == nil && metadataUserID != 0 {
		_, err = db.Pool.Exec(ctx,
			`UPDATE users
			    SET plan = $1,
			        subscription_status = $2,
			        stripe_customer_id = COALESCE(NULLIF($3, ''), stripe_customer_id),
			        stripe_subscription_id = NULLIF($4, ''),
			        subscription_current_period_end = $5
			  WHERE id = $6`,
			plan, status, customerID, subscriptionID, currentPeriodEnd, metadataUserID,
		)
	}
	return err
}

func stringFromMap(v any) string {
	switch t := v.(type) {
	case string:
		return t
	case map[string]any:
		if s, ok := t["id"].(string); ok {
			return s
		}
	}
	return ""
}

func int64FromStringMap(v any) int64 {
	switch t := v.(type) {
	case string:
		n, _ := strconv.ParseInt(t, 10, 64)
		return n
	case float64:
		return int64(t)
	}
	return 0
}

func int64FromNumber(v any) int64 {
	switch t := v.(type) {
	case float64:
		return int64(t)
	case json.Number:
		n, _ := t.Int64()
		return n
	}
	return 0
}

func nestedMapValue(root map[string]any, path ...string) any {
	cur := any(root)
	for _, p := range path {
		m, ok := cur.(map[string]any)
		if !ok {
			return nil
		}
		cur = m[p]
	}
	return cur
}
