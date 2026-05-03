# UI Refresh + Font Audit + Domain Info — Design Spec

## Goal
Redesign the dashboard for better desktop use of space, consistent card styling, a properly contrasted light mode, and two new data features: Font Audit and Domain Age.

## Architecture
Frontend-only for layout/card/light-mode changes. Two new backend parsers (`fonts.go`, `domain.go`) added to the existing parser package. Domain info fetched concurrently in `parser.go` like the existing PageSpeed goroutine. All cards updated to use shared `CardShell` / `CardHeader` components driven by new CSS classes in `index.css`.

## Tech Stack
React 18 + TypeScript + Tailwind CSS + Vite (frontend); Go stdlib (backend). RDAP API (`rdap.org`) for domain info — no API key required.

---

## 1. Card Styling

### New shared components
**`frontend/src/components/ui/CardShell.tsx`**
Wrapper div that applies the new card base style:
- `rounded-lg overflow-hidden border border-zinc-800 border-l-[2px] border-l-violet-700` (Tailwind)
- CSS class `card-shell` for gradient background + light-mode flip (defined in `index.css`)

```tsx
export function CardShell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`card-shell rounded-lg overflow-hidden border border-zinc-800 border-l-[2px] border-l-violet-700 ${className}`}>
      {children}
    </div>
  );
}
```

**`frontend/src/components/ui/CardHeader.tsx`**
Standard header band with dot + title + optional badge:

```tsx
export function CardHeader({ title, badge, badgeColor = "violet" }: {
  title: string;
  badge?: string | number;
  badgeColor?: "violet" | "green" | "amber" | "red";
}) {
  const badgeClass = {
    violet: "text-violet-300 bg-violet-500/10 border-violet-500/25",
    green:  "text-emerald-400 bg-emerald-500/10 border-emerald-500/25",
    amber:  "text-amber-400 bg-amber-500/10 border-amber-500/25",
    red:    "text-red-400 bg-red-500/10 border-red-500/25",
  }[badgeColor];
  return (
    <div className="card-header flex items-center gap-2 px-4 py-2.5 border-b border-zinc-800/60">
      <div className="w-[5px] h-[5px] rounded-full bg-violet-600 shrink-0 opacity-70" />
      <span className="text-[10px] font-bold text-violet-300 uppercase tracking-wider flex-1">{title}</span>
      {badge !== undefined && (
        <span className={`text-[10px] font-bold border rounded px-1.5 py-px ${badgeClass}`}>{badge}</span>
      )}
    </div>
  );
}
```

### CSS additions to `frontend/src/index.css`

```css
/* Card shell: gradient bg in dark mode */
.card-shell {
  background: linear-gradient(135deg, #18181b 0%, #1c1917 100%);
}

/* Card header band */
.card-header {
  background: rgba(124, 58, 237, 0.06);
}

/* Light mode overrides for card components */
html.light .card-shell {
  background: #ffffff;
  border-color: #ddd6fe;
  border-left-color: #7c3aed;
}
html.light .card-header {
  background: #faf5ff;
  border-bottom-color: #ede9fe;
}
```

### Card file updates
All 22 existing card files updated to replace:
```tsx
// Before
<div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
  <p className="text-xs font-semibold text-violet-400 uppercase tracking-wider mb-3">Title</p>
```
With:
```tsx
// After
<CardShell>
  <CardHeader title="Title" badge={optionalScore} badgeColor="green" />
  <div className="p-4">
```

Cards with no natural badge (e.g. Recommendations, WeakPoints) omit the `badge` prop.

---

## 2. Light Mode (Violet-Tinted)

Full replacement of the light mode CSS block in `frontend/src/index.css`.

