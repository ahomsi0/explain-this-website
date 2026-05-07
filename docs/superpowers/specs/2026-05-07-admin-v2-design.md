# Admin Dashboard V2 — Design Spec

## Goal
Restructure the admin dashboard into three focused tabs and add user management (plan override, suspend, admin notes) plus two new operational metric cards (slow analyses, audit outcomes).

## Architecture
Three-tab admin dashboard. Existing cards are sorted into tabs — no cards are removed. Two new metric cards are added to the Metrics tab. User management actions are added inline to the user table rows. Backend gets one new admin PATCH endpoint and two new DB columns on `users`, plus two new columns on `audits`.

## Tech Stack
React 18 + TypeScript + Tailwind CSS (frontend), Go + PostgreSQL/pgx (backend). No new dependencies.

---

## Section 1: Tab Structure

`AdminDashboard.tsx` gains a tab bar with three tabs: **Users**, **Metrics**, **System**.

| Tab | Cards |
|-----|-------|
| Users | User list (with new management actions) |
| Metrics | BusinessMetricsRow, AuditsChartCard, TopUrlsCard, RecentAuditsCard, SlowAnalysesCard (new), AuditOutcomesCard (new) |
| System | SystemHealthCard, FailureLogCard, Feature flags toggle |

Default tab on load: **Users**.

Tab state is local component state (`useState`) — no URL routing change needed.

---

## Section 2: User Management

### UI (AdminDashboard.tsx)

Each user row gets three new inline controls appended after the existing Reset Usage button:

1. **Plan toggle** — small pill button showing current plan (`Free` / `Pro`). Clicking immediately calls `PATCH /api/admin/users/:id` with `{ plan: "pro" }` or `{ plan: "free" }` and updates the row optimistically. No confirmation dialog needed (reversible).

2. **Suspend toggle** — button labeled "Suspend" (grey) or "Unsuspend" (red). When a user is suspended the row shows a red "Suspended" badge next to their email. Calls `PATCH /api/admin/users/:id` with `{ suspended: true/false }`.

3. **Note icon button** — pencil/note icon. Filled/violet when a note exists, dim grey when empty. Opens a modal with:
   - Textarea pre-filled with existing note (if any)
   - Save button → `PATCH /api/admin/users/:id` with `{ note: "..." }`
   - Clear button → saves empty string (removes note)
   - Closes on Save, Cancel, or outside click

### Backend

**DB migration** (added to `schema` in `db/db.go`):
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS admin_note   TEXT;
```

**New endpoint**: `PATCH /api/admin/users/:id`
- Admin-auth protected (same middleware as existing admin routes)
- Body: `{ plan?: "free"|"pro", suspended?: bool, note?: string }`
- Updates only the fields present in the body
- `suspended: true` → sets `suspended_at = NOW()`, `suspended: false` → sets `suspended_at = NULL`
- Returns `204 No Content` on success

**Analyze handler** (usage.go or analyze handler):
- Before running analysis, check `suspended_at IS NOT NULL` for authenticated users
- Return `HTTP 403` with message: `"Your account has been suspended. Please contact support."`

**Admin overview** (admin.go): include `suspended_at` and `admin_note` in `adminUserRow` so the frontend can render the badge and pre-fill the note modal without an extra fetch.

---

## Section 3: Operational Metrics

### Two new cards in AdminInsightsCards.tsx

**SlowAnalysesCard**
- Shows the 10 slowest audits in the last 30 days
- Columns: URL (truncated hostname), duration (e.g. "42s"), time ago
- Data comes from new `slowAudits` field on the admin overview response
- Empty state: "No slow analyses recorded yet."

**AuditOutcomesCard**
- Shows a 14-day breakdown: date, total audits, PageSpeed available count, PageSpeed failed count, success rate %
- Rendered as a simple table (date rows, newest first)
- Summary row at top: overall success rate across the 14 days
- Data comes from new `auditOutcomes` field on admin overview response
- Empty state: "No audit data yet."

### Backend

**DB migration**:
```sql
ALTER TABLE audits ADD COLUMN IF NOT EXISTS duration_ms   INTEGER;
ALTER TABLE audits ADD COLUMN IF NOT EXISTS perf_available BOOLEAN NOT NULL DEFAULT TRUE;
```

**Analyze handler** (handler/analyze.go or equivalent):
- Record `start := time.Now()` before `parser.Parse()`
- After parse, compute `durationMs := int(time.Since(start).Milliseconds())`
- Pass `durationMs` and `perfAvailable` (= `result.Performance != nil && result.Performance.Available`) to `saveAuditForUser`
- Update `saveAuditForUser` signature to accept and INSERT these two values

**Admin overview endpoint** — two new fields:

`slowAudits []slowAuditRow` — top 10 by duration_ms in last 30 days:
```sql
SELECT url, duration_ms, created_at
FROM audits
WHERE duration_ms IS NOT NULL AND deleted_at IS NULL
  AND created_at > NOW() - INTERVAL '30 days'
ORDER BY duration_ms DESC
LIMIT 10
```

`auditOutcomes []auditOutcomeRow` — 14-day daily breakdown:
```sql
SELECT
  DATE(created_at) AS date,
  COUNT(*)         AS total,
  SUM(CASE WHEN perf_available THEN 1 ELSE 0 END) AS perf_ok,
  SUM(CASE WHEN NOT perf_available THEN 1 ELSE 0 END) AS perf_fail
FROM audits
WHERE deleted_at IS NULL
  AND created_at > NOW() - INTERVAL '14 days'
GROUP BY DATE(created_at)
ORDER BY date DESC
```

---

## Error Handling

- Plan/suspend/note PATCH failures: show inline error text below the user row, auto-clear after 4 seconds
- Slow analyses / outcome queries: if empty, show placeholder cards (not errors)
- Suspended user hitting analyze: clear 403 message, same style as rate-limit error

## Out of Scope
- Email notifications to suspended users
- Audit history for admin notes (last note only)
- Revenue / Stripe metrics
- User impersonation
