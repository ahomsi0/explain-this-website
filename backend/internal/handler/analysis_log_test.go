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

func TestLoggableURL(t *testing.T) {
	cases := map[string]string{
		"https://example.com/":                           "https://example.com/",
		"https://example.com/page?token=secret&x=1#frag": "https://example.com/page",
		"https://user:pass@example.com/a/b?q=1":          "https://example.com/a/b",
		"  https://Example.com:8443/path  ":              "https://Example.com:8443/path",
		"not a url":                                      "",
		"":                                               "",
		"https://example.com/" + strings.Repeat("a", 400): "https://example.com/" + strings.Repeat("a", 300-len("https://example.com/")),
	}
	for in, want := range cases {
		if got := loggableURL(in); got != want {
			t.Errorf("loggableURL(%q) = %q, want %q", truncateRunes(in, 60), truncateRunes(got, 60), truncateRunes(want, 60))
		}
	}
}

// Needs a throwaway Postgres: INTEGRATION_DATABASE_URL=postgres://... go test ./internal/handler -run Anonymous
func TestRecentAuditsIncludeAnonymousAndRespectDeletion(t *testing.T) {
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

	tag := fmt.Sprintf("log-test-%d", time.Now().UnixNano())
	var userID int64
	if err := db.Pool.QueryRow(ctx, `INSERT INTO users (email, password_hash) VALUES ($1, 'x') RETURNING id`, tag+"@example.com").Scan(&userID); err != nil {
		t.Fatalf("insert user: %v", err)
	}
	t.Cleanup(func() {
		_, _ = db.Pool.Exec(context.Background(), `DELETE FROM users WHERE id = $1`, userID)
		_, _ = db.Pool.Exec(context.Background(), `DELETE FROM anonymous_analyses WHERE url LIKE $1`, "%"+tag+"%")
	})

	// Signed-in audits: one live, one soft-deleted.
	for id, deleted := range map[string]bool{tag + "-live": false, tag + "-gone": true} {
		var deletedAt any
		if deleted {
			deletedAt = time.Now()
		}
		if _, err := db.Pool.Exec(ctx,
			`INSERT INTO audits (id, user_id, url, title, result, deleted_at) VALUES ($1, $2, $3, 'Signed in', '{}'::jsonb, $4)`,
			id, userID, "https://signedin.example/"+id, deletedAt); err != nil {
			t.Fatalf("insert audit: %v", err)
		}
	}

	// Anonymous analysis goes through the real recorder (query string must be dropped).
	recordAnonymousAnalysis(ctx, "https://anon.example/"+tag+"?secret=1", "Anon page", false, 0, false)

	// An expired anonymous row, then force the hourly purge to run.
	if _, err := db.Pool.Exec(ctx,
		`INSERT INTO anonymous_analyses (url, title, created_at) VALUES ($1, 'Old', NOW() - INTERVAL '91 days')`,
		"https://old.example/"+tag); err != nil {
		t.Fatalf("insert old row: %v", err)
	}
	lastAnonymousPurge.Store(0)
	purgeOldAnonymousAnalyses(ctx)
	var oldLeft int
	_ = db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM anonymous_analyses WHERE url = $1`, "https://old.example/"+tag).Scan(&oldLeft)
	if oldLeft != 0 {
		t.Fatalf("expected the 91-day-old anonymous row to be purged, %d left", oldLeft)
	}

	var sawAnon, sawLive, sawGone bool
	for _, r := range loadRecentAudits(ctx) {
		switch {
		case strings.HasPrefix(r.ID, "anon-") && r.URL == "https://anon.example/"+tag:
			sawAnon = true
			if r.Email != "" || r.Title != "Anon page" {
				t.Errorf("anonymous row has wrong fields: %+v", r)
			}
		case r.ID == tag+"-live":
			sawLive = true
		case r.ID == tag+"-gone":
			sawGone = true
		}
	}
	if !sawAnon {
		t.Error("anonymous analysis missing from recent audits")
	}
	if !sawLive {
		t.Error("signed-in audit missing from recent audits")
	}
	if sawGone {
		t.Error("soft-deleted audit must not appear in recent audits")
	}
}
