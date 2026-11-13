package handler

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/ahomsi/explain-website/internal/auth"
	"github.com/ahomsi/explain-website/internal/db"
	"github.com/ahomsi/explain-website/internal/email"
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
			writeJSONError(w, http.StatusBadRequest, "This link has expired. Sign in and ask for a new one.")
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

// resendCooldown is the minimum gap between verification emails to one
// account. It is read from the newest token row, so it holds across restarts.
const resendCooldown = time.Minute

// verifyURLFor builds the link sent in verification emails.
func verifyURLFor(token string) string {
	appURL := os.Getenv("APP_URL")
	if appURL == "" {
		appURL = "https://www.explainthiswebsite.com"
	}
	return appURL + "/verify-email?token=" + token
}

// ResendVerificationHandler sends a fresh verification link to the signed-in
// user. The signup email is best-effort and its link expires after 24 hours,
// so without this a lost or expired email left no way to verify.
//
// Unlike signup, a failed send is reported: the user asked for an email, so
// "sent" must mean it was handed to the mail provider.
func ResendVerificationHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !db.IsAvailable() {
			writeJSONError(w, http.StatusServiceUnavailable, "accounts are not enabled on this server")
			return
		}
		uid := auth.UserIDFromContext(r.Context())
		ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
		defer cancel()

		var emailAddr string
		var verifiedAt *time.Time
		var lastSentAt *time.Time
		err := db.Pool.QueryRow(ctx,
			`SELECT u.email, u.email_verified_at,
			        (SELECT MAX(created_at) FROM email_verifications WHERE user_id = u.id)
			   FROM users u
			  WHERE u.id = $1`, uid,
		).Scan(&emailAddr, &verifiedAt, &lastSentAt)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not load your account")
			return
		}
		if verifiedAt != nil {
			writeJSON(w, http.StatusOK, map[string]string{"status": "verified"})
			return
		}
		if lastSentAt != nil && time.Since(*lastSentAt) < resendCooldown {
			w.Header().Set("Retry-After", "60")
			writeJSONError(w, http.StatusTooManyRequests, "We sent a link a moment ago. Please wait a minute before asking for another.")
			return
		}

		token, err := issueVerificationToken(ctx, uid)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not create a verification link")
			return
		}
		if err := email.SendVerifyEmail(ctx, emailAddr, verifyURLFor(token)); err != nil {
			log.Printf("resend verification: email not sent for user %d: %v", uid, err)
			writeJSONError(w, http.StatusBadGateway, "We could not send the email right now. Please try again later.")
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "sent"})
	}
}
