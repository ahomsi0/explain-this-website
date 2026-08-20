package handler

import (
	"context"
	"encoding/json"
	"net/http"
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
}

const shareTTL = 30 * 24 * time.Hour

// AuditsListHandler returns the authenticated user's audit history.
func AuditsListHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !db.IsAvailable() {
			writeJSONError(w, http.StatusServiceUnavailable, "accounts are not enabled on this server")
			return
		}
		uid := auth.UserIDFromContext(r.Context())
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		rows, err := db.Pool.Query(ctx,
			`SELECT id, url, COALESCE(title, ''), created_at,
				        is_shareable AND share_revoked_at IS NULL
				          AND share_expires_at IS NOT NULL AND share_expires_at > NOW(),
			        share_expires_at
			   FROM audits
			  WHERE user_id = $1 AND deleted_at IS NULL
			  ORDER BY created_at DESC
			  LIMIT 100`, uid)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not load history")
			return
		}
		defer rows.Close()

		out := []auditListItem{}
		for rows.Next() {
			var a auditListItem
			if err := rows.Scan(&a.ID, &a.URL, &a.Title, &a.CreatedAt, &a.Shareable, &a.ShareExpiresAt); err != nil {
				writeJSONError(w, http.StatusInternalServerError, "could not load history")
				return
			}
			out = append(out, a)
		}
		if err := rows.Err(); err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not load history")
			return
		}
		writeJSON(w, http.StatusOK, out)
	}
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
