package server

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"net/url"
	"runtime/debug"
	"strings"
	"sync"
	"time"

	"github.com/ahomsi/explain-website/internal/auth"
	"github.com/ahomsi/explain-website/internal/config"
	"github.com/ahomsi/explain-website/internal/db"
	"github.com/ahomsi/explain-website/internal/handler"
	"github.com/ahomsi/explain-website/internal/model"
)

// Start wires up routes and begins listening.
func Start(cfg config.Config) error {
	// Init DB (no-op when DATABASE_URL is unset).
	dbCtx, dbCancel := context.WithTimeout(context.Background(), 45*time.Second)
	defer dbCancel()
	if err := db.Init(dbCtx); err != nil {
		log.Printf("WARNING: db init failed (%v) — running in anonymous-only mode", err)
	}
	defer db.Close()

	mux := http.NewServeMux()

	handlerCfg := handler.Config{
		FetchTimeoutSec: cfg.FetchTimeoutSec,
		MaxBodyBytes:    cfg.MaxBodyBytes,
		PageSpeedAPIKey: cfg.PageSpeedAPIKey,
	}

	mux.HandleFunc("POST /api/analyze", handler.AnalyzeHandler(handlerCfg))
	mux.HandleFunc("GET /api/usage", handler.UsageHandler())
	mux.HandleFunc("GET /api/report/{id}", handler.ReportHandler())

	// Auth endpoints
	mux.HandleFunc("POST /api/auth/signup", handler.SignupHandler())
	mux.HandleFunc("POST /api/auth/login", handler.LoginHandler())
	mux.HandleFunc("POST /api/auth/forgot-password", handler.ForgotPasswordHandler())
	mux.HandleFunc("POST /api/auth/reset-password", handler.ResetPasswordHandler())
	mux.HandleFunc("GET /api/auth/me", auth.RequireAuth(handler.MeHandler()))
	mux.HandleFunc("POST /api/billing/checkout-session", auth.RequireAuth(handler.BillingCheckoutSessionHandler()))
	mux.HandleFunc("POST /api/billing/portal-session", auth.RequireAuth(handler.BillingPortalSessionHandler()))
	mux.HandleFunc("POST /api/billing/webhook", handler.BillingWebhookHandler())
	mux.HandleFunc("GET /api/admin/overview", auth.RequireAuth(handler.AdminOverviewHandler()))
	mux.HandleFunc("POST /api/admin/user-usage", auth.RequireAuth(handler.AdminUpdateUserUsageHandler()))
	mux.HandleFunc("POST /api/admin/anon-usage", auth.RequireAuth(handler.AdminUpdateAnonUsageHandler()))
	mux.HandleFunc("POST /api/admin/user-plan", auth.RequireAuth(handler.AdminUpdateUserPlanHandler()))
	mux.HandleFunc("POST /api/admin/flag", auth.RequireAuth(handler.AdminToggleFlagHandler()))
	mux.HandleFunc("POST /api/admin/broadcast", auth.RequireAuth(handler.AdminBroadcastHandler()))

	// User audit history (account-only)
	mux.HandleFunc("GET /api/audits", auth.RequireAuth(handler.AuditsListHandler()))
	mux.HandleFunc("DELETE /api/audits", auth.RequireAuth(handler.AuditsClearHandler()))
	mux.HandleFunc("DELETE /api/audits/{id}", auth.RequireAuth(handler.AuditDeleteHandler()))

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
				rateLimitMiddleware(rl,
					corsMiddleware(cfg.AllowedOrigin, mux),
				),
			),
		),
	)

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("Server listening on %s (CORS origin: %s)", addr, cfg.AllowedOrigin)
	return http.ListenAndServe(addr, wrapped)
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
	rlMax       = 10 // anonymous: 10/min
	rlMaxAuthed = 50 // logged-in: 50/min
	rlWindow    = time.Minute
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

// realIP extracts the client IP, honouring X-Forwarded-For from trusted proxies.
func realIP(r *http.Request) string {
	if fwd := r.Header.Get("X-Forwarded-For"); fwd != "" {
		// Leftmost entry is the original client.
		if ip := strings.TrimSpace(strings.SplitN(fwd, ",", 2)[0]); ip != "" {
			return ip
		}
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
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
		next.ServeHTTP(w, r)
	})
}

// ── Security headers ──────────────────────────────────────────────────────────

func securityHeadersMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
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
			w.Header().Set("Vary", "Origin")
		}

		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Visitor-Id")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
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
