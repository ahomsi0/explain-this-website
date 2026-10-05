package handler

import (
	"context"
	"fmt"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/ahomsi/explain-website/internal/db"
)

func sumDays(rows []dayCount) (n int) {
	for _, r := range rows {
		n += r.Count
	}
	return n
}

func sumOutcomes(rows []auditOutcomeRow) (total, ok, fail int) {
	for _, r := range rows {
		total, ok, fail = total+r.Total, ok+r.PerfOK, fail+r.PerfFail
	}
	return
}

// Needs a throwaway Postgres: INTEGRATION_DATABASE_URL=postgres://... go test ./internal/handler -run AdminStats
func TestAdminStatsIncludeAnonymousAnalyses(t *testing.T) {
	dsn := strings.TrimSpace(os.Getenv("INTEGRATION_DATABASE_URL"))
	if dsn == "" {
		t.Skip("set INTEGRATION_DATABASE_URL to run database tests")
	}
	t.Setenv("DATABASE_URL", dsn)
	t.Setenv("JWT_SECRET", "test-secret")
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := db.Init(ctx); err != nil {
		t.Fatalf("init db: %v", err)
	}
	t.Cleanup(db.Close)

	tag := fmt.Sprintf("stats-%d", time.Now().UnixNano())
	pageURL := "https://stats.example/" + tag
	t.Cleanup(func() {
		_, _ = db.Pool.Exec(context.Background(), `DELETE FROM anonymous_analyses WHERE url = $1`, pageURL)
	})

	daysBefore := sumDays(loadAuditsByDay(ctx))
	totalBefore, okBefore, failBefore := sumOutcomes(loadAuditOutcomes(ctx))

	// Two anonymous analyses of the same page: one with PageSpeed data, one without.
	recordAnonymousAnalysis(ctx, pageURL+"?utm=x", "Stats page", false, 987654, true)
	recordAnonymousAnalysis(ctx, pageURL, "Stats page", false, 987000, false)

	if got := sumDays(loadAuditsByDay(ctx)) - daysBefore; got != 2 {
		t.Errorf("audits by day grew by %d, want 2", got)
	}

	var topCount int
	for _, u := range loadTopURLs(ctx) {
		if u.URL == pageURL {
			topCount = u.Count
		}
	}
	if topCount != 2 {
		t.Errorf("top URLs count for the page = %d, want 2", topCount)
	}

	var slowMs int
	for _, s := range loadSlowAudits(ctx) {
		if s.URL == pageURL && s.DurationMs > slowMs {
			slowMs = s.DurationMs
		}
	}
	if slowMs != 987654 {
		t.Errorf("slowest audit for the page = %dms, want 987654", slowMs)
	}

	total, ok, fail := sumOutcomes(loadAuditOutcomes(ctx))
	if total-totalBefore != 2 || ok-okBefore != 1 || fail-failBefore != 1 {
		t.Errorf("outcomes grew by total=%d ok=%d fail=%d, want 2/1/1", total-totalBefore, ok-okBefore, fail-failBefore)
	}
}