**Color mapping:**
| Dark token | Light value | Usage |
|---|---|---|
| `bg-zinc-950` | `#f5f3ff` (violet-50) | Page background |
| `bg-zinc-900` | `#ffffff` | Card backgrounds |
| `bg-zinc-800` | `#ede9fe` (violet-100) | Subtle fills, inputs |
| `bg-zinc-900/50` | `rgba(250,245,255,0.8)` | Sidebar, overlays |
| `border-zinc-800` | `#ddd6fe` (violet-200) | Card borders |
| `border-zinc-700` | `#c4b5fd` (violet-300) | Stronger borders |
| `text-zinc-100` | `#1e1b4b` (indigo-950) | Primary text |
| `text-zinc-200` | `#312e81` (indigo-900) | Secondary headings |
| `text-zinc-300` | `#4338ca` (indigo-700) | Tertiary text |
| `text-zinc-400` | `#4b5563` (gray-600) | Muted text |
| `text-zinc-500` | `#6b7280` (gray-500) | Placeholder/caption |
| `text-zinc-600` | `#9ca3af` (gray-400) | Faintest text |
| `text-violet-400` | `#6d28d9` (violet-700) | Section labels |
| `text-violet-300` | `#7c3aed` (violet-600) | Hover/accent |
| Status badges (dark) | Flipped to light equivalents | `bg-emerald-950` → `bg-emerald-50`, etc. |

Status badge dark→light flips needed in CSS:
```css
html.light .bg-emerald-950 { background-color: #f0fdf4 !important; }
html.light .bg-red-950     { background-color: #fef2f2 !important; }
html.light .bg-amber-950   { background-color: #fffbeb !important; }
html.light .border-emerald-800 { border-color: #86efac !important; }
html.light .border-red-800     { border-color: #fca5a5 !important; }
html.light .border-amber-800   { border-color: #fcd34d !important; }
html.light .text-emerald-400   { color: #16a34a !important; }
html.light .text-red-400       { color: #dc2626 !important; }
html.light .text-amber-400     { color: #d97706 !important; }
html.light .bg-zinc-800\/50    { background-color: rgba(237,233,254,0.6) !important; }
```

Sidebar active state in light mode:
```css
html.light .bg-violet-500\/10  { background-color: rgba(124,58,237,0.08) !important; }
html.light .border-violet-500\/30 { border-color: rgba(124,58,237,0.25) !important; }
```

The `html.light body` background changes to `#f5f3ff`.

---

## 3. 3-Column Grid Layout

**`frontend/src/components/ResultDashboard/sections.tsx`**

Change all two-column card grids to scale to three columns on 2xl screens:
```tsx
// Before
<div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

// After
<div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-3">
```

Also remove the `max-w-[1400px]` cap on the main content wrapper in `ResultDashboard.tsx` — replace with `max-w-[1800px]` so wide screens are used.

The sidebar stays at 220px. The content area now fills the remaining width with a wider cap.

---

## 4. Font Audit

### Backend — `backend/internal/parser/fonts.go` (new file)

```go
func ExtractFontAudit(doc *html.Node, rawHTML string) model.FontAudit
```

Detection strategy (HTML parsing only, no network calls):

1. **Google Fonts** — `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@...">` 
   - Parse `family=` query param, split on `|` for multiple families
   - Parse `wght@` for weight variants: `400;500;700` → 3 weights
   - Source label: `"Google Fonts"`

2. **Bunny Fonts** — `<link href="https://fonts.bunny.net/css?family=...">` 
   - Same parsing as Google Fonts
   - Source label: `"Bunny Fonts"`

3. **Adobe Fonts (Typekit)** — `<link href="https://use.typekit.net/...css">` or `<script src="use.typekit.net/...">`
   - Can't know family names without fetching — record as `"Adobe Fonts (Typekit)"`, source `"Adobe Fonts"`, weights unknown

4. **Inline @font-face** — scan `rawHTML` for `@font-face` blocks with regex
   - Extract `font-family:` value and `font-weight:` values
   - Source label: `"Custom/Self-hosted"`

**`model.FontEntry`**:
```go
type FontEntry struct {
    Family  string   `json:"family"`
    Source  string   `json:"source"` // "Google Fonts" | "Bunny Fonts" | "Adobe Fonts" | "Custom/Self-hosted"
    Weights []string `json:"weights"` // ["400","500","700"] or empty if unknown
}

type FontAudit struct {
    Families      []FontEntry `json:"families"`
    TotalFamilies int         `json:"totalFamilies"`
    TotalWeights  int         `json:"totalWeights"`
    HasPerfIssue  bool        `json:"hasPerfIssue"` // true if >3 families or >6 total weight variants
}
```

Add to `model.AnalysisResult`:
```go
FontAudit FontAudit `json:"fontAudit"`
```

