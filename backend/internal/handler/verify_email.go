package handler

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"time"

	"github.com/ahomsi/explain-website/internal/db"
	"github.com/jackc/pgx/v5"
)

// VerifyEmailHandler marks an account as verified when the user clicks the
// link from their signup email. Token is a 64-char hex string passed as ?token=.
func VerifyEmailHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := r.URL.Query().Get("token")
		if len(token) != 64 {
			writeJSONError(w, http.StatusBadRequest, "invalid or missing token")
			return
		}

		sum := sha256.Sum256([]byte(token))
		hashHex := hex.EncodeToString(sum[:])

		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		var verificationID int64
		var userID int64
		var usedAt *time.Time
		var expiresAt time.Time
		err := db.Pool.QueryRow(ctx,
			`SELECT id, user_id, used_at, expires_at
			   FROM email_verifications
			  WHERE token_hash = $1`,
			hashHex,
		).Scan(&verificationID, &userID, &usedAt, &expiresAt)
		if err != nil {
			if err == pgx.ErrNoRows {
				writeJSONError(w, http.StatusBadRequest, "invalid or expired token")
				return
			}
			writeJSONError(w, http.StatusInternalServerError, "could not verify email")
			return
		}
		if usedAt != nil {
			writeJSON(w, http.StatusOK, map[string]string{"message": "email already verified"})
			return
		}
		if time.Now().After(expiresAt) {
			writeJSONError(w, http.StatusBadRequest, "token has expired — please sign up again")
			return
		}

		_, err = db.Pool.Exec(ctx,
			`UPDATE email_verifications SET used_at = NOW() WHERE id = $1`,
			verificationID,
		)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not verify email")
			return
		}
		_, err = db.Pool.Exec(ctx,
			`UPDATE users SET email_verified_at = NOW() WHERE id = $1`,
			userID,
		)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not verify email")
			return
		}

		writeJSON(w, http.StatusOK, map[string]string{"message": "email verified"})
	}
}
