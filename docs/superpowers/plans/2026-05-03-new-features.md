# New Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Security Headers Audit, Broken Link Checker, Color Palette Extractor, Vague Language Detector, Search Intent Alignment, and Dark/Light Mode Toggle to the Explain This Website dashboard.

**Architecture:** Each backend feature is a single Go file in `backend/internal/parser/` exporting one function, wired into `parser.Parse()`. Security headers require response headers from the fetcher, so `fetcher.FetchHTML` is extended to return `http.Header`. Broken links run concurrently via a goroutine alongside PageSpeed. Dark/Light mode is frontend-only: a `ThemeContext` toggles a `light` class on `<html>`, and CSS overrides in `index.css` remap zinc colors for light mode.

**Tech Stack:** Go 1.21+, `golang.org/x/net/html`, React 18, TypeScript, Tailwind CSS

---

## File Map

**New backend files:**
- `backend/internal/parser/security.go` — `AuditSecurityHeaders(headers http.Header) []model.SecurityHeaderCheck`
- `backend/internal/parser/security_test.go`
- `backend/internal/parser/links.go` — `CheckLinks(doc *html.Node, sourceURL string) model.LinkCheckResult`
- `backend/internal/parser/links_test.go`
- `backend/internal/parser/colors.go` — `ExtractColorPalette(doc *html.Node, rawHTML string) model.ColorPalette`
- `backend/internal/parser/colors_test.go`
- `backend/internal/parser/copy.go` — `AnalyzeCopy(visibleText string) model.CopyAnalysis`
- `backend/internal/parser/copy_test.go`
- `backend/internal/parser/intent_align.go` — `CheckIntentAlignment(doc *html.Node, rawHTML string) model.IntentAlignment`
- `backend/internal/parser/intent_align_test.go`

**Modified backend files:**
- `backend/internal/fetcher/fetcher.go` — return `(string, http.Header, error)` from `FetchHTML`
- `backend/internal/model/model.go` — 5 new struct groups + 5 new `AnalysisResult` fields
- `backend/internal/handler/analyze.go` — capture headers, pass to security audit, add to result
- `backend/internal/parser/parser.go` — wire broken links goroutine + 4 new analyser calls

**New frontend files:**
- `frontend/src/components/cards/SecurityHeadersCard.tsx`
- `frontend/src/components/cards/LinkCheckCard.tsx`
- `frontend/src/components/cards/ColorPaletteCard.tsx`
- `frontend/src/components/cards/VagueLanguageCard.tsx`
- `frontend/src/components/cards/IntentAlignmentCard.tsx`
- `frontend/src/context/ThemeContext.tsx`

**Modified frontend files:**
- `frontend/src/types/analysis.ts` — 5 new interfaces + 5 new fields on `AnalysisResult`
- `frontend/src/mock/mockData.ts` — add mock values for 5 new fields
- `frontend/src/components/ResultDashboard/sections.tsx` — add 5 new cards to SEO/UX sections
- `frontend/src/components/ResultDashboard/ResultDashboard.tsx` — theme toggle button + 2 new metric tiles
- `frontend/src/App.tsx` — wrap with `ThemeProvider`
- `frontend/src/index.css` — light mode CSS overrides

---

## Task 1: Extend Data Models

**Files:**
- Modify: `backend/internal/model/model.go`
- Modify: `frontend/src/types/analysis.ts`
- Modify: `frontend/src/mock/mockData.ts`

- [ ] **Step 1: Add 5 new struct groups to `model.go`**

Add after the `ImageFormatAudit` struct (before `ContentStats`):

```go
// SecurityHeaderCheck is a single HTTP security-header audit result.
type SecurityHeaderCheck struct {
	ID     string `json:"id"`
	Label  string `json:"label"`
	Status string `json:"status"` // "pass" | "warning" | "fail"
	Detail string `json:"detail"`
}

// LinkCheckItem is the result for a single link probe.
type LinkCheckItem struct {
	URL        string `json:"url"`
	Status     int    `json:"status"`     // HTTP status code; 0 = unreachable
	FinalURL   string `json:"finalUrl"`   // destination after any redirects
	IsRedirect bool   `json:"isRedirect"` // true when FinalURL != URL
	IsBroken   bool   `json:"isBroken"`   // true when status 0, 4xx, or 5xx
}

// LinkCheckResult summarises the health of all probed external links.
type LinkCheckResult struct {
	Checked   int             `json:"checked"`
	OK        int             `json:"ok"`
	Broken    int             `json:"broken"`
	Redirects int             `json:"redirects"`
	Items     []LinkCheckItem `json:"items"`
}

// ColorEntry is one extracted brand colour with its occurrence frequency.
type ColorEntry struct {
	Hex       string `json:"hex"`       // normalised 6-digit lowercase hex e.g. "#6d28d9"
	Frequency int    `json:"frequency"` // number of times seen in CSS/styles
}

// ColorPalette holds the top brand colours extracted from the page.
type ColorPalette struct {
	ThemeColor string       `json:"themeColor"` // from <meta name="theme-color">, may be empty
	Colors     []ColorEntry `json:"colors"`     // top 8, sorted by frequency descending
}

// VaguePhrase is a single flagged marketing cliché with an explanation.
type VaguePhrase struct {
	Phrase string `json:"phrase"`
	Reason string `json:"reason"`
}

// CopyAnalysis scores the specificity of the page's visible copy.
type CopyAnalysis struct {
	Score            int          `json:"score"`            // 0–100
	Label            string       `json:"label"`            // "Sharp" | "Mixed" | "Generic"
	VaguePhrases     []VaguePhrase `json:"vaguePhrases"`
	SpecificityHints []string     `json:"specificityHints"` // positive signals found
}

// IntentCheck is one claim-vs-evidence check for search intent alignment.
type IntentCheck struct {
	Claim  string `json:"claim"`  // e.g. "Title says 'pricing'"
	Signal string `json:"signal"` // e.g. "Price elements on page"
	Found  bool   `json:"found"`
}

// IntentAlignment scores how well page content backs up what title/meta claim.
type IntentAlignment struct {
	Score  int           `json:"score"`  // % of checks that passed (0–100)
	Checks []IntentCheck `json:"checks"` // may be empty when no intent keywords found
}
```

- [ ] **Step 2: Add 5 new fields to `AnalysisResult` in `model.go`**

Add after the `SiteFreshness` field in the `AnalysisResult` struct:

```go
SecurityHeaders []SecurityHeaderCheck `json:"securityHeaders"`
LinkCheck       LinkCheckResult       `json:"linkCheck"`
ColorPalette    ColorPalette          `json:"colorPalette"`
CopyAnalysis    CopyAnalysis          `json:"copyAnalysis"`
IntentAlignment IntentAlignment       `json:"intentAlignment"`
```

- [ ] **Step 3: Add matching TypeScript interfaces to `frontend/src/types/analysis.ts`**

Add after the `SiteFreshness` interface:

```typescript
export interface SecurityHeaderCheck {
  id: string;
  label: string;
  status: "pass" | "warning" | "fail";
  detail: string;
}

export interface LinkCheckItem {
  url: string;
  status: number;
  finalUrl: string;
  isRedirect: boolean;
  isBroken: boolean;
}

export interface LinkCheckResult {
  checked: number;
  ok: number;
  broken: number;
  redirects: number;
  items: LinkCheckItem[];
}

export interface ColorEntry {
  hex: string;
  frequency: number;
}

export interface ColorPalette {
  themeColor: string;
  colors: ColorEntry[];
}

export interface VaguePhrase {
  phrase: string;
  reason: string;
}

export interface CopyAnalysis {
  score: number;
  label: string;
  vaguePhrases: VaguePhrase[];
  specificityHints: string[];
}

export interface IntentCheck {
  claim: string;
  signal: string;
  found: boolean;
}

export interface IntentAlignment {
  score: number;
  checks: IntentCheck[];
}
```

- [ ] **Step 4: Add 5 new fields to the `AnalysisResult` interface in `analysis.ts`**

Add after `siteFreshness`:

```typescript
securityHeaders: SecurityHeaderCheck[];
linkCheck: LinkCheckResult;
colorPalette: ColorPalette;
copyAnalysis: CopyAnalysis;
intentAlignment: IntentAlignment;
```

- [ ] **Step 5: Add mock values to `frontend/src/mock/mockData.ts`**

Add after the `siteFreshness` field:

