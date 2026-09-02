package handler

import (
	"context"
	"net/http"
	"time"

	"github.com/ahomsi/explain-website/internal/auth"
	"github.com/ahomsi/explain-website/internal/db"
)

// DeleteAccountHandler permanently deletes the authenticated user and all their data.
// Cascading FK constraints in the schema handle associated rows (audits, api_keys, etc.).
func DeleteAccountHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !db.IsAvailable() {
			writeJSONError(w, http.StatusServiceUnavailable, "accounts are not enabled on this server")
			return
		}
		uid := auth.UserIDFromContext(r.Context())
		if uid == 0 {
			writeJSONError(w, http.StatusUnauthorized, "not authenticated")
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
		defer cancel()

		tag, err := db.Pool.Exec(ctx, `DELETE FROM users WHERE id = $1`, uid)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not delete account")
			return
		}
		if tag.RowsAffected() == 0 {
			writeJSONError(w, http.StatusNotFound, "user not found")
			return
		}

		auth.ClearSessionCookie(w, r)
		w.WriteHeader(http.StatusNoContent)
	}
}
