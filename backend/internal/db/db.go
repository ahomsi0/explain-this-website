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

	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := pool.Ping(pingCtx); err != nil {
		return fmt.Errorf("ping db: %w", err)
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
`

func migrate(ctx context.Context) error {
	_, err := Pool.Exec(ctx, schema)
	return err
}