```typescript
securityHeaders: [
  { id: "hsts",        label: "Strict-Transport-Security", status: "pass",    detail: "max-age=31536000 present" },
  { id: "csp",         label: "Content-Security-Policy",   status: "fail",    detail: "Header not set — XSS risk" },
  { id: "xframe",      label: "X-Frame-Options",           status: "pass",    detail: "SAMEORIGIN" },
  { id: "xcontent",    label: "X-Content-Type-Options",    status: "pass",    detail: "nosniff" },
  { id: "referrer",    label: "Referrer-Policy",           status: "warning", detail: "Set but uses unsafe-url" },
  { id: "permissions", label: "Permissions-Policy",        status: "fail",    detail: "Header not set" },
],
linkCheck: {
  checked: 12,
  ok: 9,
  broken: 2,
  redirects: 1,
  items: [
    { url: "https://twitter.com/old-handle",       status: 404, finalUrl: "",                              isRedirect: false, isBroken: true },
    { url: "https://docs.example.com/deprecated",  status: 404, finalUrl: "",                              isRedirect: false, isBroken: true },
    { url: "https://facebook.com/page",            status: 301, finalUrl: "https://facebook.com/newpage",  isRedirect: true,  isBroken: false },
    { url: "https://linkedin.com/company/example", status: 200, finalUrl: "https://linkedin.com/company/example", isRedirect: false, isBroken: false },
  ],
},
colorPalette: {
  themeColor: "#6d28d9",
  colors: [
    { hex: "#6d28d9", frequency: 42 },
    { hex: "#7c3aed", frequency: 31 },
    { hex: "#a78bfa", frequency: 18 },
    { hex: "#f59e0b", frequency: 14 },
    { hex: "#10b981", frequency: 9  },
    { hex: "#18181b", frequency: 87 },
    { hex: "#f4f4f5", frequency: 53 },
  ],
},
copyAnalysis: {
  score: 42,
  label: "Generic",
  vaguePhrases: [
    { phrase: "best-in-class",      reason: "No evidence or comparison to support this claim" },
    { phrase: "innovative solutions", reason: "Used by 78% of pages we've analyzed — overused" },
    { phrase: "seamless experience",  reason: "Vague — what specifically is seamless?" },
  ],
  specificityHints: ["Contains percentage figures", "Mentions specific product names"],
},
intentAlignment: {
  score: 40,
  checks: [
    { claim: "Title says 'best' — comparison content expected", signal: "Comparison table or competitor names in body", found: false },
    { claim: "Meta mentions 'pricing' — price elements expected", signal: "$ / per month / price text in body",           found: false },
    { claim: "H1 topic matches title topic",                      signal: "H1 contains title keywords",                   found: true  },
    { claim: "Title says 'free' — free offering expected",        signal: "'Free' prominently in body text",              found: false },
    { claim: "Meta mentions 'guide' — numbered steps expected",   signal: "Ordered list or step-by-step content",         found: true  },
  ],
},
```

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website/frontend"
npx tsc -b --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website"
git add backend/internal/model/model.go frontend/src/types/analysis.ts frontend/src/mock/mockData.ts
git commit -m "feat: add data models for security headers, link check, color palette, copy analysis, intent alignment"
```

---

## Task 2: Security Headers Audit

**Files:**
- Create: `backend/internal/parser/security.go`
- Create: `backend/internal/parser/security_test.go`
- Modify: `backend/internal/fetcher/fetcher.go`
- Modify: `backend/internal/handler/analyze.go`

- [ ] **Step 1: Write the failing test**

Create `backend/internal/parser/security_test.go`:

```go
package parser

import (
	"net/http"
	"testing"
)

func TestAuditSecurityHeaders_AllPresent(t *testing.T) {
	headers := http.Header{
		"Strict-Transport-Security": []string{"max-age=31536000; includeSubDomains"},
		"Content-Security-Policy":   []string{"default-src 'self'"},
		"X-Frame-Options":           []string{"DENY"},
		"X-Content-Type-Options":    []string{"nosniff"},
		"Referrer-Policy":           []string{"strict-origin-when-cross-origin"},
		"Permissions-Policy":        []string{"geolocation=()"},
	}
	checks := AuditSecurityHeaders(headers)
	if len(checks) != 6 {
		t.Fatalf("expected 6 checks, got %d", len(checks))
	}
	for _, c := range checks {
		if c.Status != "pass" {
			t.Errorf("check %s: expected pass, got %s (%s)", c.ID, c.Status, c.Detail)
		}
	}
}

func TestAuditSecurityHeaders_NonePresent(t *testing.T) {
	checks := AuditSecurityHeaders(http.Header{})
	fails := 0
	for _, c := range checks {
		if c.Status == "fail" {
			fails++
		}
	}
	// HSTS, CSP, Permissions-Policy should fail; X-Frame-Options and X-Content-Type may warn or fail
	if fails < 3 {
		t.Errorf("expected at least 3 fails for empty headers, got %d", fails)
	}
}

func TestAuditSecurityHeaders_UnsafeReferrer(t *testing.T) {
	headers := http.Header{
		"Referrer-Policy": []string{"unsafe-url"},
	}
	checks := AuditSecurityHeaders(headers)
	var referrer *SecurityHeaderCheckForTest
	for i := range checks {
		if checks[i].ID == "referrer" {
			referrer = &checks[i]
			break
		}
	}
	if referrer == nil {
		t.Fatal("referrer check not found")
	}
	if referrer.Status != "warning" {
		t.Errorf("expected warning for unsafe-url referrer, got %s", referrer.Status)
	}
}
```

Wait — the test imports `model` via the parser package for `SecurityHeaderCheck`. Since `SecurityHeaderCheck` is in `model`, but the test calls `AuditSecurityHeaders` which returns `[]model.SecurityHeaderCheck`, we access fields directly. Remove the `SecurityHeaderCheckForTest` type — use `model.SecurityHeaderCheck` instead. Rewrite:

```go
package parser

import (
	"net/http"
	"testing"
)

func TestAuditSecurityHeaders_AllPresent(t *testing.T) {
	headers := http.Header{
		"Strict-Transport-Security": []string{"max-age=31536000"},
		"Content-Security-Policy":   []string{"default-src 'self'"},
		"X-Frame-Options":           []string{"DENY"},
		"X-Content-Type-Options":    []string{"nosniff"},
		"Referrer-Policy":           []string{"strict-origin-when-cross-origin"},
		"Permissions-Policy":        []string{"geolocation=()"},
	}
	checks := AuditSecurityHeaders(headers)
	if len(checks) != 6 {
		t.Fatalf("expected 6 checks, got %d", len(checks))
	}
	for _, c := range checks {
		if c.Status != "pass" {
			t.Errorf("id=%s: expected pass, got %s", c.ID, c.Status)
		}
	}
}

func TestAuditSecurityHeaders_NonePresent(t *testing.T) {
	checks := AuditSecurityHeaders(http.Header{})
	fails := 0
	for _, c := range checks {
		if c.Status == "fail" {
			fails++
		}
	}
	if fails < 3 {
		t.Errorf("expected ≥3 fails for empty headers, got %d", fails)
	}
}

func TestAuditSecurityHeaders_UnsafeReferrer(t *testing.T) {
	checks := AuditSecurityHeaders(http.Header{
		"Referrer-Policy": []string{"unsafe-url"},
	})
	for _, c := range checks {
		if c.ID == "referrer" && c.Status != "warning" {
			t.Errorf("expected warning for unsafe-url, got %s", c.Status)
		}
	}
}
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website/backend"
go test ./internal/parser/ -run TestAuditSecurityHeaders -v 2>&1 | head -20
```

Expected: `undefined: AuditSecurityHeaders`

- [ ] **Step 3: Create `backend/internal/parser/security.go`**

```go
package parser

import (
	"net/http"
	"strings"

	"github.com/ahomsi/explain-website/internal/model"
)

// AuditSecurityHeaders checks 6 HTTP response headers that protect visitors.
func AuditSecurityHeaders(headers http.Header) []model.SecurityHeaderCheck {
	return []model.SecurityHeaderCheck{
		checkHSTS(headers),
		checkCSP(headers),
		checkXFrame(headers),
		checkXContentType(headers),
		checkReferrer(headers),
		checkPermissions(headers),
	}
}

func checkHSTS(h http.Header) model.SecurityHeaderCheck {
	v := h.Get("Strict-Transport-Security")
	if v == "" {
		return model.SecurityHeaderCheck{ID: "hsts", Label: "Strict-Transport-Security", Status: "fail",
			Detail: "Header missing — browsers won't enforce HTTPS-only connections"}
	}
	return model.SecurityHeaderCheck{ID: "hsts", Label: "Strict-Transport-Security", Status: "pass",
		Detail: v}
}

func checkCSP(h http.Header) model.SecurityHeaderCheck {
	v := h.Get("Content-Security-Policy")
	if v == "" {
		return model.SecurityHeaderCheck{ID: "csp", Label: "Content-Security-Policy", Status: "fail",
			Detail: "Header missing — no protection against cross-site scripting (XSS)"}
	}
	return model.SecurityHeaderCheck{ID: "csp", Label: "Content-Security-Policy", Status: "pass",
		Detail: truncate(v, 80)}
}

