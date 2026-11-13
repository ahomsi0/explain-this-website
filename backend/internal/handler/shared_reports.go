package handler

import (
	"context"
	"encoding/json"
	"sync/atomic"
	"time"

	"github.com/ahomsi/explain-website/internal/db"
	"github.com/ahomsi/explain-website/internal/model"
)

// Reports run without an account have no audits row (that table is account
// history), so their links are persisted here. Without it they would live
// only in the in-memory store and stop working on every restart or idle
// spin-down, minutes after the visitor copied the link.

// lastSharedReportPurge is the unix time of the last expiry purge, so it runs
// at most once per purgeInterval per process without a background goroutine.
var lastSharedReportPurge atomic.Int64

// saveAnonymousReport stores an account-less report under its public ID for
// shareTTL. Best-effort: the analysis already succeeded, so a failed insert
// only means the link falls back to the in-memory store's lifetime.
func saveAnonymousReport(ctx context.Context, id string, result model.AnalysisResult) {
	if !db.IsAvailable() {
		return
	}
	resultJSON, err := json.Marshal(result)
	if err != nil {
		return
	}
	// The response may already be on its way; don't tie the insert to the request.
	insertCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 5*time.Second)
	defer cancel()
	_, _ = db.Pool.Exec(insertCtx,
		`INSERT INTO shared_reports (id, result, expires_at) VALUES ($1, $2, $3)
		 ON CONFLICT (id) DO NOTHING`,
		id, resultJSON, time.Now().UTC().Add(shareTTL),
	)
	purgeExpiredSharedReports(insertCtx)
}

// loadAnonymousReport returns the stored JSON for an unexpired account-less report.
func loadAnonymousReport(ctx context.Context, id string) ([]byte, bool) {
	if !db.IsAvailable() {
		return nil, false
	}
	var raw []byte
	err := db.Pool.QueryRow(ctx,
		`SELECT result FROM shared_reports WHERE id = $1 AND expires_at > NOW()`, id).Scan(&raw)
	if err != nil {
		return nil, false
	}
	return raw, true
}

func purgeExpiredSharedReports(ctx context.Context) {
	now := time.Now()
	last := lastSharedReportPurge.Load()
	if now.Unix()-last < int64(purgeInterval/time.Second) || !lastSharedReportPurge.CompareAndSwap(last, now.Unix()) {
		return
	}
	_, _ = db.Pool.Exec(ctx, `DELETE FROM shared_reports WHERE expires_at <= NOW()`)
}
