# Explain This Website

Paste any URL and get an instant analysis report covering tech stack detection, SEO audit, UX/conversion signals, page performance stats, content analysis, weak points, and actionable recommendations. Results can be exported as a PDF report.

**Live:** [explainthewebsite.vercel.app](https://explainthewebsite.vercel.app)

---

## What it analyses

| Section | Details |
|---|---|
| **Overview** | Page title, meta description, favicon, language, estimated page weight |
| **Tech Stack** | CMS, frameworks, analytics, CDNs, e-commerce platforms, media embeds (30+ technologies) + confidence labels (high / medium / low) |
| **SEO Audit** | 13 checks — HTTPS, mixed content, title/description length, canonical, H1, image alt text, Open Graph, structured data, viewport, robots directive, hreflang, sitemap |
| **UX & Conversion** | CTAs, forms, social proof, trust signals, contact info, mobile-readiness, cookie banner, live chat, video, newsletter signup, privacy policy |
| **Page Stats** | Word count, images, internal/external links, scripts, headings (H1–H3), stylesheets, fonts, inline styles, render-blocking scripts, lazy images, content-to-code ratio |
| **Content Analysis** | Top keywords, average sentence length, reading level (Simple / Moderate / Advanced) |
| **Weak Points** | Auto-generated list of the most impactful issues found |
| **Recommendations** | Actionable fixes tied directly to the weak points |

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18, Vite, TypeScript, Tailwind CSS |
| Backend | Go (stdlib net/http), golang.org/x/net/html |
| PDF Export | jsPDF + jspdf-autotable |
| Hosting | Vercel (frontend) + Render (backend) |

---

## Prerequisites

- **Go 1.22+**
- **Node 18+** and **npm**

---

## Quick Start

### 1. Backend

```bash
cd backend
cp .env.example .env        # edit if needed
go mod download
go run main.go
# Server listening on :8080
```

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local  # set VITE_API_URL=http://localhost:8080
npm install
npm run dev
# App available at http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173), paste a URL, and click **Analyze**.

---

## Development without a backend (mock mode)

Set `VITE_USE_MOCK=true` in `frontend/.env.local`. The app will return mock data after a short delay — no Go server required.

---

## Project Structure

```
.
├── backend/
│   ├── main.go
│   ├── go.mod
│   └── internal/
│       ├── config/       # env loading
│       ├── fetcher/      # HTTP client + SSRF guard
│       ├── handler/      # POST /api/analyze
│       ├── model/        # shared data types
│       ├── parser/
│       │   ├── parser.go   # orchestrator + page stats
│       │   ├── seo.go      # 13-point SEO audit
│       │   ├── tech.go     # tech stack fingerprinting
│       │   ├── ux.go       # UX + conversion signals
│       │   └── content.go  # keywords + reading level
│       └── server/       # ServeMux + CORS + recovery middleware
└── frontend/
    └── src/
        ├── components/
        │   ├── cards/    # Result cards (SEO, Tech, UX, Stats, Content…)
        │   └── ui/       # Logo, DownloadButton, shared primitives
        ├── hooks/        # useAnalysis state machine
        ├── mock/         # mockData.ts for offline dev
        ├── services/     # analyzeApi.ts fetch wrapper
        └── types/        # TypeScript interfaces
```

---

## API Reference

### `POST /api/analyze`

**Request**
```json
{ "url": "https://example.com" }
```

**Success (200)**
```json
{
  "url": "https://example.com",
  "fetchedAt": "2026-04-10T12:00:00Z",
  "overview": {
    "title": "...", "description": "...", "favicon": "...",
    "language": "en", "pageLoadHint": "medium"
  },
  "techStack": [{ "name": "React", "category": "framework", "confidence": "high" }],
  "seoChecks": [{ "id": "https", "label": "HTTPS", "status": "pass", "detail": "..." }],
  "ux": {
    "hasCTA": true, "ctaCount": 3, "hasForms": true, "formCount": 1,
    "hasSocialProof": false, "hasTrustSignals": true, "hasContactInfo": true,
    "mobileReady": true, "hasCookieBanner": true, "hasLiveChat": false,
    "hasVideoContent": false, "hasNewsletterSignup": true, "hasPrivacyPolicy": true
  },
  "pageStats": {
    "wordCount": 1200, "imageCount": 8, "internalLinks": 24, "externalLinks": 5,
    "scriptCount": 6, "h1Count": 1, "h2Count": 4, "h3Count": 9,
    "stylesheetCount": 3, "fontCount": 2, "inlineStyleCount": 12,
    "renderBlockingScripts": 1, "lazyImageCount": 6,
    "contentToCodeRatio": 22, "videoCount": 0
  },
  "contentStats": {
    "topKeywords": ["widgets", "shipping", "store"],
    "avgSentenceLen": 18,
    "readingLevel": "moderate"
  },
  "weakPoints": ["No canonical URL — risk of duplicate content penalties"],
  "recommendations": ["Add <link rel=\"canonical\"> in the <head>"]
}
```

**Error (400 / 422 / 500)**
```json
{ "error": "invalid URL: must use http or https scheme" }
```

### `GET /api/health`

Returns `{"status":"ok"}`.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8080` | Port the API server listens on |
| `ALLOWED_ORIGIN` | `http://localhost:5173,http://127.0.0.1:5173` | CORS allowed origin(s). Accepts `*`, a single origin, or a comma-separated list |
| `FETCH_TIMEOUT_SEC` | `60` | Seconds before aborting a fetch |
| `MAX_BODY_BYTES` | `5242880` (5 MB) | Max response body size |

### Frontend (`frontend/.env.local`)

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8080` | Backend API base URL |
| `VITE_USE_MOCK` | `false` | Use mock data instead of real backend |

---

## Building for Production

### Backend
```bash
cd backend
go build -o explain-website main.go
./explain-website
```

### Frontend
```bash
cd frontend
npm run build
# Output in frontend/dist/
```
