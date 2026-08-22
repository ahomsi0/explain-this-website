# Explain This Website

Paste any URL and get an instant analysis report covering SEO, page performance (Google PageSpeed / Lighthouse), UX/conversion signals, tech stack detection, content analysis, and actionable recommendations. Results include an executive summary with scored sub-categories and can be shared via a time-limited public link or exported as a PDF. Signed-in users can compare audits over time and connect API keys or webhooks.

Usage model:
- Anonymous visitors: `5` analyses per day, no account required
- Free accounts: `5` analyses per day plus saved audit history

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
| Frontend | React 19, Vite, TypeScript, Tailwind CSS |
| Backend | Go 1.25+ (stdlib net/http), PostgreSQL (pgx/v5) |
| Auth | JWT (HS256), bcrypt password hashing, email-based password reset |
| Payments | Tap Payments backend (checkout, subscriptions, webhook lifecycle) — wired but currently dormant; Pro is admin-granted while self-serve is paused |
| Email | Resend API |
| Performance | Google PageSpeed Insights API v5 |
| PDF Export | jsPDF + jspdf-autotable |
| Hosting | Vercel (frontend) + Render (backend + Postgres) |

---

## Prerequisites

- **Go 1.25+**
- **Node 20.19+** and **npm**
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

## Privacy and conversion measurement

The frontend has `/privacy` and `/terms` pages and explains analysis boundaries on the landing page. Google Analytics and first-party conversion events are loaded/recorded only after explicit opt-in. Consent enables `landing_view`, `analysis_started`, `analysis_completed`, `analysis_failed`, `signup_completed`, and `repeat_usage` events. First-party events use a signed pseudonymous visitor ID and optional account ID so the admin dashboard can measure the funnel without storing page contents or credentials. Browser storage remains a local convenience for identifying repeat usage before an account exists.

## Testing

Frontend checks run from `frontend/`:

```bash
npm run lint
npm test -- --run
npm run build
npx playwright install chromium       # first browser-test run only
npm run test:e2e
```

Vitest covers utilities, API behavior, and component rendering/interactions. Playwright covers critical browser flows with mocked API responses: landing → analysis → signup, auth errors and password reset, consent behavior, shared reports, history comparison, and analysis cancellation. The backend also has an opt-in HTTP/database integration flow test; set `INTEGRATION_DATABASE_URL` locally to run it. GitHub Actions runs the integration test against a temporary Postgres service plus `go vet ./...` on pushes to `dev` and `main` and pull requests.

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
│       │   ├── billing.go       # Tap checkout + billing + webhook
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
        │   ├── billing/   # GoProPage (orphaned — kept for when self-serve checkout returns)
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
{ "url": "https://example.com", "refresh": false, "deep": false }
```

`refresh: true` bypasses the 10-minute result cache ("Re-run fresh"). `deep: true` additionally audits up to 4 key subpages (/pricing, /about, /contact…) and attaches a `sitePages` rollup with per-page SEO scores.

**Success (200)** — returns a full `AnalysisResult` including `overview`, `techStack`, `seoChecks`, `performance`, `ux`, `pageStats`, `contentStats`, `weakPoints`, `recommendations`.

**Error (400 / 403 / 422 / 429 / 500)**
```json
{ "error": "Your account has been suspended. Please contact support." }
```

#### `GET /api/badge?url=example.com`

Returns an SVG score shield for the URL based on its latest server-side analysis (recent cache entry, else most recent saved audit). Never-analyzed URLs get a neutral badge. Cacheable (`max-age=3600`) — designed for READMEs and site footers:

```html
<a href="https://explain-this-website.vercel.app">
  <img src="https://api.explainthewebsite.com/api/badge?url=example.com" alt="Website audit score" height="20">
</a>
```

#### `POST /api/compare-live`

Requires a session. Runs fresh analyses of two URLs concurrently and returns the same before/after snapshot shape as saved-audit comparison:

```json
{ "yours": "https://yoursite.com", "competitor": "https://rival.com" }
```

Rate-limited to 5 comparisons per minute per user.

#### `GET /api/report/:id`

Returns a previously saved analysis result by its share ID. Active public links expire after 30 days. Private history reports require the owning account or API key.

---

### Auth

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/signup` | Create account |
| `POST` | `/api/auth/login` | Sign in and set an HttpOnly session cookie |
| `POST` | `/api/auth/logout` | Clear the browser session cookie |
| `GET` | `/api/auth/me` | Current user info |
| `POST` | `/api/auth/forgot-password` | Send reset code |
| `POST` | `/api/auth/reset-password` | Submit new password |

The browser session is stored in an HttpOnly cookie. Cross-origin browser calls must use `credentials: include` and an allowed `Origin`.

---

