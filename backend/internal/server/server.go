package server

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"runtime/debug"
	"strings"
	"sync"
	"syscall"
	"time"

	"github.com/ahomsi/explain-website/internal/auth"
	"github.com/ahomsi/explain-website/internal/config"
	"github.com/ahomsi/explain-website/internal/db"
	"github.com/ahomsi/explain-website/internal/handler"
	"github.com/ahomsi/explain-website/internal/llm"
	"github.com/ahomsi/explain-website/internal/model"
	"github.com/ahomsi/explain-website/internal/requestip"
	"github.com/jackc/pgx/v5"
)

// Start wires up routes and begins listening.
func Start(cfg config.Config) error {
	warnIfUntrustedProxy()
	// Init DB (no-op when DATABASE_URL is unset).
	dbCtx, dbCancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer dbCancel()
	if err := db.Init(dbCtx); err != nil {
		log.Printf("WARNING: db init failed (%v) — running in anonymous-only mode", err)
	}
	defer db.Close()

	srv := &http.Server{
		Addr:              fmt.Sprintf(":%s", cfg.Port),
		Handler:           NewHandler(cfg),
		ReadHeaderTimeout: 10 * time.Second,
		WriteTimeout:      4 * time.Minute,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    16 * 1024,
	}

	shutdownCtx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	go func() {
		<-shutdownCtx.Done()
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		if err := srv.Shutdown(ctx); err != nil {
			log.Printf("graceful shutdown failed: %v", err)
		}
	}()

	log.Printf("Server listening on %s (CORS origin: %s)", srv.Addr, cfg.AllowedOrigin)
	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}

// NewHandler wires the API routes and middleware without opening a listener.
// It is used by Start and by integration tests.
func NewHandler(cfg config.Config) http.Handler {
	groqClient := llm.New(cfg.GroqAPIKey, cfg.GroqModel, cfg.GroqFallbackModel)
	return NewHandlerWithAnalyzeConfig(cfg, handler.Config{
		FetchTimeoutSec: cfg.FetchTimeoutSec,
		MaxBodyBytes:    cfg.MaxBodyBytes,
		PageSpeedAPIKey: cfg.PageSpeedAPIKey,
		Groq:            groqClient,
	})
}