func checkXFrame(h http.Header) model.SecurityHeaderCheck {
	v := strings.ToUpper(h.Get("X-Frame-Options"))
	if v == "" {
		return model.SecurityHeaderCheck{ID: "xframe", Label: "X-Frame-Options", Status: "warning",
			Detail: "Header missing — page may be embeddable in iframes (clickjacking risk)"}
	}
	if v != "DENY" && v != "SAMEORIGIN" {
		return model.SecurityHeaderCheck{ID: "xframe", Label: "X-Frame-Options", Status: "warning",
			Detail: "Unexpected value: " + h.Get("X-Frame-Options")}
	}
	return model.SecurityHeaderCheck{ID: "xframe", Label: "X-Frame-Options", Status: "pass",
		Detail: h.Get("X-Frame-Options")}
}

func checkXContentType(h http.Header) model.SecurityHeaderCheck {
	v := strings.ToLower(h.Get("X-Content-Type-Options"))
	if v == "nosniff" {
		return model.SecurityHeaderCheck{ID: "xcontent", Label: "X-Content-Type-Options", Status: "pass",
			Detail: "nosniff"}
	}
	if v == "" {
		return model.SecurityHeaderCheck{ID: "xcontent", Label: "X-Content-Type-Options", Status: "warning",
			Detail: "Header missing — browsers may MIME-sniff responses"}
	}
	return model.SecurityHeaderCheck{ID: "xcontent", Label: "X-Content-Type-Options", Status: "warning",
		Detail: "Expected nosniff, got: " + h.Get("X-Content-Type-Options")}
}

func checkReferrer(h http.Header) model.SecurityHeaderCheck {
	v := strings.ToLower(h.Get("Referrer-Policy"))
	if v == "" {
		return model.SecurityHeaderCheck{ID: "referrer", Label: "Referrer-Policy", Status: "warning",
			Detail: "Header missing — referrer defaults vary by browser"}
	}
	if v == "unsafe-url" || v == "no-referrer-when-downgrade" {
		return model.SecurityHeaderCheck{ID: "referrer", Label: "Referrer-Policy", Status: "warning",
			Detail: "Policy '" + h.Get("Referrer-Policy") + "' leaks full URL in referrer header"}
	}
	return model.SecurityHeaderCheck{ID: "referrer", Label: "Referrer-Policy", Status: "pass",
		Detail: h.Get("Referrer-Policy")}
}

func checkPermissions(h http.Header) model.SecurityHeaderCheck {
	v := h.Get("Permissions-Policy")
	if v == "" {
		return model.SecurityHeaderCheck{ID: "permissions", Label: "Permissions-Policy", Status: "fail",
			Detail: "Header missing — no browser feature restrictions set"}
	}
	return model.SecurityHeaderCheck{ID: "permissions", Label: "Permissions-Policy", Status: "pass",
		Detail: truncate(v, 80)}
}

// truncate shortens a string to max n characters, appending "…" if truncated.
func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website/backend"
go test ./internal/parser/ -run TestAuditSecurityHeaders -v
```

Expected: all 3 tests PASS.

- [ ] **Step 5: Extend `fetcher.FetchHTML` to return response headers**

In `backend/internal/fetcher/fetcher.go`, change the function signature and capture headers:

```go
// FetchHTML retrieves the raw HTML of the given URL.
// It also returns the HTTP response headers so callers can inspect security headers.
func FetchHTML(ctx context.Context, targetURL string, maxBytes int64) (string, http.Header, error) {
```

In the same function, replace the final `return body, nil` with:

```go
	return body, headers.Clone(), nil
```

And add `headers := resp.Header` just before reading the body (after the `friendlyStatusError` check):

```go
	if err := friendlyStatusError(resp.StatusCode, targetURL); err != nil {
		return "", nil, err
	}

	// Capture headers before reading body (body read closes the response).
	respHeaders := resp.Header.Clone()

	ct := resp.Header.Get("Content-Type")
	// ... existing content-type check ...

	body, err := readBody(resp, maxBytes)
	if err != nil {
		return "", nil, fmt.Errorf("failed reading page content: %w", err)
	}

	return body, respHeaders, nil
```

Also update all early `return "", err` and `return "", fmt.Errorf(...)` lines to `return "", nil, err` / `return "", nil, fmt.Errorf(...)`.

- [ ] **Step 6: Update `handler/analyze.go` to use the new signature and audit headers**

```go
rawHTML, respHeaders, err := fetcher.FetchHTML(ctx, rawURL, cfg.MaxBodyBytes)
if err != nil {
    writeError(w, http.StatusUnprocessableEntity, "could not fetch URL: "+err.Error())
    return
}

// Parse and analyse.
result, err := parser.Parse(rawHTML, rawURL, cfg.PageSpeedAPIKey)
if err != nil {
    writeError(w, http.StatusInternalServerError, "analysis failed: "+err.Error())
    return
}

result.SecurityHeaders = parser.AuditSecurityHeaders(respHeaders)
```

- [ ] **Step 7: Confirm backend builds**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website/backend"
go build ./...
```

Expected: no errors.

- [ ] **Step 8: Create `frontend/src/components/cards/SecurityHeadersCard.tsx`**

```tsx
import type { SecurityHeaderCheck } from "../../types/analysis";

function statusBadge(status: string) {
  if (status === "pass")    return "text-emerald-400 bg-emerald-950 border-emerald-800";
  if (status === "warning") return "text-amber-400 bg-amber-950 border-amber-800";
  return "text-red-400 bg-red-950 border-red-800";
}

function statusLabel(status: string) {
  if (status === "pass")    return "PASS";
  if (status === "warning") return "WARN";
  return "MISSING";
}

export function SecurityHeadersCard({ checks }: { checks: SecurityHeaderCheck[] }) {
  const pass = checks.filter(c => c.status === "pass").length;
  const score = checks.length ? Math.round((pass / checks.length) * 100) : 0;
  const scoreColor = score >= 80 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-red-400";

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Security Headers</p>
        <span className={`text-lg font-bold ${scoreColor}`}>{pass}<span className="text-xs text-zinc-600 font-medium">/{checks.length}</span></span>
      </div>

      <div className="flex flex-col gap-0">
        {checks.map((c) => (
          <div key={c.id} className="flex items-center justify-between py-2 border-b border-zinc-800 last:border-b-0 gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-zinc-300 font-mono">{c.label}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5 truncate">{c.detail}</p>
            </div>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${statusBadge(c.status)}`}>
              {statusLabel(c.status)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 9: Commit**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website"
git add backend/internal/parser/security.go backend/internal/parser/security_test.go \
        backend/internal/fetcher/fetcher.go backend/internal/handler/analyze.go \
        frontend/src/components/cards/SecurityHeadersCard.tsx
git commit -m "feat: add security headers audit (backend + card)"
```

---

## Task 3: Broken Link Checker

**Files:**
- Create: `backend/internal/parser/links.go`
- Create: `backend/internal/parser/links_test.go`
- Modify: `backend/internal/parser/parser.go`

- [ ] **Step 1: Write the failing test**

Create `backend/internal/parser/links_test.go`:

```go
package parser

import (
	"strings"
	"testing"

	"golang.org/x/net/html"
)

func TestExtractExternalLinks(t *testing.T) {
	rawHTML := `<html><body>
		<a href="https://twitter.com/foo">Twitter</a>
		<a href="https://github.com/bar">GitHub</a>
		<a href="/internal">Internal</a>
		<a href="#anchor">Anchor</a>
		<a href="mailto:a@b.com">Email</a>
		<a href="https://example.com/page">Same host</a>
	</body></html>`

	doc, _ := html.Parse(strings.NewReader(rawHTML))
	links := extractExternalLinks(doc, "https://example.com")

	if len(links) != 2 {
		t.Errorf("expected 2 external links (twitter, github), got %d: %v", len(links), links)
	}
}

func TestCheckLinks_Empty(t *testing.T) {
	doc, _ := html.Parse(strings.NewReader("<html><body></body></html>"))
	result := CheckLinks(doc, "https://example.com")
	if result.Checked != 0 {
		t.Errorf("expected 0 checked, got %d", result.Checked)
	}
}
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website/backend"
go test ./internal/parser/ -run "TestExtractExternalLinks|TestCheckLinks" -v 2>&1 | head -10
```

Expected: `undefined: extractExternalLinks`

- [ ] **Step 3: Create `backend/internal/parser/links.go`**

```go
package parser

import (
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/ahomsi/explain-website/internal/model"
	"golang.org/x/net/html"
)

const (
	linkCheckCap        = 30 // max external links to probe
	linkCheckTimeout    = 5 * time.Second
	linkCheckConcurrent = 8 // max parallel HEAD requests
)

var linkClient = &http.Client{
	Timeout: linkCheckTimeout,
	CheckRedirect: func(req *http.Request, via []*http.Request) error {
		if len(via) >= 5 {
			return http.ErrUseLastResponse
		}
		return nil
	},
}

// CheckLinks extracts up to linkCheckCap external links from doc and HEAD-probes each one.
func CheckLinks(doc *html.Node, sourceURL string) model.LinkCheckResult {
	links := extractExternalLinks(doc, sourceURL)
	if len(links) > linkCheckCap {
		links = links[:linkCheckCap]
	}

	if len(links) == 0 {
		return model.LinkCheckResult{}
	}

	items := make([]model.LinkCheckItem, len(links))
	sem := make(chan struct{}, linkCheckConcurrent)
	var wg sync.WaitGroup

	for i, u := range links {
		wg.Add(1)
		sem <- struct{}{}
		go func(idx int, target string) {
			defer wg.Done()
			defer func() { <-sem }()
			items[idx] = probeLink(target)
		}(i, u)
	}
	wg.Wait()

	result := model.LinkCheckResult{Checked: len(items), Items: items}
	for _, item := range items {
		switch {
		case item.IsBroken:
			result.Broken++
		case item.IsRedirect:
			result.Redirects++
		default:
			result.OK++
		}
	}
	return result
}

// extractExternalLinks returns deduplicated external hrefs from <a> tags.
func extractExternalLinks(doc *html.Node, sourceURL string) []string {
	var sourceHost string
	if u, err := url.Parse(sourceURL); err == nil {
		sourceHost = u.Hostname()
	}

	seen := map[string]bool{}
	var links []string

	var walk func(*html.Node)
	walk = func(n *html.Node) {
		if n.Type == html.ElementNode && n.Data == "a" {
			href := getAttr(n, "href")
			if href == "" || strings.HasPrefix(href, "#") ||
				strings.HasPrefix(href, "mailto:") || strings.HasPrefix(href, "tel:") ||
				strings.HasPrefix(href, "/") || strings.HasPrefix(href, "./") {
				goto next
			}
			if u, err := url.Parse(href); err == nil && u.Host != "" && u.Hostname() != sourceHost {
				norm := u.Scheme + "://" + u.Host + u.Path
				if !seen[norm] {
					seen[norm] = true
					links = append(links, href)
				}
			}
		}
	next:
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			walk(c)
		}
	}
	walk(doc)
	return links
}

