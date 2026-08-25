package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/ahomsi/explain-website/internal/auth"
	"github.com/ahomsi/explain-website/internal/db"
	"github.com/ahomsi/explain-website/internal/model"
)

type auditListItem struct {
	ID             string     `json:"id"`
	URL            string     `json:"url"`
	Title          string     `json:"title,omitempty"`
	CreatedAt      time.Time  `json:"createdAt"`
	Shareable      bool       `json:"shareable"`
	ShareExpiresAt *time.Time `json:"shareExpiresAt,omitempty"`
	Scores         *auditScores `json:"scores,omitempty"`
}

// auditScores is the per-audit score summary surfaced in list rows so the
// history page can show quality at a glance without loading full reports.
type auditScores struct {
	Overall     *int `json:"overall"`
	SEO         *int `json:"seo"`
	UX          *int `json:"ux"`
	Conversion  *int `json:"conversion"`
	Performance *int `json:"performance"`
}

// auditListPage is the paginated envelope for GET /api/audits?page=….
type auditListPage struct {
	Items []auditListItem `json:"items"`
	Total int             `json:"total"`
	Page  int             `json:"page"`
	Limit int             `json:"limit"`
}

const shareTTL = 30 * 24 * time.Hour

// scoreSummaryFrom unmarshals a stored report and computes its score summary.
// Returns nil for rows whose JSON predates a field or fails to parse — the
// row still renders, just without score chips.
func scoreSummaryFrom(raw []byte) *auditScores {
	var result model.AnalysisResult
	if err := json.Unmarshal(raw, &result); err != nil {
		return nil
	}
	s := comparisonSnapshot("", "", time.Time{}, result)
	return &auditScores{
		Overall:     &s.OverallScore,
		SEO:         &s.SEOScore,
		UX:          &s.UXScore,
		Conversion:  &s.ConversionScore,
		Performance: s.PerformanceScore,
	}
}

// AuditsListHandler returns the authenticated user's audit history.
//
// Without ?page= it keeps the legacy shape (plain array, last 100, no scores)
// that the landing recents merge relies on. With ?page= it returns the full
// paginated envelope with search (q), sort (newest|oldest|score|url), shared
// filter, and a day-window filter — scores are computed from the stored
// reports. Score sorting must load every match (scores live inside JSONB, not
// a column), which is fine at per-user history volumes.
func AuditsListHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !db.IsAvailable() {
			writeJSONError(w, http.StatusServiceUnavailable, "accounts are not enabled on this server")
			return
		}
		uid := auth.UserIDFromContext(r.Context())
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		q := r.URL.Query()
		if q.Get("page") == "" {
			writeJSON(w, http.StatusOK, legacyAuditList(ctx, uid))
			return
		}

		page, _ := strconv.Atoi(q.Get("page"))
		if page < 1 {
			page = 1
		}
		limit, _ := strconv.Atoi(q.Get("limit"))
		if limit < 1 || limit > 50 {
			limit = 20
		}
		search := strings.TrimSpace(q.Get("q"))
		sortBy := q.Get("sort")
		if sortBy != "oldest" && sortBy != "score" && sortBy != "url" {
			sortBy = "newest"
		}
		sharedOnly := q.Get("shared") == "1"
		days, _ := strconv.Atoi(q.Get("days"))

		where := ` WHERE user_id = $1 AND deleted_at IS NULL`
		args := []any{uid}
		if search != "" {
			args = append(args, "%"+search+"%")
			where += fmt.Sprintf(` AND (url ILIKE $%d OR COALESCE(title, '') ILIKE $%d)`, len(args), len(args))
		}
		if sharedOnly {
			where += ` AND is_shareable AND share_revoked_at IS NULL
			           AND share_expires_at IS NOT NULL AND share_expires_at > NOW()`
		}
		if days == 7 || days == 30 {
			args = append(args, days)
			where += fmt.Sprintf(` AND created_at > NOW() - ($%d || ' days')::interval`, len(args))
		}

		if sortBy == "score" {
			writeJSON(w, http.StatusOK, pagedAuditListByScore(ctx, uid, where, args, page, limit))
			return
		}

		order := " ORDER BY created_at DESC"
		if sortBy == "oldest" {
			order = " ORDER BY created_at ASC"
		} else if sortBy == "url" {
			order = " ORDER BY url ASC, created_at DESC"
		}

		var total int
		if err := db.Pool.QueryRow(ctx, `SELECT COUNT(*) FROM audits`+where, args...).Scan(&total); err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not load history")
			return
		}

		args = append(args, limit, (page-1)*limit)
		rows, err := db.Pool.Query(ctx, `
			SELECT id, url, COALESCE(title, ''), created_at,
			        is_shareable AND share_revoked_at IS NULL
			          AND share_expires_at IS NOT NULL AND share_expires_at > NOW(),
			        share_expires_at
			   FROM audits`+where+order+fmt.Sprintf(` LIMIT $%d OFFSET $%d`, len(args)-1, len(args)), args...)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not load history")
			return
		}
		items, ids, scanErr := scanAuditRows(rows)
		if scanErr != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not load history")
			return
		}
		attachScores(ctx, uid, items, ids)
		writeJSON(w, http.StatusOK, auditListPage{Items: items, Total: total, Page: page, Limit: limit})
	}
}