// NewHandlerWithAnalyzeConfig is the same production route stack with
// injectable analyze dependencies for integration tests.
func NewHandlerWithAnalyzeConfig(cfg config.Config, handlerCfg handler.Config) http.Handler {
	mux := http.NewServeMux()
	groqClient := handlerCfg.Groq
	if groqClient == nil {
		groqClient = llm.New(cfg.GroqAPIKey, cfg.GroqModel, cfg.GroqFallbackModel)
		handlerCfg.Groq = groqClient
	}

	if groqClient.Enabled() {
		log.Printf("groq summary: enabled (model=%s)", cfg.GroqModel)
	} else {
		log.Printf("groq summary: disabled (set GROQ_API_KEY to enable)")
	}

	mux.HandleFunc("POST /api/analyze", handler.AnalyzeHandler(handlerCfg))
	mux.HandleFunc("GET /api/badge", handler.BadgeHandler())
	mux.HandleFunc("POST /api/compare-live", auth.RequireAuth(handler.CompareLiveHandler(handlerCfg)))
	mux.HandleFunc("POST /api/events", handler.ConversionEventHandler())
	mux.HandleFunc("GET /api/usage", handler.UsageHandler())
	mux.HandleFunc("GET /api/usage/history", auth.RequireSessionAuth(handler.UsageHistoryHandler()))
	mux.HandleFunc("GET /api/report/{id}", handler.ReportHandler())
	mux.HandleFunc("GET /api/audits/compare", auth.RequireSessionAuth(handler.CompareAuditsHandler()))
	mux.HandleFunc("POST /api/audits/{id}/revoke-share", auth.RequireSessionAuth(handler.AuditRevokeShareHandler()))
	mux.HandleFunc("GET /api/api-keys", auth.RequireSessionAuth(handler.APIKeyListHandler()))
	mux.HandleFunc("POST /api/api-keys", auth.RequireSessionAuth(handler.APIKeyCreateHandler()))
	mux.HandleFunc("DELETE /api/api-keys/{id}", auth.RequireSessionAuth(handler.APIKeyRevokeHandler()))
	mux.HandleFunc("GET /api/webhooks", auth.RequireSessionAuth(handler.WebhookListHandler()))
	mux.HandleFunc("POST /api/webhooks", auth.RequireSessionAuth(handler.WebhookCreateHandler()))
	mux.HandleFunc("DELETE /api/webhooks/{id}", auth.RequireSessionAuth(handler.WebhookRevokeHandler()))
	mux.HandleFunc("POST /api/webhooks/{id}/test", auth.RequireSessionAuth(handler.WebhookTestHandler()))

	// Auth endpoints
	mux.HandleFunc("POST /api/auth/signup", handler.SignupHandler())
	mux.HandleFunc("POST /api/auth/login", handler.LoginHandler())
	mux.HandleFunc("POST /api/auth/logout", handler.LogoutHandler())
	mux.HandleFunc("POST /api/auth/forgot-password", handler.ForgotPasswordHandler())
	mux.HandleFunc("POST /api/auth/reset-password", handler.ResetPasswordHandler())
	mux.HandleFunc("GET /api/auth/me", auth.RequireSessionAuth(handler.MeHandler()))
	mux.HandleFunc("POST /api/billing/checkout-session", auth.RequireSessionAuth(handler.BillingCheckoutSessionHandler()))
	mux.HandleFunc("POST /api/billing/cancel", auth.RequireSessionAuth(handler.BillingCancelHandler()))
	mux.HandleFunc("POST /api/tap/webhook", handler.BillingWebhookHandler())
	mux.HandleFunc("GET /api/admin/overview", auth.RequireSessionAuth(handler.AdminOverviewHandler()))
	mux.HandleFunc("POST /api/admin/user-usage", auth.RequireSessionAuth(handler.AdminUpdateUserUsageHandler()))
	mux.HandleFunc("POST /api/admin/anon-usage", auth.RequireSessionAuth(handler.AdminUpdateAnonUsageHandler()))
	mux.HandleFunc("POST /api/admin/user-plan", auth.RequireSessionAuth(handler.AdminUpdateUserPlanHandler()))
	mux.HandleFunc("POST /api/admin/flag", auth.RequireSessionAuth(handler.AdminToggleFlagHandler()))
	mux.HandleFunc("POST /api/admin/broadcast", auth.RequireSessionAuth(handler.AdminBroadcastHandler()))
	mux.HandleFunc("PATCH /api/admin/users/{id}", auth.RequireSessionAuth(handler.AdminPatchUserHandler()))

	// User audit history (account-only)
	mux.HandleFunc("GET /api/audits", auth.RequireSessionAuth(handler.AuditsListHandler()))
	mux.HandleFunc("DELETE /api/audits", auth.RequireSessionAuth(handler.AuditsClearHandler()))
	mux.HandleFunc("DELETE /api/audits/{id}", auth.RequireSessionAuth(handler.AuditDeleteHandler()))

	health := func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	}
	mux.HandleFunc("GET /health", health)
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	rl := newRateLimiter()
	wrapped := recoveryMiddleware(
		securityHeadersMiddleware(
			auth.Middleware(
				apiKeyMiddleware(
					tokenFreshnessMiddleware(
						rateLimitMiddleware(rl,
							corsMiddleware(cfg.AllowedOrigin, mux),
						),
					),
				),
			),
		),
	)

	return wrapped
}