// probeLink makes a HEAD request (falling back to GET on 405) and returns the result.
func probeLink(target string) model.LinkCheckItem {
	item := model.LinkCheckItem{URL: target, FinalURL: target}

	req, err := http.NewRequest(http.MethodHead, target, nil)
	if err != nil {
		item.IsBroken = true
		return item
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; ExplainThisWebsite/1.0)")

	resp, err := linkClient.Do(req)
	if err != nil {
		item.Status = 0
		item.IsBroken = true
		return item
	}
	defer resp.Body.Close()

	// Some servers reject HEAD; retry with GET.
	if resp.StatusCode == http.StatusMethodNotAllowed {
		req2, _ := http.NewRequest(http.MethodGet, target, nil)
		req2.Header.Set("User-Agent", req.Header.Get("User-Agent"))
		resp2, err2 := linkClient.Do(req2)
		if err2 == nil {
			defer resp2.Body.Close()
			resp = resp2
		}
	}

	item.Status = resp.StatusCode
	if resp.Request != nil && resp.Request.URL.String() != target {
		item.FinalURL = resp.Request.URL.String()
		item.IsRedirect = true
	}
	item.IsBroken = resp.StatusCode == 0 || resp.StatusCode >= 400
	return item
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website/backend"
go test ./internal/parser/ -run "TestExtractExternalLinks|TestCheckLinks" -v
```

Expected: both PASS.

- [ ] **Step 5: Wire `CheckLinks` into `parser.go` as a goroutine**

In `backend/internal/parser/parser.go`, add the link check channel alongside the existing `perfCh`:

After the `perfCh` declaration block, add:

```go
type linkResult struct{ data model.LinkCheckResult }
linkCh := make(chan linkResult, 1)
```

After `doc, err := html.Parse(...)`, add:

```go
// Kick off link checking concurrently — runs in parallel with HTML analysis.
go func() {
    linkCh <- linkResult{CheckLinks(doc, sourceURL)}
}()
```

Before the `return model.AnalysisResult{...}`, collect the result:

```go
linkCheck := (<-linkCh).data
```

Add `LinkCheck: linkCheck` to the returned `AnalysisResult`.

- [ ] **Step 6: Confirm backend builds**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website/backend"
go build ./...
```

Expected: no errors.

- [ ] **Step 7: Create `frontend/src/components/cards/LinkCheckCard.tsx`**

```tsx
import type { LinkCheckResult } from "../../types/analysis";

export function LinkCheckCard({ linkCheck }: { linkCheck: LinkCheckResult }) {
  if (linkCheck.checked === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-2">Link Health</p>
        <p className="text-xs text-zinc-500">No external links found on this page.</p>
      </div>
    );
  }

  const brokenItems  = linkCheck.items.filter(i => i.isBroken);
  const redirectItems = linkCheck.items.filter(i => i.isRedirect && !i.isBroken);

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Link Health</p>
        {linkCheck.broken > 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border text-red-400 bg-red-950 border-red-800">
            {linkCheck.broken} BROKEN
          </span>
        )}
      </div>

      {/* Summary strip */}
      <div className="flex gap-2 mb-4">
        {[
          { n: linkCheck.ok,        label: "OK",       cls: "text-emerald-400" },
          { n: linkCheck.broken,    label: "Broken",   cls: "text-red-400"     },
          { n: linkCheck.redirects, label: "Redirect", cls: "text-amber-400"   },
        ].map(({ n, label, cls }) => (
          <div key={label} className="flex-1 text-center bg-zinc-950 rounded-md py-2">
            <p className={`text-xl font-bold leading-none ${cls}`}>{n}</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Broken links list */}
      {brokenItems.length > 0 && (
        <div className="border-t border-zinc-800 pt-3">
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-2">Broken</p>
          {brokenItems.map((item, i) => (
            <div key={i} className="flex items-center gap-2 py-1.5 border-b border-zinc-800 last:border-b-0">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              <span className="text-[11px] text-zinc-400 flex-1 truncate">{item.url}</span>
              <span className="text-[10px] font-bold text-red-400">{item.status || "ERR"}</span>
            </div>
          ))}
        </div>
      )}

      {/* Redirects */}
      {redirectItems.length > 0 && (
        <div className="border-t border-zinc-800 pt-3 mt-1">
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-2">Redirects</p>
          {redirectItems.slice(0, 5).map((item, i) => (
            <div key={i} className="flex items-center gap-2 py-1.5 border-b border-zinc-800 last:border-b-0">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              <span className="text-[11px] text-zinc-400 flex-1 truncate">{item.url}</span>
              <span className="text-[10px] font-semibold text-amber-400">{item.status}</span>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-zinc-600 mt-3">Checked {linkCheck.checked} external links</p>
    </div>
  );
}
```

- [ ] **Step 8: Commit**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website"
git add backend/internal/parser/links.go backend/internal/parser/links_test.go \
        backend/internal/parser/parser.go \
        frontend/src/components/cards/LinkCheckCard.tsx
git commit -m "feat: add broken link checker (backend + card)"
```

---

## Task 4: Color Palette Extractor

**Files:**
- Create: `backend/internal/parser/colors.go`
- Create: `backend/internal/parser/colors_test.go`
- Modify: `backend/internal/parser/parser.go`

- [ ] **Step 1: Write the failing test**

Create `backend/internal/parser/colors_test.go`:

```go
package parser

import (
	"strings"
	"testing"

	"golang.org/x/net/html"
)

func TestExtractColorPalette_HexFromStyle(t *testing.T) {
	rawHTML := `<html><head><style>
		body { background-color: #1a1a2e; color: #e94560; }
		.btn { background: #0f3460; border-color: #533483; }
	</style></head><body></body></html>`
	doc, _ := html.Parse(strings.NewReader(rawHTML))
	palette := ExtractColorPalette(doc, rawHTML)
	if len(palette.Colors) == 0 {
		t.Fatal("expected colors to be extracted from <style>")
	}
	hexes := make(map[string]bool)
	for _, c := range palette.Colors {
		hexes[c.Hex] = true
	}
	if !hexes["#1a1a2e"] && !hexes["#e94560"] {
		t.Errorf("expected #1a1a2e or #e94560 in palette, got %v", palette.Colors)
	}
}

func TestExtractColorPalette_ThemeColor(t *testing.T) {
	rawHTML := `<html><head><meta name="theme-color" content="#6d28d9"></head><body></body></html>`
	doc, _ := html.Parse(strings.NewReader(rawHTML))
	palette := ExtractColorPalette(doc, rawHTML)
	if palette.ThemeColor != "#6d28d9" {
		t.Errorf("expected theme-color #6d28d9, got %q", palette.ThemeColor)
	}
}

func TestExtractColorPalette_FiltersNearBlack(t *testing.T) {
	rawHTML := `<html><head><style>body { color: #000000; background: #ffffff; }</style></head><body></body></html>`
	doc, _ := html.Parse(strings.NewReader(rawHTML))
	palette := ExtractColorPalette(doc, rawHTML)
	for _, c := range palette.Colors {
		if c.Hex == "#000000" || c.Hex == "#ffffff" {
			t.Errorf("near-black/near-white %s should be filtered out", c.Hex)
		}
	}
}
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website/backend"
go test ./internal/parser/ -run TestExtractColorPalette -v 2>&1 | head -10
```

Expected: `undefined: ExtractColorPalette`

- [ ] **Step 3: Create `backend/internal/parser/colors.go`**

```go
package parser

import (
	"fmt"
	"regexp"
	"sort"
	"strconv"
	"strings"

	"github.com/ahomsi/explain-website/internal/model"
	"golang.org/x/net/html"
)

// reHexColor matches a CSS property value containing a hex colour.
// It looks for hex after a colon (CSS property context) to avoid matching HTML IDs.
var reHexColor = regexp.MustCompile(`(?i):\s*#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b`)

// ExtractColorPalette pulls brand colours from <style> blocks, inline styles, and meta theme-color.
func ExtractColorPalette(doc *html.Node, rawHTML string) model.ColorPalette {
	palette := model.ColorPalette{}
	freq := map[string]int{}

	// Walk DOM for <style>, inline style attrs, and <meta name="theme-color">.
	var walk func(*html.Node)
	walk = func(n *html.Node) {
		if n.Type == html.ElementNode {
			switch strings.ToLower(n.Data) {
			case "style":
				if n.FirstChild != nil && n.FirstChild.Type == html.TextNode {
					extractHexColors(n.FirstChild.Data, freq)
				}
			case "meta":
				if strings.EqualFold(getAttr(n, "name"), "theme-color") {
					if c := normalizeHex(getAttr(n, "content")); c != "" {
						palette.ThemeColor = c
					}
				}
			}
			if style := getAttr(n, "style"); style != "" {
				extractHexColors(style, freq)
			}
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			walk(c)
		}
	}
	walk(doc)

	// Sort by frequency descending, take top 8, filter noise.
	type kv struct {
		hex  string
		freq int
	}
	var sorted []kv
	for hex, f := range freq {
		if !isNearBlack(hex) && !isNearWhite(hex) {
			sorted = append(sorted, kv{hex, f})
		}
	}
	sort.Slice(sorted, func(i, j int) bool { return sorted[i].freq > sorted[j].freq })
	if len(sorted) > 8 {
		sorted = sorted[:8]
	}
	for _, kv := range sorted {
		palette.Colors = append(palette.Colors, model.ColorEntry{Hex: kv.hex, Frequency: kv.freq})
	}
	return palette
}

func extractHexColors(css string, freq map[string]int) {
	matches := reHexColor.FindAllStringSubmatch(css, -1)
	for _, m := range matches {
		if hex := normalizeHex("#" + m[1]); hex != "" {
			freq[hex]++
		}
	}
}

// normalizeHex expands 3-digit hex to 6-digit lowercase (#abc → #aabbcc).
func normalizeHex(s string) string {
	s = strings.TrimSpace(strings.ToLower(s))
	if !strings.HasPrefix(s, "#") {
		return ""
	}
	h := s[1:]
	if len(h) == 3 {
		h = string([]byte{h[0], h[0], h[1], h[1], h[2], h[2]})
	}
	if len(h) != 6 {
		return ""
	}
	if _, err := strconv.ParseUint(h, 16, 32); err != nil {
		return ""
	}
	return fmt.Sprintf("#%s", h)
}

// isNearBlack returns true for colours where all RGB channels are < 30.
func isNearBlack(hex string) bool {
	r, g, b, ok := hexToRGB(hex)
	return ok && r < 30 && g < 30 && b < 30
}

// isNearWhite returns true for colours where all RGB channels are > 225.
func isNearWhite(hex string) bool {
	r, g, b, ok := hexToRGB(hex)
	return ok && r > 225 && g > 225 && b > 225
}

func hexToRGB(hex string) (r, g, b uint64, ok bool) {
	if len(hex) != 7 || hex[0] != '#' {
		return
	}
	r, err := strconv.ParseUint(hex[1:3], 16, 8)
	if err != nil { return }
	g, err = strconv.ParseUint(hex[3:5], 16, 8)
	if err != nil { return }
	b, err = strconv.ParseUint(hex[5:7], 16, 8)
	if err != nil { return }
	ok = true
	return
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website/backend"
go test ./internal/parser/ -run TestExtractColorPalette -v
```

Expected: all 3 PASS.

- [ ] **Step 5: Wire into `parser.go`**

In `Parse()`, add after the `freshness := auditFreshness(...)` line:

```go
colorPalette := ExtractColorPalette(doc, rawHTML)
```

Add `ColorPalette: colorPalette` to the returned `AnalysisResult`.

- [ ] **Step 6: Confirm backend builds**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website/backend"
go build ./...
```

- [ ] **Step 7: Create `frontend/src/components/cards/ColorPaletteCard.tsx`**

```tsx
import { useState } from "react";
import type { ColorPalette } from "../../types/analysis";

function contrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#000000" : "#ffffff";
}

export function ColorPaletteCard({ colorPalette }: { colorPalette: ColorPalette }) {
  const [copied, setCopied] = useState<string | null>(null);

  function copyHex(hex: string) {
    navigator.clipboard.writeText(hex).catch(() => {});
    setCopied(hex);
    setTimeout(() => setCopied(null), 1500);
  }

  if (colorPalette.colors.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-2">Color Palette</p>
        <p className="text-xs text-zinc-500">No brand colors detected in CSS or inline styles.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Color Palette</p>
        {colorPalette.themeColor && (
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full border border-zinc-700" style={{ background: colorPalette.themeColor }} />
            <span className="text-[10px] text-zinc-500 font-mono">{colorPalette.themeColor}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {colorPalette.colors.map((entry) => (
          <button
            key={entry.hex}
            onClick={() => copyHex(entry.hex)}
            title={`Click to copy ${entry.hex}`}
            className="flex flex-col items-center gap-1 group"
          >
            <div
              className="w-10 h-10 rounded-lg border border-white/10 shadow-sm group-hover:scale-110 transition-transform flex items-center justify-center"
              style={{ background: entry.hex }}
            >
              {copied === entry.hex && (
                <span style={{ color: contrastColor(entry.hex), fontSize: 10 }}>✓</span>
              )}
            </div>
            <span className="text-[9px] text-zinc-500 font-mono">{entry.hex}</span>
          </button>
        ))}
      </div>

      <p className="text-[10px] text-zinc-600 mt-3">Click any swatch to copy hex · {colorPalette.colors.length} colors detected</p>
    </div>
  );
}
```

- [ ] **Step 8: Commit**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website"
git add backend/internal/parser/colors.go backend/internal/parser/colors_test.go \
        backend/internal/parser/parser.go \
        frontend/src/components/cards/ColorPaletteCard.tsx
git commit -m "feat: add color palette extractor (backend + card)"
```

---

## Task 5: Vague Language Detector

**Files:**
- Create: `backend/internal/parser/copy.go`
- Create: `backend/internal/parser/copy_test.go`
- Modify: `backend/internal/parser/parser.go`

- [ ] **Step 1: Write the failing test**

Create `backend/internal/parser/copy_test.go`:

```go
package parser

import "testing"

func TestAnalyzeCopy_GenericText(t *testing.T) {
	text := "We provide best-in-class innovative solutions with seamless integration and world-class support."
	result := AnalyzeCopy(text)
	if result.Score >= 50 {
		t.Errorf("expected score < 50 for generic text, got %d", result.Score)
	}
	if result.Label != "Generic" {
		t.Errorf("expected label Generic, got %s", result.Label)
	}
	if len(result.VaguePhrases) == 0 {
		t.Error("expected vague phrases to be detected")
	}
}

func TestAnalyzeCopy_SpecificText(t *testing.T) {
	text := "Our tool reduces reporting time by 40%. Over 10,000 teams use it. Integrates with Slack and Jira in 5 minutes."
	result := AnalyzeCopy(text)
	if result.Score < 60 {
		t.Errorf("expected score >= 60 for specific text, got %d", result.Score)
	}
}

func TestAnalyzeCopy_EmptyText(t *testing.T) {
	result := AnalyzeCopy("")
	if result.Score != 100 {
		t.Errorf("expected score 100 for empty text, got %d", result.Score)
	}
}
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website/backend"
go test ./internal/parser/ -run TestAnalyzeCopy -v 2>&1 | head -10
```

Expected: `undefined: AnalyzeCopy`

- [ ] **Step 3: Create `backend/internal/parser/copy.go`**

```go
package parser

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/ahomsi/explain-website/internal/model"
)

var vagueList = []struct {
	phrase string
	reason string
}{
	{"best-in-class",       "No evidence or comparison to support this claim"},
	{"world-class",         "Overused superlative — replace with a specific differentiator"},
	{"industry-leading",    "Requires proof — what metric makes it industry-leading?"},
	{"cutting-edge",        "Vague — what specific technology or approach is new?"},
	{"state-of-the-art",    "Overused — replace with what is actually new about it"},
	{"innovative",          "Everyone claims innovation — what specifically is new?"},
	{"revolutionary",       "Extraordinary claims need extraordinary evidence"},
	{"groundbreaking",      "Extraordinary claims need extraordinary evidence"},
	{"seamless",            "Vague — what specifically is frictionless?"},
	{"robust",              "Vague technical adjective — be specific about resilience"},
	{"scalable",            "Vague — what scale? What load? Add numbers"},
	{"comprehensive",       "Overused — list what is actually included instead"},
	{"holistic",            "Jargon with no specific meaning in most contexts"},
	{"synergy",             "Corporate cliché — replace with what actually combines"},
	{"leverage",            "Jargon — use 'use' or 'apply' instead"},
	{"empower",             "Overused — describe the concrete capability instead"},
	{"transformative",      "Requires proof — what specifically changes?"},
	{"game-changing",       "Requires proof — what specifically changes?"},
	{"next-generation",     "Vague — what generation and what is new about it?"},
	{"next-gen",            "Vague — what generation and what is new about it?"},
	{"turnkey",             "Jargon — replace with what is actually included"},
	{"end-to-end",          "Overused — specify the actual scope instead"},
	{"best practices",      "Vague — which practices? Specified by whom?"},
	{"thought leader",      "Self-applied label — let readers judge expertise"},
	{"disruptive",          "Overused in tech marketing — be specific about impact"},
	{"paradigm shift",      "Jargon — describe the actual change"},
	{"move the needle",     "Business jargon — replace with a measurable outcome"},
	{"low-hanging fruit",   "Business jargon — describe the actual opportunity"},
	{"deep dive",           "Business jargon — say 'detailed look' or 'analysis'"},
	{"mission-critical",    "Overused — describe the actual consequence of failure"},
}

// Positive specificity signals
var reSpecificity = []*regexp.Regexp{
	regexp.MustCompile(`\d+\s*%`),                          // percentages
	regexp.MustCompile(`\d+[xX]\s`),                        // multipliers (3x faster)
	regexp.MustCompile(`\$[\d,]+`),                         // dollar amounts
	regexp.MustCompile(`\d+[,\d]*\s*(users?|customers?|teams?|companies)`), // user counts
	regexp.MustCompile(`(vs\.?|versus|compared to|beats?|outperforms?)`),   // comparisons
	regexp.MustCompile(`\b(in|within)\s+\d+\s*(seconds?|minutes?|hours?|days?)`), // timeframes
}

var specificityLabels = []string{
	"Contains percentage figures",
	"Uses multiplier claims",
	"Mentions specific pricing",
	"References user/customer counts",
	"Includes comparisons",
	"Uses specific timeframes",
}

// AnalyzeCopy scans visible text for vague marketing language and scores specificity.
func AnalyzeCopy(visibleText string) model.CopyAnalysis {
	if strings.TrimSpace(visibleText) == "" {
		return model.CopyAnalysis{Score: 100, Label: "Sharp"}
	}

	lower := strings.ToLower(visibleText)

	// Detect vague phrases.
	var found []model.VaguePhrase
	for _, v := range vagueList {
		if strings.Contains(lower, v.phrase) {
			found = append(found, model.VaguePhrase{Phrase: v.phrase, Reason: v.reason})
		}
	}

	// Detect specificity signals.
	var hints []string
	for i, re := range reSpecificity {
		if re.MatchString(visibleText) {
			hints = append(hints, specificityLabels[i])
		}
	}

	// Score: start 100, -12 per vague phrase, +8 per specificity signal, clamp 0–100.
	score := 100 - (len(found) * 12) + (len(hints) * 8)
	if score < 0 { score = 0 }
	if score > 100 { score = 100 }

	label := "Sharp"
	if score < 80 { label = "Mixed" }
	if score < 50 { label = "Generic" }

	if found == nil { found = []model.VaguePhrase{} }
	if hints == nil { hints = []string{} }

	return model.CopyAnalysis{
		Score:            score,
		Label:            label,
		VaguePhrases:     found,
		SpecificityHints: hints,
	}
}

// scoreBar returns a CSS color class for the copy score.
func copyScoreColor(score int) string {
	if score >= 80 { return "bg-emerald-500" }
	if score >= 50 { return "bg-amber-500" }
	return fmt.Sprintf("bg-red-500") // keep fmt import used
}

// Ensure copyScoreColor is used (referenced by card).
var _ = copyScoreColor
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website/backend"
go test ./internal/parser/ -run TestAnalyzeCopy -v
```

Expected: all 3 PASS.

- [ ] **Step 5: Wire into `parser.go`**

Add after `contentStats := analyzeContent(visibleText)`:

```go
copyAnalysis := AnalyzeCopy(visibleText)
```

Add `CopyAnalysis: copyAnalysis` to the returned `AnalysisResult`.

- [ ] **Step 6: Confirm backend builds**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website/backend"
go build ./...
```

- [ ] **Step 7: Create `frontend/src/components/cards/VagueLanguageCard.tsx`**

```tsx
import type { CopyAnalysis } from "../../types/analysis";

function scoreColorClass(score: number) {
  return score >= 80 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-red-400";
}
function barColorClass(score: number) {
  return score >= 80 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-red-500";
}

export function VagueLanguageCard({ copyAnalysis }: { copyAnalysis: CopyAnalysis }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Vague Language Detector</p>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
          copyAnalysis.label === "Sharp"   ? "text-emerald-400 bg-emerald-950 border-emerald-800" :
          copyAnalysis.label === "Mixed"   ? "text-amber-400 bg-amber-950 border-amber-800" :
                                             "text-red-400 bg-red-950 border-red-800"
        }`}>{copyAnalysis.label}</span>
      </div>

      {/* Score bar */}
      <div className="flex items-center gap-3 mb-4">
        <span className={`text-3xl font-bold leading-none ${scoreColorClass(copyAnalysis.score)}`}>
          {copyAnalysis.score}
        </span>
        <div className="flex-1">
          <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${barColorClass(copyAnalysis.score)}`}
                 style={{ width: `${copyAnalysis.score}%` }} />
          </div>
          <p className="text-[10px] text-zinc-500 mt-1">Specificity score /100</p>
        </div>
      </div>

      {/* Vague phrases */}
      {copyAnalysis.vaguePhrases.length > 0 && (
        <div className="border-t border-zinc-800 pt-3">
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-2">Flagged phrases</p>
          <div className="flex flex-col gap-2">
            {copyAnalysis.vaguePhrases.slice(0, 5).map((v, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[10px] font-mono font-semibold text-amber-400 bg-amber-950/40 px-1.5 py-0.5 rounded shrink-0">
                  "{v.phrase}"
                </span>
                <span className="text-[11px] text-zinc-500 leading-relaxed">{v.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Specificity hints */}
      {copyAnalysis.specificityHints.length > 0 && (
        <div className="border-t border-zinc-800 pt-3 mt-2">
          <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-1.5">What's working</p>
          {copyAnalysis.specificityHints.map((h, i) => (
            <div key={i} className="flex items-center gap-2 py-0.5">
              <span className="text-emerald-500 text-xs">✓</span>
              <span className="text-[11px] text-zinc-400">{h}</span>
            </div>
          ))}
        </div>
      )}

      {copyAnalysis.vaguePhrases.length === 0 && (
        <p className="text-[11px] text-emerald-400/80 mt-1">No vague marketing language detected — copy is specific and clear.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 8: Commit**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website"
git add backend/internal/parser/copy.go backend/internal/parser/copy_test.go \
        backend/internal/parser/parser.go \
        frontend/src/components/cards/VagueLanguageCard.tsx
git commit -m "feat: add vague language detector (backend + card)"
```