// legacyAuditList keeps the original plain-array response for callers that
// don't paginate (landing recents merge).
func legacyAuditList(ctx context.Context, uid int64) []auditListItem {
	rows, err := db.Pool.Query(ctx, `
		SELECT id, url, COALESCE(title, ''), created_at,
		        is_shareable AND share_revoked_at IS NULL
		          AND share_expires_at IS NOT NULL AND share_expires_at > NOW(),
		        share_expires_at
		   FROM audits
		  WHERE user_id = $1 AND deleted_at IS NULL
		  ORDER BY created_at DESC
		  LIMIT 100`, uid)
	if err != nil {
		return []auditListItem{}
	}
	defer rows.Close()
	items, _, err := scanAuditRows(rows)
	if err != nil {
		return []auditListItem{}
	}
	return items
}

func scanAuditRows(rows interface {
	Next() bool
	Scan(dest ...any) error
	Err() error
	Close()
}) ([]auditListItem, []string, error) {
	defer rows.Close()
	items := []auditListItem{}
	ids := []string{}
	for rows.Next() {
		var a auditListItem
		if err := rows.Scan(&a.ID, &a.URL, &a.Title, &a.CreatedAt, &a.Shareable, &a.ShareExpiresAt); err != nil {
			return nil, nil, err
		}
		items = append(items, a)
		ids = append(ids, a.ID)
	}
	if err := rows.Err(); err != nil {
		return nil, nil, err
	}
	return items, ids, nil
}

// attachScores fills the score summary for each listed row with one batched
// query. Failures are silent — rows render without chips.
func attachScores(ctx context.Context, uid int64, items []auditListItem, ids []string) {
	if len(ids) == 0 {
		return
	}
	rows, err := db.Pool.Query(ctx,
		`SELECT id, result FROM audits WHERE user_id = $1 AND id = ANY($2)`, uid, ids)
	if err != nil {
		return
	}
	defer rows.Close()
	byID := map[string][]byte{}
	for rows.Next() {
		var id string
		var raw []byte
		if err := rows.Scan(&id, &raw); err == nil {
			byID[id] = raw
		}
	}
	for i := range items {
		if raw, ok := byID[items[i].ID]; ok {
			items[i].Scores = scoreSummaryFrom(raw)
		}
	}
}

// pagedAuditListByScore uses a two-pass approach to avoid loading all JSONB
// data into memory at once.  Pass 1 fetches only id+result to compute scores
// (no LIMIT — scores live inside JSONB and cannot be pushed to the DB).
// Pass 2 fetches the full row data for just the page slice by ID, then
// re-sorts to restore the score order (ANY($1) does not preserve order).
func pagedAuditListByScore(ctx context.Context, uid int64, where string, args []any, page, limit int) auditListPage {
	// Pass 1: id + result only — no full-row columns, no LIMIT.
	rows, err := db.Pool.Query(ctx, `SELECT id, result FROM audits`+where, args...)
	if err != nil {
		return auditListPage{Items: []auditListItem{}, Page: page, Limit: limit}
	}
	type scored struct {
		id    string
		score int
	}
	all := []scored{}
	for rows.Next() {
		var id string
		var raw []byte
		if err := rows.Scan(&id, &raw); err != nil {
			continue
		}
		s := 0
		if scores := scoreSummaryFrom(raw); scores != nil && scores.Overall != nil {
			s = *scores.Overall
		}
		all = append(all, scored{id: id, score: s})
	}
	rows.Close()
	sort.SliceStable(all, func(i, j int) bool { return all[i].score > all[j].score })

	total := len(all)
	start := (page - 1) * limit
	if start >= total {
		start = total
	}
	end := start + limit
	if end > total {
		end = total
	}
	pageIDs := make([]string, 0, end-start)
	scoreByID := map[string]int{}
	for _, s := range all[start:end] {
		pageIDs = append(pageIDs, s.id)
		scoreByID[s.id] = s.score
	}
	if len(pageIDs) == 0 {
		return auditListPage{Items: []auditListItem{}, Total: total, Page: page, Limit: limit}
	}

	// Pass 2: fetch full row data for only this page's IDs.
	rows2, err := db.Pool.Query(ctx, `
		SELECT id, url, COALESCE(title, ''), created_at,
		       is_shareable AND share_revoked_at IS NULL
		         AND share_expires_at IS NOT NULL AND share_expires_at > NOW(),
		       share_expires_at
		  FROM audits
		 WHERE id = ANY($1) AND user_id = $2`, pageIDs, uid)
	if err != nil {
		return auditListPage{Items: []auditListItem{}, Total: total, Page: page, Limit: limit}
	}
	items, ids, scanErr := scanAuditRows(rows2)
	if scanErr != nil {
		return auditListPage{Items: []auditListItem{}, Total: total, Page: page, Limit: limit}
	}
	attachScores(ctx, uid, items, ids)

	// Re-sort to match the score order (ANY($1) does not preserve order).
	sort.SliceStable(items, func(i, j int) bool {
		return scoreByID[items[i].ID] > scoreByID[items[j].ID]
	})

	return auditListPage{Items: items, Total: total, Page: page, Limit: limit}
}

