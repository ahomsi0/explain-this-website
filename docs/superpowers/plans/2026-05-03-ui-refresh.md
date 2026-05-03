# UI Refresh + Font Audit + Domain Info Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle all dashboard cards with a consistent violet-accent header band, fix light mode with a violet-tinted palette, expand the grid to 3 columns on wide screens, and add Font Audit + Domain Info features.

**Architecture:** New `CardShell` / `CardHeader` shared components + CSS classes drive card styling globally. Light mode replaces the existing `!important` override block with a comprehensive violet-50 palette. Two new backend parsers (`fonts.go` via HTML parsing, `domain.go` via RDAP API) run concurrently in `parser.go`. Each adds a new field to `AnalysisResult` and a new frontend card.

**Tech Stack:** React 18 + TypeScript + Tailwind CSS (frontend); Go stdlib + `golang.org/x/net/html` (backend); RDAP API at `rdap.org` (no key required).

---

## File Map

**Create:**
- `frontend/src/components/ui/CardShell.tsx` — wrapper div with left violet border + gradient bg
- `frontend/src/components/ui/CardHeader.tsx` — title dot + label + optional badge
- `frontend/src/components/cards/FontAuditCard.tsx` — font families, weights, perf warning
- `frontend/src/components/cards/DomainInfoCard.tsx` — domain age, registrar, dates
- `backend/internal/parser/fonts.go` — HTML-only font extraction
- `backend/internal/parser/fonts_test.go`
- `backend/internal/parser/domain.go` — RDAP concurrent fetch
- `backend/internal/parser/domain_test.go`

**Modify:**
- `frontend/src/index.css` — add `.card-shell`, `.card-header`, replace light mode block
- `frontend/src/components/cards/*.tsx` — all 22 card files (add CardShell/CardHeader)
- `frontend/src/components/ResultDashboard/sections.tsx` — 3-col grid + new cards
- `frontend/src/components/ResultDashboard/ResultDashboard.tsx` — wider max-w
- `frontend/src/types/analysis.ts` — FontAudit + DomainInfo interfaces + AnalysisResult fields
- `frontend/src/mock/mockData.ts` — add fontAudit + domainInfo mock values
- `backend/internal/model/model.go` — FontEntry, FontAudit, DomainInfo structs + AnalysisResult fields
- `backend/internal/parser/parser.go` — wire domain goroutine + new result fields

---

## Task 1: CSS Infrastructure — card styles + full light mode overhaul

**Files:**
- Modify: `frontend/src/index.css`

- [ ] **Step 1: Replace the entire light mode block and add card classes**

Open `frontend/src/index.css`. Remove everything from the line `/* ── Light mode overrides` to the end of the file. Replace with:

```css
/* ── Card shell styles ──────────────────────────────────────────────── */
.card-shell {
  background: linear-gradient(135deg, #18181b 0%, #1c1917 100%);
}

.card-header {
  background: rgba(124, 58, 237, 0.06);
}

/* ── Light mode — violet-tinted palette ─────────────────────────────── */
html.light body {
  background-color: #f5f3ff;
  color: #1e1b4b;
}

/* Page and card backgrounds */
html.light .bg-zinc-950   { background-color: #f5f3ff !important; }
html.light .bg-zinc-900   { background-color: #ffffff !important; }
html.light .bg-zinc-800   { background-color: #ede9fe !important; }
html.light .bg-zinc-950\/95 { background-color: rgba(245,243,255,0.97) !important; }
html.light .bg-zinc-900\/30 { background-color: rgba(250,245,255,0.6) !important; }
html.light .bg-zinc-900\/50 { background-color: rgba(250,245,255,0.8) !important; }
html.light .bg-zinc-800\/50 { background-color: rgba(237,233,254,0.6) !important; }

/* Borders */
html.light .border-zinc-800 { border-color: #ddd6fe !important; }
html.light .border-zinc-700 { border-color: #c4b5fd !important; }

/* Text */
html.light .text-zinc-100 { color: #1e1b4b !important; }
html.light .text-zinc-200 { color: #312e81 !important; }
html.light .text-zinc-300 { color: #4338ca !important; }
html.light .text-zinc-400 { color: #4b5563 !important; }
html.light .text-zinc-500 { color: #6b7280 !important; }
html.light .text-zinc-600 { color: #9ca3af !important; }

/* Violet accent text — darken for readability on white */
html.light .text-violet-400 { color: #6d28d9 !important; }
html.light .text-violet-300 { color: #7c3aed !important; }

/* Status badge backgrounds — flip dark→light */
html.light .bg-emerald-950 { background-color: #f0fdf4 !important; }
html.light .bg-red-950     { background-color: #fef2f2 !important; }
html.light .bg-amber-950   { background-color: #fffbeb !important; }
html.light .bg-blue-950    { background-color: #eff6ff !important; }
html.light .bg-violet-950  { background-color: #f5f3ff !important; }
html.light .bg-zinc-800.rounded { background-color: #ede9fe !important; }

/* Status badge borders */
html.light .border-emerald-800 { border-color: #86efac !important; }
html.light .border-emerald-900 { border-color: #86efac !important; }
html.light .border-red-800     { border-color: #fca5a5 !important; }
html.light .border-amber-800   { border-color: #fcd34d !important; }
html.light .border-amber-900   { border-color: #fcd34d !important; }
html.light .border-blue-800    { border-color: #93c5fd !important; }
html.light .border-violet-800  { border-color: #c4b5fd !important; }

/* Status text colors */
html.light .text-emerald-400 { color: #16a34a !important; }
html.light .text-red-400     { color: #dc2626 !important; }
html.light .text-amber-400   { color: #d97706 !important; }
html.light .text-blue-400    { color: #2563eb !important; }

/* Card shell + header in light mode */
html.light .card-shell {
  background: #ffffff;
  border-left-color: #7c3aed;
  border-color: #ddd6fe;
  box-shadow: 0 1px 4px rgba(124,58,237,0.06);
}
html.light .card-header {
  background: #faf5ff;
  border-bottom-color: #ede9fe;
}

/* Sidebar active state */
html.light .bg-violet-500\/10  { background-color: rgba(124,58,237,0.08) !important; }
html.light .border-violet-500\/30 { border-color: rgba(124,58,237,0.25) !important; }

/* Header bar backdrop */
html.light .bg-zinc-950.rounded-lg,
html.light .bg-zinc-900.rounded-lg { box-shadow: 0 1px 4px rgba(124,58,237,0.06); }
```