// apiKeyMiddleware authenticates integration requests using X-API-Key or
// Authorization: Api-Key <secret>. Keys are stored as SHA-256 digests and are
// never exposed again after creation.
func apiKeyMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if auth.UserIDFromContext(r.Context()) != 0 || !db.IsAvailable() {
			next.ServeHTTP(w, r)
			return
		}

		rawKey := strings.TrimSpace(r.Header.Get("X-API-Key"))
		if rawKey == "" {
			authorization := strings.TrimSpace(r.Header.Get("Authorization"))
			if strings.HasPrefix(authorization, "Api-Key ") {
				rawKey = strings.TrimSpace(strings.TrimPrefix(authorization, "Api-Key "))
			}
		}
		if rawKey == "" {
			next.ServeHTTP(w, r)
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		var uid int64
		err := db.Pool.QueryRow(ctx,
			`SELECT user_id FROM api_keys WHERE key_hash = $1 AND revoked_at IS NULL`,
			handler.HashAPIKey(rawKey),
		).Scan(&uid)
		if err != nil || uid == 0 {
			next.ServeHTTP(w, r)
			return
		}

		_, _ = db.Pool.Exec(ctx, `UPDATE api_keys SET last_used_at = NOW() WHERE key_hash = $1`, handler.HashAPIKey(rawKey))
		_, _ = db.Pool.Exec(ctx, `
			INSERT INTO api_key_daily_usage (api_key_id, usage_date, request_count)
			SELECT id, CURRENT_DATE, 1 FROM api_keys WHERE key_hash = $1
			ON CONFLICT (api_key_id, usage_date) DO UPDATE
			SET request_count = api_key_daily_usage.request_count + 1`, handler.HashAPIKey(rawKey))

		requestCtx := auth.WithAPIKey(auth.WithUserID(r.Context(), uid))
		next.ServeHTTP(w, r.WithContext(requestCtx))
	})
}

// ── Rate limiter ──────────────────────────────────────────────────────────────

// rateLimiter is a simple per-IP fixed-window counter (no external deps).
// Limit: 10 requests per minute per IP on the analyze endpoint.
type rateLimiter struct {
	mu      sync.Mutex
	clients map[string]*rlEntry
}

type rlEntry struct {
	count   int
	resetAt time.Time
}

const (
	rlMax          = 10  // anonymous: 10/min
	rlMaxAuthed    = 50  // logged-in: 50/min
	rlMaxAuth      = 10  // auth mutations: 10/min per source IP and endpoint
	rlMaxEvent     = 120 // consented conversion events per minute per IP
	rlMaxCompare   = 5   // live competitor comparisons per minute (doubles analysis cost)
	rlWindow       = time.Minute
)

func newRateLimiter() *rateLimiter {
	rl := &rateLimiter{clients: make(map[string]*rlEntry)}
	// Sweep stale entries every 5 minutes so the map doesn't grow forever.
	go func() {
		ticker := time.NewTicker(5 * time.Minute)
		defer ticker.Stop()
		for range ticker.C {
			rl.mu.Lock()
			now := time.Now()
			for ip, e := range rl.clients {
				if now.After(e.resetAt) {
					delete(rl.clients, ip)
				}
			}
			rl.mu.Unlock()
		}
	}()
	return rl
}

func (rl *rateLimiter) allow(key string, max int) bool {
	rl.mu.Lock()
	defer rl.mu.Unlock()
	now := time.Now()
	e, ok := rl.clients[key]
	if !ok || now.After(e.resetAt) {
		rl.clients[key] = &rlEntry{count: 1, resetAt: now.Add(rlWindow)}
		return true
	}
	e.count++
	return e.count <= max
}

// realIP extracts the peer address. Forwarding headers are not trusted because
// this service does not know which upstream proxy addresses are authoritative.
func realIP(r *http.Request) string {
	return requestip.ClientIP(r)
}

// warnIfUntrustedProxy surfaces a deployment misconfiguration at startup: when
// running behind a reverse proxy without TRUSTED_PROXY_CIDRS, every request
// shares the proxy's peer address, collapsing per-IP rate limits (and the
// IP-based anonymous usage fallback) into one sitewide bucket.
func warnIfUntrustedProxy() {
	if strings.TrimSpace(os.Getenv("TRUSTED_PROXY_CIDRS")) != "" {
		return
	}
	log.Printf("WARNING: TRUSTED_PROXY_CIDRS is not set — client IPs fall back to the direct peer address. " +
		"Behind a reverse proxy (Render, Vercel, nginx, …) all traffic shares one bucket, so per-IP rate limits " +
		"become sitewide limits. Set TRUSTED_PROXY_CIDRS to your proxy's IPs/CIDRs to restore per-client limits.")
}