---

## Task 6: Search Intent Alignment

**Files:**
- Create: `backend/internal/parser/intent_align.go`
- Create: `backend/internal/parser/intent_align_test.go`
- Modify: `backend/internal/parser/parser.go`

- [ ] **Step 1: Write the failing test**

Create `backend/internal/parser/intent_align_test.go`:

```go
package parser

import (
	"strings"
	"testing"

	"golang.org/x/net/html"
)

func TestCheckIntentAlignment_PricingMatch(t *testing.T) {
	rawHTML := `<html>
		<head>
			<title>Widget Pricing Plans</title>
			<meta name="description" content="Affordable pricing for every team">
		</head>
		<body><p>Plans start at $9/month. Free tier available.</p></body>
	</html>`
	doc, _ := html.Parse(strings.NewReader(rawHTML))
	result := CheckIntentAlignment(doc, rawHTML)
	var pricingCheck *IntentCheckForTest
	for i := range result.Checks {
		if strings.Contains(result.Checks[i].Claim, "pricing") || strings.Contains(result.Checks[i].Signal, "price") {
			pricingCheck = &result.Checks[i]
			break
		}
	}
	if pricingCheck != nil && !pricingCheck.Found {
		t.Error("expected pricing intent check to pass when page has price elements")
	}
}

func TestCheckIntentAlignment_EmptyPage(t *testing.T) {
	doc, _ := html.Parse(strings.NewReader("<html><head><title>Test</title></head><body></body></html>"))
	result := CheckIntentAlignment(doc, "<html><head><title>Test</title></head><body></body></html>")
	// No intent keywords in "Test" title — checks may be empty, that's fine.
	if result.Score < 0 || result.Score > 100 {
		t.Errorf("score out of range: %d", result.Score)
	}
}
```