- [ ] **Step 2: Verify CSS is valid (no build step needed — check for typos)**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website/frontend"
npx tsc -b --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website"
git add frontend/src/index.css
git commit -m "feat: add card-shell/card-header CSS + comprehensive violet light mode"
```

---

## Task 2: CardShell + CardHeader Components

**Files:**
- Create: `frontend/src/components/ui/CardShell.tsx`
- Create: `frontend/src/components/ui/CardHeader.tsx`

- [ ] **Step 1: Create `CardShell.tsx`**

```tsx
// frontend/src/components/ui/CardShell.tsx
export function CardShell({ children, className = "" }: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`card-shell rounded-lg overflow-hidden border border-zinc-800 border-l-[2px] border-l-violet-700 ${className}`}>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Create `CardHeader.tsx`**

```tsx
// frontend/src/components/ui/CardHeader.tsx
type BadgeColor = "violet" | "green" | "amber" | "red";

const BADGE_CLASSES: Record<BadgeColor, string> = {
  violet: "text-violet-300 bg-violet-500/10 border border-violet-500/25",
  green:  "text-emerald-400 bg-emerald-500/10 border border-emerald-500/25",
  amber:  "text-amber-400 bg-amber-500/10 border border-amber-500/25",
  red:    "text-red-400 bg-red-500/10 border border-red-500/25",
};

export function CardHeader({ title, badge, badgeColor = "violet" }: {
  title: string;
  badge?: string | number;
  badgeColor?: BadgeColor;
}) {
  return (
    <div className="card-header flex items-center gap-2 px-4 py-2.5 border-b border-zinc-800/60">
      <div className="w-[5px] h-[5px] rounded-full bg-violet-600 shrink-0 opacity-70" />
      <span className="text-[10px] font-bold text-violet-300 uppercase tracking-wider flex-1 leading-none">
        {title}
      </span>
      {badge !== undefined && (
        <span className={`text-[10px] font-bold rounded px-1.5 py-px leading-none ${BADGE_CLASSES[badgeColor]}`}>
          {badge}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 3: TypeScript check**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website/frontend"
npx tsc -b --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website"
git add frontend/src/components/ui/CardShell.tsx frontend/src/components/ui/CardHeader.tsx
git commit -m "feat: add CardShell and CardHeader shared UI components"
```

---

## Task 3: Restyle All 22 Cards

**Files:** All files in `frontend/src/components/cards/`

**The pattern:** Every card has an outer `<div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">` followed by a `<p className="text-xs font-semibold text-violet-400 uppercase tracking-wider ...">TITLE</p>`. Replace the outer div + title paragraph with `<CardShell><CardHeader .../><div className="p-4">` and close with `</div></CardShell>`.

Add these two imports to each file:
```tsx
import { CardShell } from "../ui/CardShell";
import { CardHeader } from "../ui/CardHeader";
```

**Badge reference table** — use these exact expressions for each card's `badge` and `badgeColor` props:

| Card file | title | badge expression | badgeColor expression |
|---|---|---|---|
| `ActionableOpportunitiesCard` | `"Top Issues"` | `issues.length` | `issues.length > 0 ? "amber" : "green"` |
| `ColorPaletteCard` | `"Color Palette"` | `colorPalette.colors.length + " colors"` | `"violet"` |
| `ContentCard` | `"Content Analysis"` | `contentStats.readingLevel` | `contentStats.readingLevel === "simple" ? "green" : contentStats.readingLevel === "moderate" ? "amber" : "red"` |
| `ConversionCard` | `"UX Signals"` | *(omit badge)* | — |
| `ConversionScoreCard` | `"Conversion Score"` | `scores.overall + "/100"` | `scores.overall >= 70 ? "green" : scores.overall >= 45 ? "amber" : "red"` |
| `CustomerViewCard` | `"Customer View"` | `customerView.trustLevel` | `customerView.trustLevel === "strong" ? "green" : customerView.trustLevel === "moderate" ? "amber" : "red"` |
| `ELI5Card` | `"Plain English"` | `items.length + " terms"` | `"violet"` |
| `ImageAuditCard` | `"Image Formats"` | `audit.total + " imgs"` | `"violet"` |
| `InsightCard` | `"Site Intent"` | *(omit badge)* | — |
| `IntentAlignmentCard` | `"Search Intent Alignment"` | `intentAlignment.score + "/100"` | `intentAlignment.score >= 80 ? "green" : intentAlignment.score >= 50 ? "amber" : "red"` |
| `LinkCheckCard` | `"Link Health"` | `linkCheck.checked === 0 ? undefined : linkCheck.broken === 0 ? "All OK" : linkCheck.broken + " broken"` | `linkCheck.broken === 0 ? "green" : linkCheck.broken <= 2 ? "amber" : "red"` |
| `OverviewCard` | `"Overview"` | `overview.pageLoadHint` | `overview.pageLoadHint === "lightweight" ? "green" : overview.pageLoadHint === "medium" ? "amber" : "red"` |
| `PageStatsCard` | `"Page Stats"` | *(omit badge)* | — |
| `PagePerfCard` (2nd export in `PageStatsCard.tsx`) | `"Load Efficiency"` | *(omit badge)* | — |
| `PerformanceCard` | `"Core Web Vitals"` | `performance.mobile?.lighthouse?.performance !== undefined ? performance.mobile.lighthouse.performance + "/100" : undefined` | `(performance.mobile?.lighthouse?.performance ?? 0) >= 90 ? "green" : (performance.mobile?.lighthouse?.performance ?? 0) >= 50 ? "amber" : "red"` |
| `PrioritizedIssuesCard` | `"Prioritized Issues"` | `issues.length` | `"amber"` |
| `RecommendationsCard` | `"Recommendations"` | `recommendations.length` | `"violet"` |
| `SecurityHeadersCard` | `"Security Headers"` | *(compute pass count)* `checks.filter(c => c.status === "pass").length + "/" + checks.length` | `checks.filter(c=>c.status==="pass").length >= Math.ceil(checks.length*0.8) ? "green" : checks.filter(c=>c.status==="pass").length >= Math.ceil(checks.length*0.5) ? "amber" : "red"` |
| `SeoAuditCard` | `"SEO Audit"` | *(compute pass count in component scope)* `seoChecks.filter(c => c.status === "pass").length + "/" + seoChecks.length` | `(pass/total >= 0.8) ? "green" : (pass/total >= 0.5) ? "amber" : "red"` |
| `SiteFreshnessCard` | `"Site Freshness"` | `freshness.rating` | `freshness.rating === "fresh" ? "green" : freshness.rating === "aging" ? "amber" : freshness.rating === "stale" ? "red" : "violet"` |
| `TechStackCard` | `"Tech Stack"` | `techStack.length + " found"` | `"violet"` |
| `VagueLanguageCard` | `"Vague Language"` | `copyAnalysis.label` | `copyAnalysis.label === "Sharp" ? "green" : copyAnalysis.label === "Mixed" ? "amber" : "red"` |
| `WeakPointsCard` | `"Weak Points"` | `weakPoints.length` | `weakPoints.length === 0 ? "green" : "amber"` |

**Important notes:**
- `SeoAuditCard` and `SecurityHeadersCard` already compute pass counts internally — extract those computations to a variable at the top of the component function, then use that variable in `<CardHeader badge={...} />`.
- Cards that previously had their own inline header (e.g. `WeakPointsCard` had `<div className="flex items-center justify-between mb-3">`) — remove that entire old header div, it's replaced by `<CardHeader>`.
- `PagePerfCard` already has a flex header row with a score badge internally — replace only the outer wrapper div and the first `<p>` title tag. Keep its internal score display intact.
- `LinkCheckCard` has a zero-state early return that renders a different wrapper — apply `CardShell`/`CardHeader` to both the zero-state return AND the main return.
- `PerformanceCard` has tabs (`mobile`/`desktop`) and internal section headers — only replace the outermost wrapper div and top title.

**Concrete example** (WeakPointsCard — before and after):

```tsx
// BEFORE
export function WeakPointsCard({ weakPoints }: { weakPoints: string[] }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider">Weak Points</p>
        {weakPoints.length > 0 && (
          <span className="text-[11px] text-zinc-600">{weakPoints.length} issue...</span>
        )}
      </div>
      {/* rest of content */}
    </div>
  );
}

// AFTER
import { CardShell } from "../ui/CardShell";
import { CardHeader } from "../ui/CardHeader";

export function WeakPointsCard({ weakPoints }: { weakPoints: string[] }) {
  return (
    <CardShell>
      <CardHeader
        title="Weak Points"
        badge={weakPoints.length}
        badgeColor={weakPoints.length === 0 ? "green" : "amber"}
      />
      <div className="p-4">
        {/* rest of content — unchanged */}
      </div>
    </CardShell>
  );
}
```

- [ ] **Step 1: Update all 22 card files following the table above**

Apply the pattern to all files listed in the table. Use the badge expressions exactly as written. For computed badge values (SEOAuditCard, SecurityHeadersCard) declare a `const pass = ...` at the top of the component function.

- [ ] **Step 2: TypeScript check**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website/frontend"
npx tsc -b --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website"
git add frontend/src/components/cards/
git commit -m "feat: restyle all cards with CardShell/CardHeader — left border + header band"
```

---

## Task 4: 3-Column Grid + Wider Max-Width

**Files:**
- Modify: `frontend/src/components/ResultDashboard/sections.tsx`
- Modify: `frontend/src/components/ResultDashboard/ResultDashboard.tsx`

- [ ] **Step 1: Update all grid layouts in `sections.tsx`**

Replace every `"grid grid-cols-1 lg:grid-cols-2 gap-3"` with `"grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-3"`.

There are 5 occurrences. Use find-and-replace.

- [ ] **Step 2: Widen the content wrapper in `ResultDashboard.tsx`**

Find line:
```tsx
<div className="px-4 sm:px-6 lg:px-8 py-5 sm:py-6 max-w-[1400px]">
```

Replace with:
```tsx
<div className="px-4 sm:px-6 lg:px-8 py-5 sm:py-6 max-w-[1800px]">
```

- [ ] **Step 3: TypeScript check**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website/frontend"
npx tsc -b --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website"
git add frontend/src/components/ResultDashboard/sections.tsx \
        frontend/src/components/ResultDashboard/ResultDashboard.tsx
git commit -m "feat: expand to 3-col grid on 2xl screens, widen content max-w to 1800px"
```

