# Explain This Website

Paste any URL and get an instant analysis report covering SEO, page performance (Google PageSpeed / Lighthouse), UX/conversion signals, tech stack detection, content analysis, and actionable recommendations. Results include an executive summary with scored sub-categories and can be shared via a public link or exported as a PDF.

Usage model:
- Anonymous visitors: `5` analyses per day, no account required
- Free accounts: `5` analyses per day plus saved audit history
- Pro accounts: `50` analyses per day for `$2.99/month or $24.99/year`

**Live:** [explain-this-website.vercel.app](https://explain-this-website.vercel.app/)

---

## What it analyses

| Section | Details |
|---|---|
| **Executive Summary** | Overall score (0–100), sub-scores for SEO / Performance / UX / Conversion, top issues, quick wins, and a one-sentence summary |
| **Overview** | Page title, meta description, favicon, language, estimated page weight |
| **Tech Stack** | CMS, frameworks, analytics, CDNs, e-commerce platforms, media embeds (30+ technologies) + confidence labels (high / medium / low) |
| **SEO Audit** | 13 checks — HTTPS, mixed content, title/description length, canonical, H1, image alt text, Open Graph, structured data, viewport, robots directive, hreflang, sitemap |
| **Performance** | Google PageSpeed Insights (mobile + desktop): Lighthouse scores, Core Web Vitals (LCP, FCP, TBT, CLS, Speed Index), field data (CrUX) where available, and third-party impact |
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
| Backend | Go 1.22 (stdlib net/http), PostgreSQL (pgx/v5) |
| Auth | JWT (HS256), bcrypt password hashing, email-based password reset |
| Payments | Tap Payments (checkout, subscription management, webhook lifecycle) |
| Email | Resend API |
| Performance | Google PageSpeed Insights API v5 |
| PDF Export | jsPDF + jspdf-autotable |
| Hosting | Vercel (frontend) + Render (backend + Postgres) |

---

## Prerequisites

- **Go 1.22+**
- **Node 18+** and **npm**
- **PostgreSQL** (or set `DATABASE_URL` to a managed instance — Render, Supabase, etc.)

---

## Quick Start

### 1. Backend

```bash
cd backend
cp .env.example .env        # fill in required vars (see Environment Variables below)
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

Set `VITE_USE_MOCK=true` in `frontend/.env.local`. The app returns mock data after a short delay — no Go server or database required.

---

## Project Structure

```
.
├── backend/
│   ├── main.go
│   ├── go.mod
│   └── internal/
│       ├── adminstate/    # In-memory feature flags, failure log, health state
│       ├── auth/          # JWT middleware, RequireAuth
│       ├── config/        # Env loading
│       ├── db/            # pgx pool + schema migrations (auto-run on startup)
│       ├── email/         # Resend client (password reset, broadcast)
│       ├── fetcher/       # HTTP client + SSRF guard
│       ├── handler/
│       │   ├── admin.go         # Admin overview + PATCH /api/admin/users/{id}
│       │   ├── analyze.go       # POST /api/analyze (main analysis pipeline)
│       │   ├── audits.go        # Audit history save/fetch/share
│       │   ├── auth.go          # Sign-up, sign-in, sign-out, /me
│       │   ├── billing.go       # Stripe checkout + billing portal + webhook
│       │   ├── password_reset.go
│       │   ├── store.go         # Anonymous visitor daily usage
│       │   └── usage.go         # Admin usage controls
│       ├── model/         # Shared data types (AnalysisResult, PerformanceResult…)
│       ├── parser/
│       │   ├── parser.go        # Orchestrator + page stats
│       │   ├── seo.go           # 13-point SEO audit
│       │   ├── tech.go          # Tech stack fingerprinting
│       │   ├── ux.go            # UX + conversion signals
│       │   ├── content.go       # Keywords + reading level
│       │   └── performance.go   # PageSpeed Insights (mobile + desktop)
│       └── server/        # ServeMux, CORS, recovery middleware
└── frontend/
    └── src/
        ├── components/
        │   ├── admin/     # AdminDashboard (Users / Metrics / System tabs)
        │   ├── auth/      # AuthModal, UserMenu, ForgotPassword
        │   ├── billing/   # PricingPage, UpgradePrompt
        │   ├── cards/     # All result cards (SEO, Tech, UX, Stats, Perf…)
        │   ├── layout/    # Page shell, nav
        │   └── ui/        # Logo, CardShell, shared primitives
        ├── context/       # AuthContext
        ├── hooks/         # useAnalysis state machine
        ├── mock/          # mockData.ts for offline dev
        ├── services/      # analyzeApi.ts, authApi.ts fetch wrappers
        ├── types/         # TypeScript interfaces
        └── utils/         # Score colors, insights engine
```

---

## API Reference

### Analysis

#### `POST /api/analyze`

**Request**
```json
{ "url": "https://example.com" }
```

**Success (200)** — returns a full `AnalysisResult` including `overview`, `techStack`, `seoChecks`, `performance`, `ux`, `pageStats`, `contentStats`, `weakPoints`, `recommendations`.

**Error (400 / 403 / 422 / 429 / 500)**
```json
{ "error": "Your account has been suspended. Please contact support." }
```

#### `GET /api/share/:id`

Returns a previously saved analysis result by its share ID. No authentication required.

---

### Auth

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/signup` | Create account |
| `POST` | `/api/auth/signin` | Sign in, returns JWT |
| `POST` | `/api/auth/signout` | Invalidate session |
| `GET` | `/api/auth/me` | Current user info |
| `POST` | `/api/auth/forgot-password` | Send reset code |
| `POST` | `/api/auth/reset-password` | Submit new password |

---

### Audit History

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/audits` | List saved audits for authenticated user |
| `DELETE` | `/api/audits/:id` | Delete an audit |
| `PATCH` | `/api/audits/:id/share` | Toggle public sharing |

---

### Billing (Stripe)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/billing/checkout` | Create Stripe checkout session |
| `POST` | `/api/billing/portal` | Open billing portal |
| `POST` | `/api/stripe/webhook` | Stripe subscription lifecycle events |

---

### Admin

All admin routes require the `ADMIN_EMAIL` account to be authenticated.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/overview` | Full dashboard data — users, audits, health, metrics |
| `PATCH` | `/api/admin/users/{id}` | Override plan, suspend/unsuspend, set note |
| `POST` | `/api/admin/users/{id}/reset-usage` | Reset a user's daily usage count |
| `POST` | `/api/admin/users/{id}/plan` | Legacy plan update |
| `POST` | `/api/admin/visitors/{id}/usage` | Update anonymous visitor usage |
| `POST` | `/api/admin/flags/{name}` | Toggle a feature flag |
| `POST` | `/api/admin/broadcast` | Send email to all users |

#### `PATCH /api/admin/users/{id}` body

```json
{
  "plan": "free | pro",
  "suspended": true,
  "note": "Internal note text"
}
```

All fields are optional. Returns `204 No Content`.

---

### `GET /api/health`

Returns `{"status":"ok"}`.

---

## Admin Dashboard

The dashboard lives at `/dashboard` and is restricted to the `ADMIN_EMAIL` account.

**Three tabs:**

| Tab | Content |
|---|---|
| **Users** | Full user list with search, plan filter, CSV export. Per-row: usage override, plan toggle, suspend/unsuspend, admin note (with modal editor). Suspended users are badged in red; users with notes show a violet dot. |
| **Metrics** | Recent audits, audits-per-day chart, top URLs, PageSpeed hit-rate table (14-day daily breakdown), slowest analyses (last 30 days). |
| **System** | System health card (DB latency, API key status), failure log, feature flags (PageSpeed / email toggles), broadcast email. |

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `8080` | Port the API server listens on |
| `ALLOWED_ORIGIN` | `http://localhost:5173` | CORS allowed origin(s). Accepts `*`, a single origin, or comma-separated list |
| `FETCH_TIMEOUT_SEC` | `60` | Seconds before aborting a page fetch |
| `MAX_BODY_BYTES` | `5242880` | Max response body size (5 MB) |
| `DATABASE_URL` | — | PostgreSQL connection string. Schema is applied automatically on startup |
| `JWT_SECRET` | — | Secret key for signing JWTs. **Required** for auth to work |
| `ADMIN_EMAIL` | — | Email address that has full admin access to the dashboard |
| `PAGESPEED_API_KEY` | — | Google PageSpeed Insights API key. Without this key, PageSpeed requests are unauthenticated and rate-limited to ~1 QPS |
| `RESEND_API_KEY` | — | Enables email delivery via Resend. Without it, reset codes are logged to stdout only |
| `FROM_EMAIL` | `Explain The Website <onboarding@resend.dev>` | Sender address shown on outbound emails |
| `TAP_SECRET_KEY` | — | Tap Payments secret key. Without this key, billing endpoints return 503 |
| `TAP_MONTHLY_PLAN_ID` | — | Tap plan ID for the $2.99/month Pro plan |
| `TAP_YEARLY_PLAN_ID` | — | Tap plan ID for the $24.99/year Pro plan |
| `TAP_WEBHOOK_SECRET` | — | Tap webhook secret for HMAC-SHA256 signature verification |
| `APP_URL` | `http://localhost:5173` | Frontend base URL used for Stripe success/cancel redirects |

### Frontend (`frontend/.env.local`)

| Variable | Default | Description |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8080` | Backend API base URL |
| `VITE_USE_MOCK` | `false` | Use mock data instead of calling the real backend |

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