// AuditsClearHandler deletes ALL audits owned by the authenticated user.
func AuditsClearHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !db.IsAvailable() {
			writeJSONError(w, http.StatusServiceUnavailable, "accounts are not enabled on this server")
			return
		}
		uid := auth.UserIDFromContext(r.Context())
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()
		// Soft-delete so the analyses still count toward operational metrics
		// (admin Recent Audits, Top URLs, Audits-by-Day) — the user just no
		// longer sees them in their own history.
		_, err := db.Pool.Exec(ctx, `UPDATE audits SET deleted_at = NOW() WHERE user_id = $1 AND deleted_at IS NULL`, uid)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not clear history")
			return
		}
		globalStore.removeUser(uid)
		w.WriteHeader(http.StatusNoContent)
	}
}

// AuditDeleteHandler deletes an audit owned by the authenticated user.
func AuditDeleteHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !db.IsAvailable() {
			writeJSONError(w, http.StatusServiceUnavailable, "accounts are not enabled on this server")
			return
		}
		uid := auth.UserIDFromContext(r.Context())
		id := r.PathValue("id")
		if id == "" {
			writeJSONError(w, http.StatusBadRequest, "missing id")
			return
		}
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()
		// Soft-delete: keep the row for admin metrics, hide from the user.
		tag, err := db.Pool.Exec(ctx,
			`UPDATE audits SET deleted_at = NOW() WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`, id, uid)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not delete")
			return
		}
		if tag.RowsAffected() == 0 {
			writeJSONError(w, http.StatusNotFound, "audit not found")
			return
		}
		globalStore.remove(id)
		w.WriteHeader(http.StatusNoContent)
	}
}

// AuditRevokeShareHandler disables a public link without deleting the user's
// private history record.
func AuditRevokeShareHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !db.IsAvailable() {
			writeJSONError(w, http.StatusServiceUnavailable, "accounts are not enabled on this server")
			return
		}
		id := r.PathValue("id")
		uid := auth.UserIDFromContext(r.Context())
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()
		result, err := db.Pool.Exec(ctx,
			`UPDATE audits SET share_revoked_at = NOW() WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL`, id, uid)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not revoke share link")
			return
		}
		if result.RowsAffected() == 0 {
			writeJSONError(w, http.StatusNotFound, "audit not found")
			return
		}
		globalStore.remove(id)
		w.WriteHeader(http.StatusNoContent)
	}
}

// saveAuditForUser persists an analysis result to the DB linked to a user.
// Best-effort: errors are logged but not returned to the caller, since the analysis
// itself succeeded and the user shouldn't see a failure.
func saveAuditForUser(ctx context.Context, userID int64, id string, result model.AnalysisResult, shareable bool, durationMs int, perfAvailable bool) {
	if !db.IsAvailable() || userID == 0 {
		return
	}
	resultJSON, err := json.Marshal(result)
	if err != nil {
		return
	}
	title := result.Overview.Title
	insertCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	var shareExpiresAt any
	if shareable {
		shareExpiresAt = time.Now().UTC().Add(shareTTL)
	}
	_, _ = db.Pool.Exec(insertCtx,
		`INSERT INTO audits (id, user_id, url, title, result, is_shareable, share_expires_at, duration_ms, perf_available)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		 ON CONFLICT (id) DO NOTHING`,
		id, userID, result.URL, title, resultJSON, shareable, shareExpiresAt, durationMs, perfAvailable,
	)
}