---

## Task 5: Font Audit — Backend

**Files:**
- Modify: `backend/internal/model/model.go`
- Create: `backend/internal/parser/fonts.go`
- Create: `backend/internal/parser/fonts_test.go`
- Modify: `backend/internal/parser/parser.go`

- [ ] **Step 1: Add structs to `model.go`**

Add after the `IntentAlignment` struct (before `AnalysisResult`):

```go
// FontEntry describes one detected font family.
type FontEntry struct {
	Family  string   `json:"family"`
	Source  string   `json:"source"`  // "Google Fonts" | "Bunny Fonts" | "Adobe Fonts" | "Custom/Self-hosted"
	Weights []string `json:"weights"` // e.g. ["400","500","700"], empty if unknown
}

// FontAudit summarises web font usage detected from HTML.
type FontAudit struct {
	Families      []FontEntry `json:"families"`
	TotalFamilies int         `json:"totalFamilies"`
	TotalWeights  int         `json:"totalWeights"`
	HasPerfIssue  bool        `json:"hasPerfIssue"` // true if >3 families or >6 total weight variants
}
```

Add to `AnalysisResult` struct (after `IntentAlignment`):
```go
FontAudit    FontAudit    `json:"fontAudit"`
```

- [ ] **Step 2: Write the failing tests in `fonts_test.go`**

```go
package parser

import (
	"strings"
	"testing"

	"golang.org/x/net/html"
)

func TestExtractFontAudit_GoogleFonts(t *testing.T) {
	rawHTML := `<html><head>
		<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap">
	</head></html>`
	doc, _ := html.Parse(strings.NewReader(rawHTML))
	result := ExtractFontAudit(doc, rawHTML)
	if result.TotalFamilies != 1 {
		t.Fatalf("expected 1 family, got %d", result.TotalFamilies)
	}
	if result.Families[0].Family != "Inter" {
		t.Errorf("expected Inter, got %q", result.Families[0].Family)
	}
	if result.Families[0].Source != "Google Fonts" {
		t.Errorf("expected Google Fonts, got %q", result.Families[0].Source)
	}
	if len(result.Families[0].Weights) != 3 {
		t.Errorf("expected 3 weights, got %d", len(result.Families[0].Weights))
	}
}

func TestExtractFontAudit_MultipleFamilies_PerfIssue(t *testing.T) {
	rawHTML := `<html><head>
		<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400&family=Roboto:wght@400&family=Open+Sans:wght@400&family=Lato:wght@400">
	</head></html>`
	doc, _ := html.Parse(strings.NewReader(rawHTML))
	result := ExtractFontAudit(doc, rawHTML)
	if result.TotalFamilies != 4 {
		t.Fatalf("expected 4 families, got %d", result.TotalFamilies)
	}
	if !result.HasPerfIssue {
		t.Error("expected HasPerfIssue=true for 4 families")
	}
}

func TestExtractFontAudit_NoFonts(t *testing.T) {
	rawHTML := `<html><head><title>Plain</title></head><body>Hello</body></html>`
	doc, _ := html.Parse(strings.NewReader(rawHTML))
	result := ExtractFontAudit(doc, rawHTML)
	if result.TotalFamilies != 0 {
		t.Errorf("expected 0 families, got %d", result.TotalFamilies)
	}
	if result.HasPerfIssue {
		t.Error("expected HasPerfIssue=false for no fonts")
	}
}
```

- [ ] **Step 3: Run tests — confirm they fail**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website/backend"
go test ./internal/parser/ -run TestExtractFontAudit -v
```

Expected: FAIL with "undefined: ExtractFontAudit"

- [ ] **Step 4: Implement `fonts.go`**

```go
package parser

import (
	"net/url"
	"regexp"
	"strings"

	"github.com/ahomsi/explain-website/internal/model"
	"golang.org/x/net/html"
)

var reFontFace = regexp.MustCompile(`(?i)@font-face\s*\{[^}]*font-family\s*:\s*['"]?([^'";}\n]+)['"]?`)
var reFontWeight = regexp.MustCompile(`(?i)font-weight\s*:\s*([0-9]+)`)

// ExtractFontAudit detects web fonts used on the page from link tags and inline CSS.
func ExtractFontAudit(doc *html.Node, rawHTML string) model.FontAudit {
	var entries []model.FontEntry

	// Walk the HTML tree for <link> tags.
	var walk func(*html.Node)
	walk = func(n *html.Node) {
		if n.Type == html.ElementNode && n.Data == "link" {
			href := getAttr(n, "href")
			rel := strings.ToLower(getAttr(n, "rel"))
			if rel != "stylesheet" && rel != "preload" {
				goto children
			}
			if strings.Contains(href, "fonts.googleapis.com") {
				entries = append(entries, parseGoogleFontsURL(href, "Google Fonts")...)
			} else if strings.Contains(href, "fonts.bunny.net") {
				entries = append(entries, parseGoogleFontsURL(href, "Bunny Fonts")...)
			} else if strings.Contains(href, "use.typekit.net") || strings.Contains(href, "use.typekit.com") {
				entries = append(entries, model.FontEntry{Family: "Adobe Fonts (Typekit)", Source: "Adobe Fonts"})
			}
		}
		if n.Type == html.ElementNode && n.Data == "script" {
			src := getAttr(n, "src")
			if strings.Contains(src, "use.typekit.net") {
				entries = append(entries, model.FontEntry{Family: "Adobe Fonts (Typekit)", Source: "Adobe Fonts"})
			}
		}
	children:
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			walk(c)
		}
	}
	walk(doc)

	// Scan rawHTML for @font-face blocks.
	for _, m := range reFontFace.FindAllStringSubmatch(rawHTML, -1) {
		family := strings.Trim(strings.TrimSpace(m[1]), `'"`)
		// Find weight in the full block match.
		block := m[0]
		var weights []string
		for _, wm := range reFontWeight.FindAllStringSubmatch(block, -1) {
			weights = append(weights, wm[1])
		}
		entries = append(entries, model.FontEntry{
			Family:  family,
			Source:  "Custom/Self-hosted",
			Weights: weights,
		})
	}

	// Deduplicate by family name (case-insensitive).
	seen := map[string]bool{}
	var unique []model.FontEntry
	for _, e := range entries {
		key := strings.ToLower(e.Family)
		if !seen[key] {
			seen[key] = true
			unique = append(unique, e)
		}
	}
	if unique == nil {
		unique = []model.FontEntry{}
	}

	totalWeights := 0
	for _, e := range unique {
		if len(e.Weights) > 0 {
			totalWeights += len(e.Weights)
		} else {
			totalWeights++ // count as 1 unknown weight
		}
	}

	return model.FontAudit{
		Families:      unique,
		TotalFamilies: len(unique),
		TotalWeights:  totalWeights,
		HasPerfIssue:  len(unique) > 3 || totalWeights > 6,
	}
}

