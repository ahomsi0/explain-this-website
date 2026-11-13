package parser

import (
	"context"
	"strings"
	"testing"
	"time"

	"golang.org/x/net/html"
)

const loginPage = `<!doctype html><html><head><title>Sign in</title></head><body>
<h1>Welcome back</h1>
<form action="/session" method="post">
  <label>Email <input type="email" name="email"></label>
  <label>Password <input type="password" name="password"></label>
  <button>Sign in</button>
</form>
<a href="/forgot">Forgot your password?</a>
</body></html>`

func detect(t *testing.T, page, url string) bool {
	t.Helper()
	doc, err := html.Parse(strings.NewReader(page))
	if err != nil {
		t.Fatalf("parse fixture: %v", err)
	}
	return DetectLoginWall(doc, extractVisibleText(doc), url)
}

func TestDetectLoginWall(t *testing.T) {
	longPage := `<html><body><h1>Shop</h1><p>` + strings.Repeat("Hand made widgets for every home. ", 80) +
		`</p><form><input type="password" name="p"></form></body></html>`
	noPassword := `<html><body><h1>Dashboard</h1><form><input type="text" name="q"></form></body></html>`

	cases := []struct {
		name string
		page string
		url  string
		want bool
	}{
		{"dashboard URL that served a sign-in form", loginPage, "https://app.example.com/dashboard", true},
		{"site root that is only a sign-in form", loginPage, "https://app.example.com/", true},
		{"login page analysed on purpose", loginPage, "https://example.com/login", false},
		{"sign-in path with a suffix", loginPage, "https://example.com/users/sign_in", false},
		{"wordpress login", loginPage, "https://example.com/wp-login.php", false},
		{"content page with an account form", longPage, "https://shop.example.com/", false},
		{"page without a password field", noPassword, "https://app.example.com/dashboard", false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := detect(t, tc.page, tc.url); got != tc.want {
				t.Fatalf("DetectLoginWall = %v, want %v", got, tc.want)
			}
		})
	}
}

// A captured page is the page the user meant, and its links and hostname can
// be private. Parsing it must not flag a login wall or reach out anywhere.
func TestParseCapturedStaysOffline(t *testing.T) {
	page := `<!doctype html><html><head><title>Billing</title></head><body>
<h1>Billing</h1>
<a href="https://billing.example.net/session/one-time-token">Manage card</a>
<form><input type="password" name="confirm"></form>
</body></html>`

	// The hostname does not resolve and the deadline is short: a parse that
	// probed links or looked the domain up would stall or fail here.
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	result, err := ParseCaptured(ctx, page, "https://intranet.corp.internal/billing", nil)
	if err != nil {
		t.Fatalf("ParseCaptured: %v", err)
	}
	if result.LoginWall {
		t.Error("a captured page must not be reported as a login wall")
	}
	if result.LinkCheck.Checked != 0 || len(result.LinkCheck.Items) != 0 {
		t.Errorf("captured pages must not have their links probed, got %+v", result.LinkCheck)
	}
	if result.DomainInfo != nil {
		t.Errorf("captured pages must not trigger a domain lookup, got %+v", result.DomainInfo)
	}
	if result.Performance != nil {
		t.Errorf("captured pages must not run PageSpeed, got %+v", result.Performance)
	}
	if result.Overview.Title != "Billing" {
		t.Errorf("title = %q, want Billing", result.Overview.Title)
	}
}
