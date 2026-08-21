package integration

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/http/cookiejar"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/ahomsi/explain-website/internal/config"
	"github.com/ahomsi/explain-website/internal/db"
	"github.com/ahomsi/explain-website/internal/handler"
	"github.com/ahomsi/explain-website/internal/model"
	"github.com/ahomsi/explain-website/internal/server"
)

func TestAuthenticatedAnalysisFlow(t *testing.T) {
	dsn := strings.TrimSpace(os.Getenv("INTEGRATION_DATABASE_URL"))
	if dsn == "" {
		t.Skip("set INTEGRATION_DATABASE_URL to run API/database integration tests")
	}

	t.Setenv("DATABASE_URL", dsn)
	t.Setenv("JWT_SECRET", "integration-test-secret")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := db.Init(ctx); err != nil {
		t.Fatalf("initialize database: %v", err)
	}
	t.Cleanup(db.Close)

	var userID int64
	email := fmt.Sprintf("integration-%d@example.com", time.Now().UnixNano())
	t.Cleanup(func() {
		if userID != 0 && db.IsAvailable() {
			_, _ = db.Pool.Exec(context.Background(), `DELETE FROM users WHERE id = $1`, userID)
		}
	})

	cfg := config.Config{
		AllowedOrigin:   "http://frontend.test",
		FetchTimeoutSec: 5,
		MaxBodyBytes:    1 << 20,
	}
	apiConfig := handler.Config{
		FetchTimeoutSec: cfg.FetchTimeoutSec,
		MaxBodyBytes:    cfg.MaxBodyBytes,
		FetchHTML: func(context.Context, string, int64) (string, http.Header, error) {
			return `<!doctype html><html><head><title>Integration page</title></head><body><h1>Hello</h1></body></html>`, http.Header{"Content-Type": []string{"text/html"}}, nil
		},
		Parse: func(_ context.Context, _ string, sourceURL string, _ string) (model.AnalysisResult, error) {
			return model.AnalysisResult{
				URL:       sourceURL,
				FetchedAt: time.Now().UTC(),
				Overview:  model.Overview{Title: "Integration page"},
			}, nil
		},
	}
	api := server.NewHandlerWithAnalyzeConfig(cfg, apiConfig)
	ts := httptest.NewServer(api)
	defer ts.Close()

	jar, err := cookiejar.New(nil)
	if err != nil {
		t.Fatalf("create cookie jar: %v", err)
	}
	client := &http.Client{Jar: jar}

	resp := doJSON(t, client, http.MethodPost, ts.URL+"/api/auth/signup", `{"email":"`+email+`","password":"correct-horse-battery"}`)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("signup status = %d, body = %s", resp.StatusCode, readBody(resp))
	}
	var signup struct {
		User struct {
			ID int64 `json:"id"`
		} `json:"user"`
	}
	decodeBody(t, resp, &signup)
	userID = signup.User.ID
	if userID == 0 {
		t.Fatal("signup response did not include a user id")
	}

	resp = doJSON(t, client, http.MethodPost, ts.URL+"/api/events", `{"event":"signup_completed","source":"integration"}`)
	if resp.StatusCode != http.StatusNoContent {
		t.Fatalf("event status = %d, body = %s", resp.StatusCode, readBody(resp))
	}

	resp = doJSON(t, client, http.MethodPost, ts.URL+"/api/analyze", `{"url":"https://example.com"}`)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("analyze status = %d, body = %s", resp.StatusCode, readBody(resp))
	}
	var analysis struct {
		Usage *model.UsageSummary `json:"usage"`
	}
	decodeBody(t, resp, &analysis)
	if analysis.Usage == nil || analysis.Usage.DailyUsed != 1 {
		t.Fatalf("unexpected usage after analyze: %+v", analysis.Usage)
	}

	resp = doJSON(t, client, http.MethodGet, ts.URL+"/api/audits", "")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("history status = %d, body = %s", resp.StatusCode, readBody(resp))
	}
	var audits []struct {
		ID string `json:"id"`
	}
	decodeBody(t, resp, &audits)
	if len(audits) != 1 || audits[0].ID == "" {
		t.Fatalf("unexpected history response: %+v", audits)
	}

	resp = doJSON(t, client, http.MethodGet, ts.URL+"/api/report/"+audits[0].ID, "")
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("report status = %d, body = %s", resp.StatusCode, readBody(resp))
	}
	_ = readBody(resp)

	resp = doJSON(t, client, http.MethodDelete, ts.URL+"/api/audits/"+audits[0].ID, "")
	if resp.StatusCode != http.StatusNoContent {
		t.Fatalf("delete status = %d, body = %s", resp.StatusCode, readBody(resp))
	}
}

func doJSON(t *testing.T, client *http.Client, method, url, body string) *http.Response {
	t.Helper()
	var reader io.Reader
	if body != "" {
		reader = strings.NewReader(body)
	}
	req, err := http.NewRequest(method, url, reader)
	if err != nil {
		t.Fatalf("create request: %v", err)
	}
	req.Header.Set("Origin", "http://frontend.test")
	if body != "" {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := client.Do(req)
	if err != nil {
		t.Fatalf("request %s %s: %v", method, url, err)
	}
	return resp
}

func decodeBody(t *testing.T, resp *http.Response, target any) {
	t.Helper()
	defer resp.Body.Close()
	if err := json.NewDecoder(resp.Body).Decode(target); err != nil {
		t.Fatalf("decode response: %v", err)
	}
}

func readBody(resp *http.Response) string {
	defer resp.Body.Close()
	b, _ := io.ReadAll(resp.Body)
	return string(b)
}