// parseGoogleFontsURL extracts font families and weights from a Google/Bunny Fonts URL.
// Handles both CSS2 (?family=Inter:wght@400;700) and CSS1 (?family=Inter|Roboto) formats.
func parseGoogleFontsURL(rawURL, source string) []model.FontEntry {
	u, err := url.Parse(rawURL)
	if err != nil {
		return nil
	}
	q := u.Query()
	var families []string
	if vals, ok := q["family"]; ok {
		families = vals
	}

	// CSS1: single ?family=Inter|Roboto param
	if len(families) == 1 && strings.Contains(families[0], "|") {
		parts := strings.Split(families[0], "|")
		families = parts
	}

	var entries []model.FontEntry
	for _, f := range families {
		// f may be "Inter:wght@400;500;700" or just "Inter"
		var family string
		var weights []string
		if idx := strings.Index(f, ":"); idx != -1 {
			family = strings.TrimSpace(f[:idx])
			weightsPart := f[idx+1:]
			// strip "wght@", "ital,wght@" etc.
			if at := strings.Index(weightsPart, "@"); at != -1 {
				weightsPart = weightsPart[at+1:]
			}
			// "400;500;700" or "400,700" (ital format uses comma)
			for _, w := range strings.FieldsFunc(weightsPart, func(r rune) bool { return r == ';' || r == ',' }) {
				// italic variants look like "0,400" — take the weight part
				if idx2 := strings.LastIndex(w, ","); idx2 != -1 {
					w = w[idx2+1:]
				}
				w = strings.TrimSpace(w)
				if w != "" {
					weights = append(weights, w)
				}
			}
		} else {
			family = strings.TrimSpace(f)
		}
		family = strings.ReplaceAll(family, "+", " ")
		if family != "" {
			entries = append(entries, model.FontEntry{Family: family, Source: source, Weights: weights})
		}
	}
	return entries
}
```

- [ ] **Step 5: Run tests — confirm they pass**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website/backend"
go test ./internal/parser/ -run TestExtractFontAudit -v
```

Expected: all 3 PASS.

- [ ] **Step 6: Wire into `parser.go`**

In `parser.go`, add after the line `colorPalette := ExtractColorPalette(doc, rawHTML)`:
```go
fontAudit := ExtractFontAudit(doc, rawHTML)
```

Add `FontAudit: fontAudit,` to the `return model.AnalysisResult{...}` block.

- [ ] **Step 7: Build check**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website/backend"
go build ./...
```

Expected: no errors.

- [ ] **Step 8: Commit**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website"
git add backend/internal/model/model.go \
        backend/internal/parser/fonts.go \
        backend/internal/parser/fonts_test.go \
        backend/internal/parser/parser.go
git commit -m "feat: add font audit backend — detect Google/Bunny/Adobe/custom fonts"
```

---

## Task 6: Font Audit — Frontend

**Files:**
- Modify: `frontend/src/types/analysis.ts`
- Modify: `frontend/src/mock/mockData.ts`
- Create: `frontend/src/components/cards/FontAuditCard.tsx`

- [ ] **Step 1: Add types to `analysis.ts`**

Add after the `SiteFreshness` interface:

```ts
export interface FontEntry {
  family: string;
  source: string;
  weights: string[];
}

export interface FontAudit {
  families: FontEntry[];
  totalFamilies: number;
  totalWeights: number;
  hasPerfIssue: boolean;
}
```

Add to `AnalysisResult` (after `intentAlignment`):
```ts
fontAudit: FontAudit;
```

- [ ] **Step 2: Add mock data to `mockData.ts`**

Add to `mockAnalysisResult` (after `intentAlignment`):
```ts
fontAudit: {
  families: [
    { family: "Inter", source: "Google Fonts", weights: ["400", "500", "600", "700"] },
    { family: "Roboto Mono", source: "Google Fonts", weights: ["400", "500"] },
  ],
  totalFamilies: 2,
  totalWeights: 6,
  hasPerfIssue: false,
},
```

- [ ] **Step 3: Create `FontAuditCard.tsx`**