Note: remove `IntentCheckForTest` — use `model.IntentCheck` directly:

```go
package parser

import (
	"strings"
	"testing"

	"golang.org/x/net/html"
)

func TestCheckIntentAlignment_PricingMatch(t *testing.T) {
	rawHTML := `<html><head>
		<title>Widget Pricing Plans</title>
		<meta name="description" content="Affordable pricing for every team">
	</head><body><p>Plans start at $9/month.</p></body></html>`
	doc, _ := html.Parse(strings.NewReader(rawHTML))
	result := CheckIntentAlignment(doc, rawHTML)

	var found *bool
	for _, c := range result.Checks {
		if strings.Contains(strings.ToLower(c.Signal), "price") {
			b := c.Found
			found = &b
			break
		}
	}
	if found != nil && !*found {
		t.Error("pricing check should pass when page has price elements")
	}
}

func TestCheckIntentAlignment_ScoreRange(t *testing.T) {
	doc, _ := html.Parse(strings.NewReader("<html><head><title>X</title></head><body></body></html>"))
	result := CheckIntentAlignment(doc, "")
	if result.Score < 0 || result.Score > 100 {
		t.Errorf("score out of range: %d", result.Score)
	}
}
```

- [ ] **Step 2: Run test — confirm it fails**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website/backend"
go test ./internal/parser/ -run TestCheckIntentAlignment -v 2>&1 | head -10
```

Expected: `undefined: CheckIntentAlignment`

- [ ] **Step 3: Create `backend/internal/parser/intent_align.go`**

```go
package parser

