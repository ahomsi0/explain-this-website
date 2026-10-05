package handler

import (
	"context"
	"net/url"
	"strings"
	"sync/atomic"
	"time"

	"github.com/ahomsi/explain-website/internal/db"
)

const (
	// anonymousAnalysisRetention bounds how long anonymous analysis rows are kept.
	// The privacy policy states this period — change both together.
	anonymousAnalysisRetention = 90 * 24 * time.Hour
	purgeInterval              = time.Hour
	maxLoggedURLLen            = 300
	maxLoggedTitleLen          = 200
)

// lastAnonymousPurge is the unix time of the last retention purge, so the purge
// runs at most once per purgeInterval per process without a background goroutine.
var lastAnonymousPurge atomic.Int64

// loggableURL returns the analyzed URL without credentials, query string or
// fragment — those can carry tokens and are not needed to show "what was audited".
func loggableURL(raw string) string {
	u, err := url.Parse(strings.TrimSpace(raw))
	if err != nil || u.Host == "" {
		return ""
	}
	clean := url.URL{Scheme: u.Scheme, Host: u.Host, Path: u.Path}
	return truncateRunes(clean.String(), maxLoggedURLLen)
}

func truncateRunes(s string, n int) string {
	if r := []rune(s); len(r) > n {
		return string(r[:n])
	}
	return s
}

// recordAnonymousAnalysis logs an analysis made without an account. Best-effort,
// like saveAuditForUser: the analysis already succeeded, so failures are ignored.
func recordAnonymousAnalysis(ctx context.Context, rawURL, title string, cached bool) {
	if !db.IsAvailable() {
		return
	}
	logged := loggableURL(rawURL)
	if logged == "" {
		return
	}
	// The response may already be on its way; don't tie the insert to the request.
	insertCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 5*time.Second)
	defer cancel()
	_, _ = db.Pool.Exec(insertCtx,
		`INSERT INTO anonymous_analyses (url, title, cached) VALUES ($1, $2, $3)`,
		logged, truncateRunes(strings.TrimSpace(title), maxLoggedTitleLen), cached,
	)
	purgeOldAnonymousAnalyses(insertCtx)
}

func purgeOldAnonymousAnalyses(ctx context.Context) {
	now := time.Now()
	last := lastAnonymousPurge.Load()
	if now.Unix()-last < int64(purgeInterval/time.Second) || !lastAnonymousPurge.CompareAndSwap(last, now.Unix()) {
		return
	}
	_, _ = db.Pool.Exec(ctx,
		`DELETE FROM anonymous_analyses WHERE created_at < $1`,
		now.Add(-anonymousAnalysisRetention),
	)
}

// loadRecentAudits returns the 20 most recent analyses across all visitors:
// signed-in users' saved audits (soft-deleted ones excluded — this is an itemized
// list, so it must respect deletion) plus anonymous analyses.
func loadRecentAudits(ctx context.Context) []recentAuditRow {
	recent := []recentAuditRow{}
	rows, err := db.Pool.Query(ctx, `
		SELECT id, url, title, email, created_at FROM (
			SELECT a.id, a.url, COALESCE(a.title, '') AS title, COALESCE(u.email, '') AS email, a.created_at
			  FROM audits a
			  LEFT JOIN users u ON u.id = a.user_id
			 WHERE a.deleted_at IS NULL
			UNION ALL
			SELECT 'anon-' || x.id::text, x.url, COALESCE(x.title, ''), '', x.created_at
			  FROM anonymous_analyses x
		) recent
		 ORDER BY created_at DESC
		 LIMIT 20`)
	if err != nil {
		return recent
	}
	defer rows.Close()
	for rows.Next() {
		var row recentAuditRow
		if err := rows.Scan(&row.ID, &row.URL, &row.Title, &row.Email, &row.CreatedAt); err == nil {
			recent = append(recent, row)
		}
	}
	return recent
}