```tsx
import { CardShell } from "../ui/CardShell";
import { CardHeader } from "../ui/CardHeader";
import type { FontAudit } from "../../types/analysis";

const SOURCE_BADGE: Record<string, string> = {
  "Google Fonts":        "text-blue-400 bg-blue-500/10 border border-blue-500/25",
  "Bunny Fonts":         "text-emerald-400 bg-emerald-500/10 border border-emerald-500/25",
  "Adobe Fonts":         "text-red-400 bg-red-500/10 border border-red-500/25",
  "Custom/Self-hosted":  "text-zinc-400 bg-zinc-700/40 border border-zinc-600",
};

function sourceBadgeClass(source: string): string {
  return SOURCE_BADGE[source] ?? "text-zinc-400 bg-zinc-700/40 border border-zinc-600";
}

export function FontAuditCard({ fontAudit }: { fontAudit: FontAudit }) {
  const badgeColor = fontAudit.hasPerfIssue ? "amber" : "green" as const;

  if (fontAudit.totalFamilies === 0) {
    return (
      <CardShell>
        <CardHeader title="Font Audit" badge="System fonts" badgeColor="green" />
        <div className="p-4">
          <p className="text-xs text-zinc-500">No external web fonts detected — system fonts in use. Good for performance.</p>
        </div>
      </CardShell>
    );
  }

  return (
    <CardShell>
      <CardHeader
        title="Font Audit"
        badge={fontAudit.totalFamilies + (fontAudit.totalFamilies === 1 ? " family" : " families")}
        badgeColor={badgeColor}
      />
      <div className="p-4 flex flex-col gap-3">
        {fontAudit.hasPerfIssue && (
          <div className="text-[11px] text-amber-400 bg-amber-950/50 border border-amber-800/40 rounded px-3 py-2">
            ⚠ {fontAudit.totalFamilies > 3 ? `${fontAudit.totalFamilies} font families` : `${fontAudit.totalWeights} weight variants`} detected — consider consolidating to improve load time
          </div>
        )}
        <div className="flex flex-col gap-2">
          {fontAudit.families.map((f) => (
            <div key={f.family} className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <span className="text-xs font-medium text-zinc-200">{f.family}</span>
                {f.weights.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {f.weights.map((w) => (
                      <span key={w} className="text-[9px] font-mono text-zinc-500 bg-zinc-800/60 rounded px-1 py-px">{w}</span>
                    ))}
                  </div>
                )}
              </div>
              <span className={`text-[9px] font-semibold rounded px-1.5 py-px whitespace-nowrap shrink-0 ${sourceBadgeClass(f.source)}`}>
                {f.source}
              </span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-zinc-600 pt-1 border-t border-zinc-800/60">
          {fontAudit.totalWeights} total weight variant{fontAudit.totalWeights !== 1 ? "s" : ""} · each variant is a separate network request
        </p>
      </div>
    </CardShell>
  );
}
```

- [ ] **Step 4: TypeScript check**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website/frontend"
npx tsc -b --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website"
git add frontend/src/types/analysis.ts \
        frontend/src/mock/mockData.ts \
        frontend/src/components/cards/FontAuditCard.tsx
git commit -m "feat: add Font Audit frontend card"
```

---

## Task 7: Domain Info — Backend

**Files:**
- Modify: `backend/internal/model/model.go`
- Create: `backend/internal/parser/domain.go`
- Create: `backend/internal/parser/domain_test.go`
- Modify: `backend/internal/parser/parser.go`

- [ ] **Step 1: Add struct to `model.go`**

Add after `FontAudit`:

```go
// DomainInfo holds registration metadata fetched from the RDAP API.
type DomainInfo struct {
	RegisteredAt string `json:"registeredAt"` // "2012-03-15" — ISO date, no time
	ExpiresAt    string `json:"expiresAt"`     // "2027-03-15" — may be empty
	Registrar    string `json:"registrar"`     // e.g. "Cloudflare, Inc."
	AgeYears     int    `json:"ageYears"`      // -1 if unknown
}
```

Add to `AnalysisResult` (after `FontAudit`):
```go
DomainInfo  *DomainInfo  `json:"domainInfo,omitempty"`
```

- [ ] **Step 2: Write the failing tests in `domain_test.go`**

```go
package parser

import (
	"testing"
)

func TestParseDomainInfo_Full(t *testing.T) {
	data := []byte(`{
		"events": [
			{"eventAction": "registration", "eventDate": "2012-03-15T00:00:00Z"},
			{"eventAction": "expiration",   "eventDate": "2027-03-15T00:00:00Z"}
		],
		"entities": [{
			"roles": ["registrar"],
			"vcardArray": ["vcard", [
				["version", {}, "text", "4.0"],
				["fn",      {}, "text", "Cloudflare, Inc."]
			]]
		}]
	}`)
	result := parseDomainInfo(data)
	if result == nil {
		t.Fatal("expected non-nil result")
	}
	if result.RegisteredAt != "2012-03-15" {
		t.Errorf("expected RegisteredAt=2012-03-15, got %q", result.RegisteredAt)
	}
	if result.ExpiresAt != "2027-03-15" {
		t.Errorf("expected ExpiresAt=2027-03-15, got %q", result.ExpiresAt)
	}
	if result.Registrar != "Cloudflare, Inc." {
		t.Errorf("expected Cloudflare registrar, got %q", result.Registrar)
	}
	if result.AgeYears < 1 {
		t.Errorf("expected AgeYears >= 1, got %d", result.AgeYears)
	}
}

func TestParseDomainInfo_NoExpiry(t *testing.T) {
	data := []byte(`{
		"events": [
			{"eventAction": "registration", "eventDate": "2020-06-01T00:00:00Z"}
		],
		"entities": []
	}`)
	result := parseDomainInfo(data)
	if result == nil {
		t.Fatal("expected non-nil result")
	}
	if result.ExpiresAt != "" {
		t.Errorf("expected empty ExpiresAt, got %q", result.ExpiresAt)
	}
	if result.Registrar != "" {
		t.Errorf("expected empty Registrar, got %q", result.Registrar)
	}
}

