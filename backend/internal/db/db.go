// Package db owns the Postgres connection pool and schema migrations.
//
// Connection: DATABASE_URL env var (Neon-compatible).
// Migrations: simple embedded SQL run on startup. No migration tool — YAGNI for now.
package db

import (
	"context"
	"errors"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Pool is the global pgx pool. Nil when DATABASE_URL is unset (degrades to anonymous-only mode).
var Pool *pgxpool.Pool

// ErrNotConfigured indicates DATABASE_URL was not set, so DB-backed features are disabled.
var ErrNotConfigured = errors.New("database not configured")

// Init opens the pool and runs migrations. Returns nil if DATABASE_URL is unset (so the
// server still boots and serves anonymous traffic).
func Init(ctx context.Context) error {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		log.Println("DATABASE_URL not set — running in anonymous-only mode (no accounts/history)")
		return nil
	}

	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return fmt.Errorf("parse DATABASE_URL: %w", err)
	}
	cfg.MaxConns = 10
	cfg.MaxConnIdleTime = 5 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return fmt.Errorf("open pool: %w", err)
	}

	const (
		maxPingAttempts = 3
		pingTimeout     = 15 * time.Second
		retryDelay      = 3 * time.Second
	)

	var pingErr error
	for attempt := 1; attempt <= maxPingAttempts; attempt++ {
		pingCtx, cancel := context.WithTimeout(ctx, pingTimeout)
		pingErr = pool.Ping(pingCtx)
		cancel()
		if pingErr == nil {
			break
		}
		if ctx.Err() != nil {
			pool.Close()
			return fmt.Errorf("ping db: %w", pingErr)
		}
		if attempt < maxPingAttempts {
			log.Printf("Postgres ping attempt %d/%d failed: %v — retrying in %s", attempt, maxPingAttempts, pingErr, retryDelay)
			select {
			case <-time.After(retryDelay):
			case <-ctx.Done():
				pool.Close()
				return fmt.Errorf("ping db: %w", pingErr)
			}
		}
	}
	if pingErr != nil {
		pool.Close()
		return fmt.Errorf("ping db after %d attempts: %w", maxPingAttempts, pingErr)
	}

	Pool = pool
	log.Println("Connected to Postgres")

	if err := migrate(ctx); err != nil {
		return fmt.Errorf("migrate: %w", err)
	}
	return nil
}

// Close releases the connection pool.
func Close() {
	if Pool != nil {
		Pool.Close()
	}
}

// IsAvailable reports whether the DB pool is ready (account features enabled).
func IsAvailable() bool {
	return Pool != nil
}

const schema = `
CREATE TABLE IF NOT EXISTS users (
    id            BIGSERIAL PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audits (
    id          TEXT PRIMARY KEY,
    user_id     BIGINT REFERENCES users(id) ON DELETE CASCADE,
    url         TEXT NOT NULL,
    title       TEXT,
    result      JSONB NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audits_user_id_created_at_idx
    ON audits (user_id, created_at DESC) WHERE user_id IS NOT NULL;

ALTER TABLE audits ADD COLUMN IF NOT EXISTS is_shareable BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE audits ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS password_resets (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash   TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS password_resets_user_id_idx ON password_resets (user_id);

ALTER TABLE users ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'inactive';
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_current_period_end TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS users_stripe_customer_id_idx
    ON users (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_stripe_subscription_id_idx
    ON users (stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS user_daily_usage (
    user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    usage_date   DATE NOT NULL,
    count        INTEGER NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, usage_date)
);

CREATE TABLE IF NOT EXISTS anonymous_daily_usage (
    visitor_id   TEXT NOT NULL,
    usage_date   DATE NOT NULL,
    count        INTEGER NOT NULL DEFAULT 0,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (visitor_id, usage_date)
);

ALTER TABLE users   ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE users   ADD COLUMN IF NOT EXISTS admin_note   TEXT;
ALTER TABLE audits  ADD COLUMN IF NOT EXISTS duration_ms   INTEGER;
ALTER TABLE audits  ADD COLUMN IF NOT EXISTS perf_available BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE users ADD COLUMN IF NOT EXISTS tap_customer_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tap_subscription_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_interval TEXT NOT NULL DEFAULT 'monthly';

CREATE UNIQUE INDEX IF NOT EXISTS users_tap_customer_id_idx
    ON users (tap_customer_id) WHERE tap_customer_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_tap_subscription_id_idx
    ON users (tap_subscription_id) WHERE tap_subscription_id IS NOT NULL;
`

func migrate(ctx context.Context) error {
	_, err := Pool.Exec(ctx, schema)
	return err
}
