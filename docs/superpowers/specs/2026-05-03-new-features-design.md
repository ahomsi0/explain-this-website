# Design: New Features — May 2026

## Overview

Six new features to add to the Explain This Website dashboard:

1. Security Headers Audit
2. Broken Link Checker
3. Color Palette Extractor
4. Vague Language Detector
5. Search Intent Alignment
6. Dark / Light Mode Toggle

Dark/Light mode is a frontend-only change. The other five require both backend analysis and new frontend cards.

---

## 1. Security Headers Audit

**What:** Check 6 HTTP response headers that protect visitors from common web attacks.

**Backend (`backend/internal/parser/security.go` — new file):**
- The main fetcher in `handler/analyze.go` already reads the HTTP response. We need to pass response headers through to the parser.
- Modify `handler/analyze.go` to capture `resp.Header` and pass it to `Parse()` (or a new `AuditSecurityHeaders(headers http.Header)` function).
- Headers to check:
  - `Strict-Transport-Security` → pass if present
  - `Content-Security-Policy` → pass if present (warn if only `default-src 'self'`)
  - `X-Frame-Options` → pass if `DENY` or `SAMEORIGIN`
  - `X-Content-Type-Options` → pass if `nosniff`
  - `Referrer-Policy` → pass if present and not `unsafe-url`
  - `Permissions-Policy` → pass if present
- Returns `[]SecurityHeaderCheck` — same shape as `SEOCheck` (id, label, status, detail).

**Model (`model.go`):**
```go
type SecurityHeaderCheck struct {
    ID     string `json:"id"`
    Label  string `json:"label"`
    Status string `json:"status"` // "pass" | "warning" | "fail"
    Detail string `json:"detail"`
}
```
Add `SecurityHeaders []SecurityHeaderCheck json:"securityHeaders"` to `AnalysisResult`.

**Frontend:**
- New `SecurityHeadersCard.tsx` — mirrors `SeoAuditCard` layout (pass/fail list with badges).
- Add to **SEO section** in `sections.tsx` (security is closely related to SEO/trust).
- Add `securityHeaders: SecurityHeaderCheck[]` to `AnalysisResult` in `analysis.ts`.

---

## 2. Broken Link Checker

**What:** HEAD-check up to 30 external links on the page, report 404s and redirect chains.

**Backend (`backend/internal/parser/links.go` — new file):**
- Extract all `<a href>` external links from the parsed HTML (reuse logic from `computePageStats`).
- Deduplicate, cap at 30 links to keep latency reasonable.
- For each link: `HEAD` request with 6s timeout, follow up to 3 redirects, capture final status code.
- Run all checks concurrently with a semaphore (max 10 parallel requests).
- Return `LinkCheckResult` with summary counts and per-link status.

**Model:**
```go
type LinkCheckItem struct {
    URL        string `json:"url"`
    Status     int    `json:"status"`     // HTTP status code, 0 = unreachable
    FinalURL   string `json:"finalUrl"`   // after redirects
    IsRedirect bool   `json:"isRedirect"`
    IsBroken   bool   `json:"isBroken"`
}

type LinkCheckResult struct {
    Checked   int             `json:"checked"`
    OK        int             `json:"ok"`
    Broken    int             `json:"broken"`
    Redirects int             `json:"redirects"`
    Items     []LinkCheckItem `json:"items"`
}
```
Add `LinkCheck LinkCheckResult json:"linkCheck"` to `AnalysisResult`.

**Latency:** Run concurrently in the `Parse()` goroutine group alongside PageSpeed. Adds ~3-6s to total time (already absorbed by PageSpeed wait).

**Frontend:**
- New `LinkCheckCard.tsx` — summary stat row (OK / Broken / Redirects) + list of broken/redirect items.
- Add to **SEO section**.
- Add types to `analysis.ts`.

---

## 3. Color Palette Extractor

**What:** Extract the top brand colors from CSS, inline styles, and SVG attributes.

**Backend (`backend/internal/parser/colors.go` — new file):**
- Parse raw HTML/CSS for color values using regexes:
  - Hex: `#([0-9a-fA-F]{3,8})\b`
  - RGB/RGBA: `rgb\((\d+),\s*(\d+),\s*(\d+)`
  - Named CSS variables referenced in `:root` blocks