func TestParseDomainInfo_InvalidJSON(t *testing.T) {
	result := parseDomainInfo([]byte(`not json`))
	if result != nil {
		t.Error("expected nil for invalid JSON")
	}
}
```

- [ ] **Step 3: Run tests — confirm they fail**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website/backend"
go test ./internal/parser/ -run TestParseDomainInfo -v
```

Expected: FAIL with "undefined: parseDomainInfo"

- [ ] **Step 4: Implement `domain.go`**

```go
package parser

import (
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/ahomsi/explain-website/internal/model"
)

// FetchDomainInfo calls the RDAP API for the domain in rawURL.
// Returns nil on any failure — domain info is always optional.
func FetchDomainInfo(rawURL string) *model.DomainInfo {
	u, err := url.Parse(rawURL)
	if err != nil {
		return nil
	}
	hostname := u.Hostname()
	// Strip subdomains — use the registrable domain (last two labels).
	// RDAP only works on registered domains, not subdomains.
	parts := strings.Split(hostname, ".")
	if len(parts) >= 2 {
		hostname = strings.Join(parts[len(parts)-2:], ".")
	}

	rdapURL := fmt.Sprintf("https://rdap.org/domain/%s", hostname)
	client := &http.Client{
		Timeout: 10 * time.Second,
		Transport: &http.Transport{
			DialContext: (&net.Dialer{Timeout: 5 * time.Second}).DialContext,
		},
	}
	resp, err := client.Get(rdapURL)
	if err != nil {
		return nil
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, 64*1024))
	if err != nil {
		return nil
	}
	return parseDomainInfo(body)
}

// rdapResponse is the subset of the RDAP JSON we care about.
type rdapResponse struct {
	Events []struct {
		Action string `json:"eventAction"`
		Date   string `json:"eventDate"`
	} `json:"events"`
	Entities []struct {
		Roles      []string        `json:"roles"`
		VcardArray json.RawMessage `json:"vcardArray"`
	} `json:"entities"`
}

// parseDomainInfo parses a raw RDAP JSON response body into a DomainInfo.
// Exported as unexported helper so it can be unit-tested without network.
func parseDomainInfo(data []byte) *model.DomainInfo {
	var r rdapResponse
	if err := json.Unmarshal(data, &r); err != nil {
		return nil
	}

	info := &model.DomainInfo{AgeYears: -1}

	for _, ev := range r.Events {
		if len(ev.Date) < 10 {
			continue
		}
		dateStr := ev.Date[:10] // "YYYY-MM-DD"
		switch strings.ToLower(ev.Action) {
		case "registration":
			info.RegisteredAt = dateStr
			if t, err := time.Parse("2006-01-02", dateStr); err == nil {
				info.AgeYears = time.Now().Year() - t.Year()
			}
		case "expiration":
			info.ExpiresAt = dateStr
		}
	}

	// Extract registrar name from vcardArray.
	for _, ent := range r.Entities {
		for _, role := range ent.Roles {
			if strings.EqualFold(role, "registrar") {
				info.Registrar = extractRegistrarName(ent.VcardArray)
				break
			}
		}
	}

	if info.RegisteredAt == "" {
		return nil // no useful data
	}
	return info
}

// extractRegistrarName parses the vcardArray JSON to find the "fn" (full name) field.
func extractRegistrarName(raw json.RawMessage) string {
	// vcardArray = ["vcard", [[type, params, kind, value], ...]]
	var arr []json.RawMessage
	if err := json.Unmarshal(raw, &arr); err != nil || len(arr) < 2 {
		return ""
	}
	var props [][]json.RawMessage
	if err := json.Unmarshal(arr[1], &props); err != nil {
		return ""
	}
	for _, prop := range props {
		if len(prop) < 4 {
			continue
		}
		var propType string
		if err := json.Unmarshal(prop[0], &propType); err != nil {
			continue
		}
		if strings.EqualFold(propType, "fn") {
			var val string
			if err := json.Unmarshal(prop[3], &val); err == nil {
				return val
			}
		}
	}
	return ""
}
```

- [ ] **Step 5: Run tests — confirm they pass**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website/backend"
go test ./internal/parser/ -run TestParseDomainInfo -v
```

Expected: all 3 PASS.

- [ ] **Step 6: Wire into `parser.go`**

At the top of `Parse()`, after the `perfCh` goroutine block, add:

```go
type domainResult struct{ data *model.DomainInfo }
domainCh := make(chan domainResult, 1)
go func() { domainCh <- domainResult{FetchDomainInfo(sourceURL)} }()
```

After `perf := (<-perfCh).data`, add:
```go
domainInfo := (<-domainCh).data
```

Add `DomainInfo: domainInfo,` to the `return model.AnalysisResult{...}` block.

- [ ] **Step 7: Full backend test run**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website/backend"
go test ./...
```

Expected: all packages pass (domain tests pass, no regressions).

- [ ] **Step 8: Commit**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website"
git add backend/internal/model/model.go \
        backend/internal/parser/domain.go \
        backend/internal/parser/domain_test.go \
        backend/internal/parser/parser.go
