package server

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"runtime/debug"
	"strings"

	"github.com/ahomsi/explain-website/internal/config"
	"github.com/ahomsi/explain-website/internal/handler"
	"github.com/ahomsi/explain-website/internal/model"
)

// Start wires up routes and begins listening.
func Start(cfg config.Config) error {
	mux := http.NewServeMux()

	handlerCfg := handler.Config{
		FetchTimeoutSec: cfg.FetchTimeoutSec,
		MaxBodyBytes:    cfg.MaxBodyBytes,
	}

	mux.HandleFunc("POST /api/analyze", handler.AnalyzeHandler(handlerCfg))

	health := func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("ok"))
	}
	mux.HandleFunc("GET /health", health)
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	wrapped := recoveryMiddleware(corsMiddleware(cfg.AllowedOrigin, mux))

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("Server listening on %s (CORS origin: %s)", addr, cfg.AllowedOrigin)
	return http.ListenAndServe(addr, wrapped)
}

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

// corsMiddleware adds the necessary headers to allow the frontend to call the API.
// ALLOWED_ORIGIN can be:
//   - "*"                    → allow all origins (open API)
//   - "https://foo.com"      → single origin
//   - "https://a.com,https://b.com" → comma-separated list of allowed origins
func corsMiddleware(allowedOrigin string, next http.Handler) http.Handler {
	allowed := strings.Split(allowedOrigin, ",")
	for i, o := range allowed {
		allowed[i] = strings.TrimSpace(o)
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")

		if allowedOrigin == "*" {
			w.Header().Set("Access-Control-Allow-Origin", "*")
		} else {
			for _, o := range allowed {
				if o == origin {
					w.Header().Set("Access-Control-Allow-Origin", origin)
					w.Header().Set("Vary", "Origin")
					break
				}
			}
		}

		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