import (
	"regexp"
	"strings"

	"github.com/ahomsi/explain-website/internal/model"
	"golang.org/x/net/html"
)

type intentRule struct {
	keywords []string // trigger words in title/meta
	claim    string
	signal   string
	check    func(body, rawHTML string) bool
}

var rePrice    = regexp.MustCompile(`(?i)(\$[\d,]+|£[\d,]+|€[\d,]+|\d+\s*(USD|EUR|GBP)|per\s+month|\/month|\/year|per\s+year)`)
var reStars    = regexp.MustCompile(`(?i)(\d(\.\d)?\s*stars?|★|☆|\d\/5|\d\/10|out of \d|rated \d)`)
var reSteps    = regexp.MustCompile(`(?i)(step\s+\d|^\d+\.\s|\n\d+\.\s)`)

var intentRules = []intentRule{
	{
		keywords: []string{"pricing", "price", "plans", "cost"},
		claim:    "Title/meta mentions pricing",
		signal:   "Price elements in body ($, /month, per year)",
		check:    func(body, _ string) bool { return rePrice.MatchString(body) },
	},
	{
		keywords: []string{"best", "top", "vs", "versus", "compare", "comparison", "alternatives"},
		claim:    "Title/meta implies comparison",
		signal:   "Comparison table or competitor names in body",
		check: func(body, rawHTML string) bool {
			lower := strings.ToLower(rawHTML)
			return strings.Contains(lower, "<table") ||
				strings.Contains(lower, "vs.") ||
				strings.Contains(lower, " vs ") ||
				strings.Contains(lower, "compared to") ||
				strings.Contains(lower, "alternative")
		},
	},
	{
		keywords: []string{"review", "reviews", "rating", "rated"},
		claim:    "Title/meta promises reviews",
		signal:   "Star ratings or review text in body",
		check:    func(body, _ string) bool { return reStars.MatchString(body) },
	},
	{
		keywords: []string{"tutorial", "guide", "how to", "how-to", "step by step", "steps"},
		claim:    "Title/meta promises a guide/tutorial",
		signal:   "Numbered steps or ordered list in body",
		check: func(body, rawHTML string) bool {
			return reSteps.MatchString(body) || strings.Contains(strings.ToLower(rawHTML), "<ol")
		},
	},
	{
		keywords: []string{"free"},
		claim:    "Title/meta says 'free'",
		signal:   "'Free' appears prominently in body",
		check: func(body, _ string) bool {
			return strings.Contains(strings.ToLower(body), "free")
		},
	},
	{
		keywords: []string{"download", "get started", "sign up", "signup"},
		claim:    "Title/meta has a call-to-action",
		signal:   "CTA button or form present in page",
		check: func(_, rawHTML string) bool {
			lower := strings.ToLower(rawHTML)
			return strings.Contains(lower, "<form") || strings.Contains(lower, "<button")
		},
	},
}

// CheckIntentAlignment checks whether page content supports what the title/meta claim.
func CheckIntentAlignment(doc *html.Node, rawHTML string) model.IntentAlignment {
	title, metaDesc := extractTitleAndMeta(doc)
	combined := strings.ToLower(title + " " + metaDesc)
	visText := extractVisibleText(doc)

	var checks []model.IntentCheck
	for _, rule := range intentRules {
		triggered := false
		for _, kw := range rule.keywords {
			if strings.Contains(combined, kw) {
				triggered = true
				break
			}
		}
		if !triggered {
			continue
		}
		found := rule.check(visText, rawHTML)
		checks = append(checks, model.IntentCheck{
			Claim:  rule.claim,
			Signal: rule.signal,
			Found:  found,
		})
	}

	score := 100
	if len(checks) > 0 {
		pass := 0
		for _, c := range checks {
			if c.Found {
				pass++
			}
		}
		score = pass * 100 / len(checks)
	}

	if checks == nil {
		checks = []model.IntentCheck{}
	}
	return model.IntentAlignment{Score: score, Checks: checks}
}

// extractTitleAndMeta pulls the <title> and meta description from the parsed doc.
func extractTitleAndMeta(doc *html.Node) (title, metaDesc string) {
	var walk func(*html.Node)
	walk = func(n *html.Node) {
		if n.Type == html.ElementNode {
			switch strings.ToLower(n.Data) {
			case "title":
				if n.FirstChild != nil {
					title = strings.TrimSpace(n.FirstChild.Data)
				}
			case "meta":
				name := strings.ToLower(getAttr(n, "name"))
				if name == "description" {
					metaDesc = getAttr(n, "content")
				}
			}
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			walk(c)
		}
	}
	walk(doc)
	return
}
```

- [ ] **Step 4: Run tests — confirm they pass**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website/backend"
go test ./internal/parser/ -run TestCheckIntentAlignment -v
```

Expected: both PASS.

- [ ] **Step 5: Wire into `parser.go`**

Add after `imageAudit := auditImages(doc)`:

```go
intentAlignment := CheckIntentAlignment(doc, rawHTML)
```

Add `IntentAlignment: intentAlignment` to the returned `AnalysisResult`.

- [ ] **Step 6: Confirm backend builds**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website/backend"
go build ./...
```

- [ ] **Step 7: Create `frontend/src/components/cards/IntentAlignmentCard.tsx`**

```tsx
import type { IntentAlignment } from "../../types/analysis";