### Audit History

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/audits` | List saved audits for authenticated user |
| `GET` | `/api/audits/compare?a={id}&b={id}` | Compare two saved audits and return metric snapshots |
| `DELETE` | `/api/audits/:id` | Delete an audit |
| `POST` | `/api/audits/:id/revoke-share` | Revoke an audit's public share link |

### Usage, API keys, and webhooks

API-key requests may use `X-API-Key: etw_...` or `Authorization: Api-Key etw_...`. The key secret is returned only once when created.

`POST /api/events` accepts the consent-gated conversion events sent by the frontend. Events are stored with a signed pseudonymous visitor ID and optional account ID for the admin funnel dashboard.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/usage` | Current daily usage summary |
| `GET` | `/api/usage/history` | Last 30 days of analysis and API request activity |
| `GET` | `/api/api-keys` | List API key metadata |
| `POST` | `/api/api-keys` | Create a key: `{ "name": "CI audit bot" }` |
| `DELETE` | `/api/api-keys/:id` | Revoke a key |
| `GET` | `/api/webhooks` | List webhook endpoints |
| `POST` | `/api/webhooks` | Create an endpoint: `{ "url": "https://example.com/hook" }` |
| `DELETE` | `/api/webhooks/:id` | Revoke an endpoint |
| `POST` | `/api/webhooks/:id/test` | Send a signed test event |

Active webhook endpoints receive `analysis.completed` events. Each request includes `X-Explain-Website-Event: analysis.completed` and an HMAC-SHA256 `X-Explain-Website-Signature: sha256=...` header. The signature is calculated over the raw JSON body using the one-time secret returned when the webhook is created. Webhook payloads are versioned with `"version": "1"`.

---

### Billing (Tap Payments — dormant)

These endpoints still exist on the backend but **nothing in the frontend calls them**. Self-serve upgrade is paused while Pro is admin-granted only. The route map is kept here so re-enabling checkout later is just a frontend change.

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/billing/checkout-session` | Create Tap checkout session |
| `POST` | `/api/billing/cancel` | Cancel the current Tap subscription |
| `POST` | `/api/tap/webhook` | Tap subscription lifecycle events |

---

### Admin

All admin routes require the `ADMIN_EMAIL` account to be authenticated.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/admin/overview` | Full dashboard data — users, audits, health, metrics |
| `PATCH` | `/api/admin/users/{id}` | Override plan, suspend/unsuspend, set note |
| `POST` | `/api/admin/user-usage` | Reset or set a user's daily usage count |
| `POST` | `/api/admin/user-plan` | Update a user's plan |
| `POST` | `/api/admin/anon-usage` | Update anonymous visitor usage |
| `POST` | `/api/admin/flag` | Toggle a feature flag |
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
| `TRUSTED_PROXY_CIDRS` | — | Proxy IPs/CIDRs whose `X-Forwarded-For` is trusted. **Set this in production behind a reverse proxy** (Render, Vercel, nginx…) — without it every request shares the proxy's address and per-IP rate limits collapse into one sitewide bucket |
| `FETCH_TIMEOUT_SEC` | `60` | Seconds before aborting a page fetch |
| `MAX_BODY_BYTES` | `5242880` | Max response body size (5 MB) |
| `DATABASE_URL` | — | PostgreSQL connection string. Schema is applied automatically on startup |
| `JWT_SECRET` | — | Secret key for signing JWTs. **Required** for auth to work |
| `ADMIN_EMAIL` | — | Email address that has full admin access to the dashboard |
| `OWNER_EMAIL` | — | Optional email address to receive the owner plan during startup migration |
| `WEBHOOK_ENCRYPTION_KEY` | — | 32-byte hex or base64 key used to encrypt webhook signing secrets at rest |
| `PAGESPEED_API_KEY` | — | Google PageSpeed Insights API key. Without this key, PageSpeed requests are unauthenticated and rate-limited to ~1 QPS |
| `RESEND_API_KEY` | — | Enables email delivery via Resend. Without it, reset codes are logged to stdout only |
| `FROM_EMAIL` | `Explain The Website <onboarding@resend.dev>` | Sender address shown on outbound emails |
| `TAP_SECRET_KEY` | — | Tap Payments secret key. Without this key, billing endpoints return 503. Optional while self-serve checkout is paused |
| `TAP_MONTHLY_PLAN_ID` | — | Tap plan ID for the monthly Pro plan. Optional while self-serve checkout is paused |
| `TAP_YEARLY_PLAN_ID` | — | Tap plan ID for the yearly Pro plan. Optional while self-serve checkout is paused |
| `TAP_WEBHOOK_SECRET` | — | Tap webhook secret for HMAC-SHA256 signature verification. Optional while self-serve checkout is paused |
| `APP_URL` | `http://localhost:5173` | Frontend base URL used for Tap success/cancel redirects |

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