func rateLimitMiddleware(rl *rateLimiter, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost && r.URL.Path == "/api/analyze" {
			// Logged-in users get a separate, higher bucket keyed by user ID.
			key := "ip:" + realIP(r)
			max := rlMax
			if uid := auth.UserIDFromContext(r.Context()); uid != 0 {
				key = fmt.Sprintf("user:%d", uid)
				max = rlMaxAuthed
			}
			if !rl.allow(key, max) {
				w.Header().Set("Content-Type", "application/json")
				w.Header().Set("Retry-After", "60")
				w.WriteHeader(http.StatusTooManyRequests)
				json.NewEncoder(w).Encode(model.ErrorResponse{
					Error: "Too many requests — please wait a moment before trying again.",
				})
				return
			}
		}
		if r.Method == http.MethodPost && isAuthMutation(r.URL.Path) {
			key := "auth:" + r.URL.Path + ":" + realIP(r)
			if !rl.allow(key, rlMaxAuth) {
				w.Header().Set("Content-Type", "application/json")
				w.Header().Set("Retry-After", "60")
				w.WriteHeader(http.StatusTooManyRequests)
				json.NewEncoder(w).Encode(model.ErrorResponse{Error: "Too many authentication attempts — please wait a moment."})
				return
			}
		}
		if r.Method == http.MethodPost && r.URL.Path == "/api/events" {
			if !rl.allow("event:"+realIP(r), rlMaxEvent) {
				w.Header().Set("Content-Type", "application/json")
				w.Header().Set("Retry-After", "60")
				w.WriteHeader(http.StatusTooManyRequests)
				json.NewEncoder(w).Encode(model.ErrorResponse{Error: "Too many tracking events — please try again later."})
				return
			}
		}
		if r.Method == http.MethodPost && r.URL.Path == "/api/compare-live" {
			key := "compare:ip:" + realIP(r)
			if uid := auth.UserIDFromContext(r.Context()); uid != 0 {
				key = fmt.Sprintf("compare:user:%d", uid)
			}
			if !rl.allow(key, rlMaxCompare) {
				w.Header().Set("Content-Type", "application/json")
				w.Header().Set("Retry-After", "60")
				w.WriteHeader(http.StatusTooManyRequests)
				json.NewEncoder(w).Encode(model.ErrorResponse{Error: "Too many comparisons — please wait a moment before trying again."})
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}

func isAuthMutation(path string) bool {
	switch path {
	case "/api/auth/signup", "/api/auth/login", "/api/auth/forgot-password", "/api/auth/reset-password":
		return true
	default:
		return false
	}
}

// ── Security headers ──────────────────────────────────────────────────────────

func securityHeadersMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// API responses contain account and analysis data; never cache them.
		w.Header().Set("Cache-Control", "no-store")
		// Prevent MIME sniffing.
		w.Header().Set("X-Content-Type-Options", "nosniff")
		// Deny framing (clickjacking protection).
		w.Header().Set("X-Frame-Options", "DENY")
		// Legacy XSS filter (still honoured by some older browsers).
		w.Header().Set("X-XSS-Protection", "1; mode=block")
		// Limit referrer leakage.
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		// This is a JSON API — no scripts, styles, or media need to load from it.
		// "default-src 'none'" is the most restrictive valid CSP.
		w.Header().Set("Content-Security-Policy", "default-src 'none'")
		// Tell browsers to always use HTTPS for future requests (1 year).
		// Safe to set even when running behind a TLS-terminating proxy.
		w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
		// Disable browser features this API has no reason to access.
		w.Header().Set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()")
		next.ServeHTTP(w, r)
	})
}

// tokenFreshnessMiddleware rejects otherwise-valid JWTs issued before a user's
// password was changed. This makes password resets revoke older sessions.
func tokenFreshnessMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		uid := auth.UserIDFromContext(r.Context())
		issuedAt := auth.TokenIssuedAtFromContext(r.Context())
		if uid == 0 || issuedAt.IsZero() || !db.IsAvailable() {
			next.ServeHTTP(w, r)
			return
		}

		var changedAt time.Time
		qctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		err := db.Pool.QueryRow(qctx,
			`SELECT password_changed_at FROM users WHERE id = $1`, uid,
		).Scan(&changedAt)
		cancel()

		if errors.Is(err, pgx.ErrNoRows) {
			r = r.WithContext(auth.ClearAuthentication(r.Context()))
			next.ServeHTTP(w, r)
			return
		}
		if err != nil {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusServiceUnavailable)
			json.NewEncoder(w).Encode(model.ErrorResponse{Error: "authentication service temporarily unavailable"})
			return
		}
		// JWT iat is second-precision while Postgres timestamps include
		// fractional seconds. Truncate the DB value so a newly issued token is
		// not rejected merely because it was created in the same second.
		if issuedAt.Before(changedAt.Truncate(time.Second)) {
			r = r.WithContext(auth.ClearAuthentication(r.Context()))
		}
		next.ServeHTTP(w, r)
	})
}