- Normalize all to hex, deduplicate, count frequency.
- Filter out near-black (#000, #111, #1a1a1a etc.), near-white (#fff, #fafafa etc.), and fully transparent.
- Return top 8 colors ranked by frequency.
- Also extract `<meta name="theme-color">` as the declared primary color.

**Model:**
```go
type ColorEntry struct {
    Hex       string `json:"hex"`
    Frequency int    `json:"frequency"`
}

type ColorPalette struct {
    ThemeColor string       `json:"themeColor"` // from meta tag, may be empty
    Colors     []ColorEntry `json:"colors"`     // top 8, ranked by frequency
}
```
Add `ColorPalette ColorPalette json:"colorPalette"` to `AnalysisResult`.

**Frontend:**
- New `ColorPaletteCard.tsx` — grid of color swatches with hex labels + frequency bar. Copy hex on click.
- Add to **UX section**.

---

## 4. Vague Language Detector

**What:** Scan page copy for overused, non-specific marketing phrases and score specificity.

**Backend (`backend/internal/parser/copy.go` — new file):**
- Maintain a list of ~40 vague phrases: "best-in-class", "innovative", "seamless", "world-class", "cutting-edge", "robust", "comprehensive", "leverage", "synergy", "next-generation", "game-changing", "transformative", "holistic", "turnkey", "scalable solutions", etc.
- Scan `visibleText` for matches (case-insensitive).
- Specificity signals (positive): numbers/percentages, named competitors, named features, concrete timeframes.
- Score: `max(0, 100 - (vagueCount * 15) + (specificitySignals * 10))`, capped 0–100.
- Return matched phrases + score + label (Sharp / Mixed / Generic).

**Model:**
```go
type VaguePhrase struct {
    Phrase string `json:"phrase"`
    Reason string `json:"reason"`
}

type CopyAnalysis struct {
    Score        int          `json:"score"`
    Label        string       `json:"label"` // "Sharp" | "Mixed" | "Generic"
    VaguePhrases []VaguePhrase `json:"vaguePhrases"`
    SpecificityHints []string `json:"specificityHints"` // what's working well
}
```
Add `CopyAnalysis CopyAnalysis json:"copyAnalysis"` to `AnalysisResult`.

**Frontend:**
- New `VagueLanguageCard.tsx` — score gauge + list of flagged phrases with explanations.
- Add to **UX section** (alongside content quality cards).

---

## 5. Search Intent Alignment

**What:** Check whether the page content actually backs up what the title/meta claim.

**Backend (`backend/internal/parser/intent_align.go` — new file):**
- Define intent signals — keyword → content evidence mapping:
  - "best" / "top" / "vs" → requires comparison table or competitor names in body
  - "pricing" / "price" / "cost" → requires price elements (`$`, currency symbols, or "per month" etc.)
  - "review" / "reviews" → requires star ratings, rating numbers, or review text patterns
  - "tutorial" / "guide" / "how to" → requires numbered lists or `<ol>` elements
  - "free" → check body actually contains "free" prominently
- Extract keywords from title + meta description, run checks, return matches/mismatches.

**Model:**
```go
type IntentCheck struct {
    Claim   string `json:"claim"`   // e.g. "Title says 'pricing'"
    Signal  string `json:"signal"`  // e.g. "Price elements on page"
    Found   bool   `json:"found"`
}

type IntentAlignment struct {
    Score  int           `json:"score"` // % of checks that passed
    Checks []IntentCheck `json:"checks"`
}
```
Add `IntentAlignment IntentAlignment json:"intentAlignment"` to `AnalysisResult`.

**Frontend:**
- New `IntentAlignmentCard.tsx` — list of claim → evidence checks with ✓/✗ badges.
- Add to **SEO section**.

---

## 6. Dark / Light Mode Toggle

**What:** Theme toggle in the top bar; persists to `localStorage`.

**Frontend only:**
- Add `ThemeProvider` context in `App.tsx` — reads/writes `localStorage.getItem("theme")`, defaults to `"dark"`.
- Apply `class="dark"` or `class="light"` to the root `<div>` in `ResultDashboard` and the landing page wrapper.
- Extend Tailwind config to use `darkMode: "class"`.
- Add light-mode color overrides for: `bg-zinc-950` → `bg-white`, `bg-zinc-900` → `bg-zinc-50`, `border-zinc-800` → `border-zinc-200`, `text-zinc-100` → `text-zinc-900`, `text-zinc-500` → `text-zinc-500` (same).
- Toggle button: sun/moon icon in the top header bar (between ShareButton and New Analysis).

---

## Section Placement Summary

| Feature | Section |
|---|---|
| Security Headers | SEO Audit |
| Broken Link Checker | SEO Audit |
| Color Palette | UX Review |
| Vague Language Detector | UX Review |
| Search Intent Alignment | SEO Audit |
| Dark/Light Toggle | Top bar (always visible) |

---

## New Metrics Strip Tiles

- **Broken Links** count (red if > 0)
- **Security Score** /6 headers passing (color-coded)

---

## Out of Scope

- Broken link checker does not check internal links (too many, same-origin HEAD requests would be same as fetching).
- Color palette does not classify "primary vs secondary" automatically — just ranks by frequency.
- No AI API calls for any of these features — all heuristic/regex-based.
