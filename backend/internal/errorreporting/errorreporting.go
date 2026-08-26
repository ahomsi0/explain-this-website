// Package errorreporting wires optional exception capture via Sentry.
//
// It is dormant unless SENTRY_DSN is configured: Init is a no-op without a
// DSN and Capture reports nothing, so local development and self-hosted
// deployments pay nothing for it. Set SENTRY_DSN in production and panics and
// 5xx responses start flowing to the project the DSN points at.
package errorreporting

import (
	"log"
	"os"
	"strings"
	"time"

	"github.com/getsentry/sentry-go"
)

var enabled bool

// Init configures Sentry from SENTRY_DSN. Safe to call unconditionally.
func Init() {
	dsn := strings.TrimSpace(os.Getenv("SENTRY_DSN"))
	if dsn == "" {
		log.Println("SENTRY_DSN not set — error reporting disabled")
		return
	}
	if err := sentry.Init(sentry.ClientOptions{
		Dsn:              dsn,
		Environment:      env(),
		AttachStacktrace: true,
		BeforeSend: func(event *sentry.Event, hint *sentry.EventHint) *sentry.Event {
			// Never ship request bodies — analyze payloads could contain
			// private URLs and auth bodies contain credentials.
			if hint.Request != nil {
				hint.Request.Body = nil
			}
			return event
		},
	}); err != nil {
		log.Printf("sentry init: %v", err)
		return
	}
	enabled = true
	log.Println("Sentry error reporting enabled")
}

func env() string {
	if e := strings.TrimSpace(os.Getenv("APP_ENV")); e != "" {
		return e
	}
	return "production"
}

// Enabled reports whether events will actually be delivered.
func Enabled() bool { return enabled }

// Capture reports an error to Sentry when enabled. Safe on nil/empty.
func Capture(err error, requestID string) {
	if !enabled || err == nil {
		return
	}
	hub := sentry.CurrentHub()
	hub.ConfigureScope(func(scope *sentry.Scope) {
		if requestID != "" {
			scope.SetTag("request_id", requestID)
		}
	})
	hub.CaptureException(err)
}

// Flush waits up to the timeout for queued events to be delivered. Call on
// shutdown paths.
func Flush() {
	if enabled {
		_ = sentry.Flush(5 * time.Second)
	}
}