// ── Recovery middleware ───────────────────────────────────────────────────────

// recoveryMiddleware catches any panic inside a handler, logs the stack trace,
// and returns a clean JSON error response so the frontend never gets a broken connection.
func recoveryMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				log.Printf("PANIC recovered: %v\n%s", rec, debug.Stack())
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusInternalServerError)
				json.NewEncoder(w).Encode(model.ErrorResponse{
					Error: "An unexpected error occurred while analyzing this page. Please try again.",
				})
			}
		}()
		next.ServeHTTP(w, r)
	})
}

// ── CORS middleware ───────────────────────────────────────────────────────────

// corsMiddleware adds the necessary headers to allow the frontend to call the API.
// ALLOWED_ORIGIN can be:
//   - "*"                    → allow all origins (open API)
//   - "https://foo.com"      → single origin
//   - "https://a.com,https://b.com" → comma-separated list of allowed origins
func corsMiddleware(allowedOrigin string, next http.Handler) http.Handler {
	allowed := parseAllowedOrigins(allowedOrigin)
	allowAll := false
	for _, o := range allowed {
		if o == "*" {
			allowAll = true
			break
		}
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")

		if allowAll {
			w.Header().Set("Access-Control-Allow-Origin", "*")
		} else if isOriginAllowed(allowed, origin) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			w.Header().Set("Vary", "Origin")
		}

		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, DELETE, PATCH, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		// Browser sessions use cookies, so reject cross-site state changes even
		// when a deployment intentionally uses SameSite=None for split origins.
		// API-key requests are header-authenticated and do not need this check.
		if isUnsafeMethod(r.Method) && auth.UserIDFromContext(r.Context()) != 0 &&
			!auth.IsAPIKeyRequest(r.Context()) && !isOriginAllowed(allowed, origin) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusForbidden)
			json.NewEncoder(w).Encode(model.ErrorResponse{Error: "request origin is not allowed"})
			return
		}
		next.ServeHTTP(w, r)
	})
}

func isUnsafeMethod(method string) bool {
	switch method {
	case http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete:
		return true
	default:
		return false
	}
}

func parseAllowedOrigins(raw string) []string {
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		normalized := normalizeOrigin(p)
		if normalized != "" {
			out = append(out, normalized)
		}
	}
	return out
}

func normalizeOrigin(origin string) string {
	return strings.TrimSuffix(strings.TrimSpace(origin), "/")
}

func isOriginAllowed(allowed []string, origin string) bool {
	origin = normalizeOrigin(origin)
	if origin == "" {
		return false
	}

	for _, o := range allowed {
		if o == origin {
			return true
		}
	}

	originURL, err := url.Parse(origin)
	if err != nil || originURL.Scheme == "" || originURL.Host == "" {
		return false
	}
	if !isLoopbackHost(originURL.Hostname()) {
		return false
	}

	for _, candidate := range allowed {
		candidateURL, err := url.Parse(candidate)
		if err != nil || candidateURL.Scheme == "" || candidateURL.Host == "" {
			continue
		}
		if candidateURL.Scheme != originURL.Scheme {
			continue
		}
		if defaultPort(candidateURL) != defaultPort(originURL) {
			continue
		}
		if isLoopbackHost(candidateURL.Hostname()) {
			return true
		}
	}
	return false
}

func defaultPort(u *url.URL) string {
	if p := u.Port(); p != "" {
		return p
	}
	switch strings.ToLower(u.Scheme) {
	case "https":
		return "443"
	default:
		return "80"
	}
}

func isLoopbackHost(host string) bool {
	normalized := strings.ToLower(strings.Trim(host, "[]"))
	return normalized == "localhost" || normalized == "127.0.0.1" || normalized == "::1"
}