git commit -m "feat: add domain info backend — RDAP lookup for age, registrar, expiry"
```

---

## Task 8: Domain Info — Frontend

**Files:**
- Modify: `frontend/src/types/analysis.ts`
- Modify: `frontend/src/mock/mockData.ts`
- Create: `frontend/src/components/cards/DomainInfoCard.tsx`

- [ ] **Step 1: Add type to `analysis.ts`**

Add after `FontAudit`:
```ts
export interface DomainInfo {
  registeredAt: string; // "YYYY-MM-DD"
  expiresAt: string;    // "YYYY-MM-DD" or ""
  registrar: string;
  ageYears: number;     // -1 if unknown
}
```

Add to `AnalysisResult`:
```ts
domainInfo?: DomainInfo;
```

- [ ] **Step 2: Add mock to `mockData.ts`**

Add to `mockAnalysisResult` (after `fontAudit`):
```ts
domainInfo: {
  registeredAt: "2018-04-12",
  expiresAt: "2026-04-12",
  registrar: "Cloudflare, Inc.",
  ageYears: 7,
},
```

- [ ] **Step 3: Create `DomainInfoCard.tsx`**

```tsx
import { CardShell } from "../ui/CardShell";
import { CardHeader } from "../ui/CardHeader";
import type { DomainInfo } from "../../types/analysis";

function ageBadgeColor(years: number): "green" | "amber" | "red" {
  if (years >= 5) return "green";
  if (years >= 2) return "amber";
  return "red";
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[parseInt(m) - 1]} ${d}, ${y}`;
}

export function DomainInfoCard({ domainInfo }: { domainInfo: DomainInfo }) {
  const ageBadge = domainInfo.ageYears > 0
    ? `${domainInfo.ageYears} yr${domainInfo.ageYears !== 1 ? "s" : ""} old`
    : "Age unknown";
  const badgeColor = domainInfo.ageYears > 0
    ? ageBadgeColor(domainInfo.ageYears)
    : "violet" as const;

  return (
    <CardShell>
      <CardHeader title="Domain Info" badge={ageBadge} badgeColor={badgeColor} />
      <div className="p-4 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">Registered</p>
            <p className="text-sm font-semibold text-zinc-200">{formatDate(domainInfo.registeredAt)}</p>
          </div>
          {domainInfo.expiresAt && (
            <div>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">Expires</p>
              <p className="text-sm font-semibold text-zinc-200">{formatDate(domainInfo.expiresAt)}</p>
            </div>
          )}
        </div>
        {domainInfo.registrar && (
          <div className="border-t border-zinc-800/60 pt-3">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">Registrar</p>
            <p className="text-xs text-zinc-300">{domainInfo.registrar}</p>
          </div>
        )}
        {domainInfo.ageYears > 0 && domainInfo.ageYears < 2 && (
          <p className="text-[11px] text-amber-400 bg-amber-950/50 border border-amber-800/40 rounded px-3 py-2">
            ⚠ New domain — search engines may rank established domains higher
          </p>
        )}
      </div>
    </CardShell>
  );
}
```

- [ ] **Step 4: TypeScript check**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website/frontend"
npx tsc -b --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website"
git add frontend/src/types/analysis.ts \
        frontend/src/mock/mockData.ts \
        frontend/src/components/cards/DomainInfoCard.tsx
git commit -m "feat: add Domain Info frontend card"
```

---

## Task 9: Wire New Cards Into Dashboard + Push

**Files:**
- Modify: `frontend/src/components/ResultDashboard/sections.tsx`

- [ ] **Step 1: Add imports to `sections.tsx`**

Add after the existing imports:
```tsx
import { FontAuditCard }   from "../cards/FontAuditCard";
import { DomainInfoCard }  from "../cards/DomainInfoCard";
```

- [ ] **Step 2: Add `DomainInfoCard` to the Overview section**

In the `case "overview":` block, add after `<SiteFreshnessCard freshness={result.siteFreshness} />`:
```tsx
{result.domainInfo && <DomainInfoCard domainInfo={result.domainInfo} />}
```

- [ ] **Step 3: Add `FontAuditCard` to the Performance section**

In the `case "performance":` block, add `FontAuditCard` into the first 2-col grid alongside `ImageAuditCard`:
```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-3">
  {result.pageStats && <PagePerfCard pageStats={result.pageStats} />}
  <ImageAuditCard audit={result.imageAudit} />
  <FontAuditCard fontAudit={result.fontAudit} />
</div>
```

- [ ] **Step 4: Final TypeScript check**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website/frontend"
npx tsc -b --noEmit
```

Expected: no errors.

- [ ] **Step 5: Full backend test run**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website/backend"
go test ./...
```

Expected: all pass.

- [ ] **Step 6: Commit and push**

```bash
cd "/Users/ahomsi/Development/Personal Projects/Explain The Website"
git add frontend/src/components/ResultDashboard/sections.tsx
git commit -m "feat: wire FontAuditCard and DomainInfoCard into dashboard"
git push origin main
```

---

## Self-Review

**Spec coverage check:**
- ✅ Card restyling — Task 2 (components) + Task 3 (all 22 cards)
- ✅ Light mode violet palette — Task 1
- ✅ 3-col grid + wider max-w — Task 4
- ✅ Font Audit backend — Task 5
- ✅ Font Audit frontend — Task 6
- ✅ Domain Info backend — Task 7
- ✅ Domain Info frontend — Task 8
- ✅ Dashboard wiring — Task 9

**Type consistency:**
- `FontAudit` / `fontAudit` consistent across model.go (Task 5), analysis.ts (Task 6), parser.go (Task 5 step 6), sections.tsx (Task 9)
- `DomainInfo` / `domainInfo` consistent across model.go (Task 7), analysis.ts (Task 8), parser.go (Task 7 step 6), sections.tsx (Task 9)
- `CardShell` import path `"../ui/CardShell"` correct for all card files in `components/cards/`
- `parseDomainInfo` is unexported helper — consistent across domain.go implementation and domain_test.go