export function IntentAlignmentCard({ intentAlignment }: { intentAlignment: IntentAlignment }) {
  if (intentAlignment.checks.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
        <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-2">Search Intent Alignment</p>
        <p className="text-xs text-zinc-500">No intent keywords detected in title or meta description.</p>
      </div>
    );
  }

  const scoreColor = intentAlignment.score >= 80 ? "text-emerald-400"
    : intentAlignment.score >= 50 ? "text-amber-400" : "text-red-400";

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Search Intent Alignment</p>
        <span className={`text-lg font-bold ${scoreColor}`}>
          {intentAlignment.score}<span className="text-xs text-zinc-600 font-medium">/100</span>
        </span>
      </div>

      <div className="flex flex-col gap-0">
        {intentAlignment.checks.map((c, i) => (
          <div key={i} className="flex items-start gap-3 py-2.5 border-b border-zinc-800 last:border-b-0">
            <span className={`text-sm mt-0.5 shrink-0 ${c.found ? "text-emerald-400" : "text-red-400"}`}>
              {c.found ? "✓" : "✗"}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-zinc-300">{c.claim}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">{c.signal}</p>
            </div>
          </div>
        ))}
      </div>

      {intentAlignment.score < 60 && (
        <p className="mt-3 text-[11px] text-amber-500/80 border-t border-zinc-800 pt-3">
          Your title/meta promises content that isn't clearly present on the page. This can hurt rankings and increase bounce rate.
        </p>
      )}
    </div>
  );
}
```

- [ ] **Step 8: Commit**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website"
git add backend/internal/parser/intent_align.go backend/internal/parser/intent_align_test.go \
        backend/internal/parser/parser.go \
        frontend/src/components/cards/IntentAlignmentCard.tsx
git commit -m "feat: add search intent alignment (backend + card)"
```

---

## Task 7: Wire All Cards into the Dashboard

**Files:**
- Modify: `frontend/src/components/ResultDashboard/sections.tsx`
- Modify: `frontend/src/components/ResultDashboard/ResultDashboard.tsx`

- [ ] **Step 1: Add all 5 new card imports to `sections.tsx`**

Add after the existing imports:

```typescript
import { SecurityHeadersCard }  from "../cards/SecurityHeadersCard";
import { LinkCheckCard }        from "../cards/LinkCheckCard";
import { ColorPaletteCard }     from "../cards/ColorPaletteCard";
import { VagueLanguageCard }    from "../cards/VagueLanguageCard";
import { IntentAlignmentCard }  from "../cards/IntentAlignmentCard";
```

- [ ] **Step 2: Add cards to sections in `sections.tsx`**

In the `seo` case, add after `<SEOAuditCard ... />`:

```tsx
<IntentAlignmentCard intentAlignment={result.intentAlignment} />
<div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
  <SecurityHeadersCard checks={result.securityHeaders} />
  <LinkCheckCard linkCheck={result.linkCheck} />
</div>
```

In the `ux` case, add after `<ConversionCard ux={result.ux} />`:

```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
  <ColorPaletteCard colorPalette={result.colorPalette} />
  <VagueLanguageCard copyAnalysis={result.copyAnalysis} />
</div>
```

- [ ] **Step 3: Add 2 new tiles to the metrics strip in `ResultDashboard.tsx`**

Add a `securityScore` computation in `computeScores`:

```typescript
function computeScores(result: AnalysisResult) {
  const pass     = result.seoChecks.filter((c) => c.status === "pass").length;
  const seoScore = result.seoChecks.length ? Math.round((pass / result.seoChecks.length) * 100) : 0;
  const uxSigs   = [result.ux.hasCTA, result.ux.hasForms, result.ux.hasSocialProof,
                    result.ux.hasTrustSignals, result.ux.hasContactInfo, result.ux.mobileReady];
  const uxScore  = Math.round((uxSigs.filter(Boolean).length / uxSigs.length) * 100);
  const secPass  = result.securityHeaders?.filter(h => h.status === "pass").length ?? 0;
  const secTotal = result.securityHeaders?.length ?? 0;
  return { seoScore, uxScore, secPass, secTotal };
}
```

Update the destructure in the component:

```typescript
const { seoScore, uxScore, secPass, secTotal } = computeScores(result);
```

Add two new tiles in the metrics strip, after the Freshness tile:

```tsx
{secTotal > 0 && (
  <MetricTile label="Security"   value={secPass} suffix={`/${secTotal}`} valueClass={scoreColor(Math.round(secPass/secTotal*100))} />
)}
{result.linkCheck?.broken > 0 && (
  <MetricTile label="Broken Links" value={result.linkCheck.broken} valueClass="text-red-400" />
)}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website/frontend"
npx tsc -b --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website"
git add frontend/src/components/ResultDashboard/sections.tsx \
        frontend/src/components/ResultDashboard/ResultDashboard.tsx
git commit -m "feat: wire 5 new cards into dashboard sections and metrics strip"
```

---

## Task 8: Dark / Light Mode Toggle

**Files:**
- Create: `frontend/src/context/ThemeContext.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/components/ResultDashboard/ResultDashboard.tsx`

- [ ] **Step 1: Create `frontend/src/context/ThemeContext.tsx`**

```tsx
import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "dark",
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem("theme") as Theme) ?? "dark"
  );

  useEffect(() => {
    const html = document.documentElement;
    if (theme === "light") {
      html.classList.add("light");
    } else {
      html.classList.remove("light");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
```

- [ ] **Step 2: Wrap the app with `ThemeProvider` in `frontend/src/App.tsx`**

Add the import at the top:

```typescript
import { ThemeProvider } from "./context/ThemeContext";
```

Wrap the existing JSX return in `App`:

```tsx
return (
  <ThemeProvider>
    {/* existing content */}
  </ThemeProvider>
);
```

- [ ] **Step 3: Add the toggle button to the header in `ResultDashboard.tsx`**

Add the import:

```typescript
import { useTheme } from "../../context/ThemeContext";
```

Inside `ResultDashboard`, destructure:

```typescript
const { theme, toggle } = useTheme();
```

Add the toggle button just before the `<CopyButton>` in the header actions div:

```tsx
<button
  onClick={toggle}
  aria-label="Toggle theme"
  className="flex items-center justify-center w-7 h-7 rounded-md text-zinc-400 hover:text-zinc-200 bg-zinc-800/50 hover:bg-zinc-800 border border-zinc-700 transition-colors"
>
  {theme === "dark" ? (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  ) : (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  )}
</button>
```

- [ ] **Step 4: Add light mode CSS overrides to `frontend/src/index.css`**

Append at the end of the file:

```css
/* ── Light mode overrides ──────────────────────────────────────────── */
html.light body { background-color: #f8fafc; color: #0f172a; }

html.light .bg-zinc-950   { background-color: #f8fafc !important; }
html.light .bg-zinc-900   { background-color: #f1f5f9 !important; }
html.light .bg-zinc-800   { background-color: #e2e8f0 !important; }
html.light .bg-zinc-950\/95 { background-color: rgba(248,250,252,0.97) !important; }
html.light .bg-zinc-900\/30 { background-color: rgba(241,245,249,0.6) !important; }

html.light .border-zinc-800 { border-color: #cbd5e1 !important; }
html.light .border-zinc-700 { border-color: #94a3b8 !important; }

html.light .text-zinc-100 { color: #0f172a !important; }
html.light .text-zinc-200 { color: #1e293b !important; }
html.light .text-zinc-300 { color: #334155 !important; }
html.light .text-zinc-400 { color: #475569 !important; }
html.light .text-zinc-500 { color: #64748b !important; }
html.light .text-zinc-600 { color: #475569 !important; }

html.light .bg-zinc-950.rounded-lg,
html.light .bg-zinc-900.rounded-lg { box-shadow: 0 1px 3px rgba(0,0,0,0.08); }

/* Sidebar and mobile nav */
html.light .bg-zinc-900\/50 { background-color: rgba(241,245,249,0.8) !important; }
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website/frontend"
npx tsc -b --noEmit
```

Expected: no errors.

- [ ] **Step 6: Manually verify toggle works**

Start the frontend dev server:
```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website/frontend"
npm run dev
```

Open `http://localhost:5173`. Click the sun/moon icon in the top bar. Confirm:
- Dashboard switches between dark (zinc-950 background) and light (slate-50 background)
- Preference persists after page refresh
- All cards remain readable in both modes

- [ ] **Step 7: Commit**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website"
git add frontend/src/context/ThemeContext.tsx \
        frontend/src/App.tsx \
        frontend/src/index.css \
        frontend/src/components/ResultDashboard/ResultDashboard.tsx
git commit -m "feat: add dark/light mode toggle with localStorage persistence"
```

---

## Task 9: Push to Production

- [ ] **Step 1: Run final TypeScript check**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website/frontend"
npx tsc -b --noEmit
```

Expected: no errors.

- [ ] **Step 2: Run all Go tests**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website/backend"
go test ./... -v 2>&1 | tail -30
```

Expected: all tests PASS.

- [ ] **Step 3: Push**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website"
git push origin main
```