Wire in `parser.go`:
```go
fontAudit := ExtractFontAudit(doc, rawHTML)
// ... add to return struct
```

### Frontend — `frontend/src/components/cards/FontAuditCard.tsx` (new file)

- Header: "Font Audit" + badge showing count (e.g. `3 families`)
- Each font as a row: family name + source badge (Google Fonts = blue, Adobe = red, Custom = gray) + weight chips
- Warning strip if `hasPerfIssue`: "3+ font families can slow page load — consider consolidating"
- Zero state: "No external web fonts detected — system fonts in use"

Add types to `frontend/src/types/analysis.ts`:
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

Add to `AnalysisResult`: `fontAudit: FontAudit;`

Add mock to `mockData.ts`.

---

## 5. Domain Info

### Backend — `backend/internal/parser/domain.go` (new file)

```go
func FetchDomainInfo(rawURL string) *model.DomainInfo
```

Uses RDAP (`https://rdap.org/domain/{hostname}`) — free, no API key, JSON response.

```go
// HTTP GET with 10s timeout
url := "https://rdap.org/domain/" + hostname
// Parse response JSON fields:
// .events[] where eventAction == "registration" → eventDate
// .events[] where eventAction == "expiration" → eventDate
// .entities[].vcardArray or .entities[].roles[] == "registrar" → .entities[].vcardArray[1][?][3]
```

Domain age: `time.Now().Year() - registeredYear`. If year is unavailable, age is -1.

Returns `nil` on any failure (timeout, RDAP not found for TLD, etc.).

**`model.DomainInfo`**:
```go
type DomainInfo struct {
    RegisteredAt string `json:"registeredAt"` // ISO date string, e.g. "2012-03-15"
    ExpiresAt    string `json:"expiresAt"`     // ISO date string, may be empty
    Registrar    string `json:"registrar"`     // e.g. "Cloudflare, Inc."
    AgeYears     int    `json:"ageYears"`      // calculated from RegisteredAt; -1 if unknown
}
```

Add to `model.AnalysisResult`:
```go
DomainInfo *model.DomainInfo `json:"domainInfo,omitempty"`
```

Wire in `parser.go` as a concurrent goroutine (same pattern as `perfCh`):
```go
domainCh := make(chan *model.DomainInfo, 1)
go func() { domainCh <- FetchDomainInfo(sourceURL) }()
// ...
domainInfo := <-domainCh
```

### Frontend — `frontend/src/components/cards/DomainInfoCard.tsx` (new file)

- Header: "Domain Info" + age badge (e.g. `7 yrs old`) colored by age: green ≥5 yrs, amber 2–4 yrs, red <2 yrs
- Registered date + Expires date as two metric rows
- Registrar name
- Zero/nil state: "Domain registration data not available" (many TLDs don't support RDAP)

Add type to `analysis.ts`:
```ts
export interface DomainInfo {
  registeredAt: string;
  expiresAt: string;
  registrar: string;
  ageYears: number;
}
```

Add to `AnalysisResult`: `domainInfo?: DomainInfo;`

---

## 6. Dashboard Wiring

**`sections.tsx`** — add FontAuditCard to Performance section, DomainInfoCard to Overview section:

```tsx
// Overview section — after SiteFreshnessCard
{result.domainInfo && <DomainInfoCard domainInfo={result.domainInfo} />}

// Performance section — in the 2-col grid with ImageAuditCard
<FontAuditCard fontAudit={result.fontAudit} />
```

---

## 7. Mobile Responsiveness

The sidebar already hides on mobile (`hidden md:flex`) and a mobile tab bar appears. With the 3-col grid change, mobile/tablet views are unaffected — the `grid-cols-1` and `lg:grid-cols-2` steps still apply. No additional mobile work needed beyond what the layout change handles.

---

## Testing

1. `npx tsc -b --noEmit` — must pass after all frontend changes
2. `go test ./...` — all backend tests must pass
3. `go build ./...` — backend must compile
4. Visual check: run `npm run dev`, analyze a URL, verify:
   - Cards have left border + header band
   - Toggle to light mode — violet-50 background, white cards, no white-wash
   - On a wide monitor (≥1536px): cards render in 3 columns
   - Font Audit card appears in Performance section
   - Domain Info card appears in Overview section (if RDAP responds)
