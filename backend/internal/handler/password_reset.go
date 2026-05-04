package handler

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"errors"
	"log"
	"math/big"
	"net/http"
	"net/mail"
	"strings"
	"time"

	"github.com/ahomsi/explain-website/internal/auth"
	"github.com/ahomsi/explain-website/internal/db"
	"github.com/ahomsi/explain-website/internal/email"
	"github.com/jackc/pgx/v5"
)

const resetCodeTTL = 35 * time.Minute

type forgotReq struct {
	Email string `json:"email"`
}

type resetReq struct {
	Email       string `json:"email"`
	Code        string `json:"code"`
	NewPassword string `json:"newPassword"`
}

// generateResetCode returns a 6-digit numeric code as a zero-padded string.
func generateResetCode() (string, error) {
	max := big.NewInt(1_000_000)
	n, err := rand.Int(rand.Reader, max)
	if err != nil {
		return "", err
	}
	// Zero-pad to 6 digits.
	s := n.String()
	for len(s) < 6 {
		s = "0" + s
	}
	return s, nil
}

// ForgotPasswordHandler accepts an email, and if it matches a user, generates
// a reset code, stores its bcrypt hash, and emails the plaintext code to the user.
// To avoid leaking which emails are registered, ALWAYS responds 200.
//
// Important: we run the reset flow inline instead of in a background goroutine.
// Some production runtimes can drop post-response work, which makes password
// reset email delivery look flaky even though the endpoint returned success.
func ForgotPasswordHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !db.IsAvailable() {
			writeJSONError(w, http.StatusServiceUnavailable, "accounts are not enabled on this server")
			return
		}
		var body forgotReq
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeJSONError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		body.Email = strings.ToLower(strings.TrimSpace(body.Email))
		if _, err := mail.ParseAddress(body.Email); err != nil {
			writeJSONError(w, http.StatusBadRequest, "please enter a valid email address")
			return
		}

		// Always respond success regardless of whether the email is registered.
		// This prevents email enumeration attacks. We still perform the work
		// before responding so email delivery is reliable in production.
		issueResetCode(body.Email)

		writeJSON(w, http.StatusOK, map[string]any{
			"ok":      true,
			"message": "If an account exists for that email, a reset code has been sent.",
		})
	}
}

// issueResetCode creates and delivers a reset code when the account exists.
// It is intentionally best-effort and logs failures rather than returning them
// to the caller so the public endpoint can keep a uniform response.
func issueResetCode(emailAddr string) {
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	var userID int64
	err := db.Pool.QueryRow(ctx, `SELECT id FROM users WHERE email = $1`, emailAddr).Scan(&userID)
	if err != nil {
		log.Printf("[reset] no user for email=%s", emailAddr)
		return
	}

	code, err := generateResetCode()
	if err != nil {
		log.Printf("[reset] gen code err: %v", err)
		return
	}
	hash, err := auth.HashPassword(code)
	if err != nil {
		log.Printf("[reset] hash err: %v", err)
		return
	}
	expires := time.Now().Add(resetCodeTTL)

	if _, err := db.Pool.Exec(ctx,
		`UPDATE password_resets SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL`, userID); err != nil {
		log.Printf("[reset] invalidate prior codes err: %v", err)
		return
	}
	if _, err := db.Pool.Exec(ctx,
		`INSERT INTO password_resets (user_id, code_hash, expires_at) VALUES ($1, $2, $3)`,
		userID, hash, expires); err != nil {
		log.Printf("[reset] insert code err: %v", err)
		return
	}

	log.Printf("[reset] code issued for email=%s userID=%d — sending email…", emailAddr, userID)
	if err := email.SendResetCode(ctx, emailAddr, code); err != nil {
		log.Printf("[reset] send email FAILED for %s: %v (code was: %s)", emailAddr, err, code)
		return
	}
	log.Printf("[reset] email send ok for %s", emailAddr)
}

// ResetPasswordHandler verifies a reset code and sets a new password.
func ResetPasswordHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !db.IsAvailable() {
			writeJSONError(w, http.StatusServiceUnavailable, "accounts are not enabled on this server")
			return
		}
		var body resetReq
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			writeJSONError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		body.Email = strings.ToLower(strings.TrimSpace(body.Email))
		body.Code = strings.TrimSpace(body.Code)
		if _, err := mail.ParseAddress(body.Email); err != nil {
			writeJSONError(w, http.StatusBadRequest, "please enter a valid email address")
			return
		}
		if len(body.Code) != 6 {
			writeJSONError(w, http.StatusBadRequest, "reset code must be 6 digits")
			return
		}
		if len(body.NewPassword) < 8 {
			writeJSONError(w, http.StatusBadRequest, "password must be at least 8 characters")
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		var userID int64
		err := db.Pool.QueryRow(ctx, `SELECT id FROM users WHERE email = $1`, body.Email).Scan(&userID)
		if err != nil {
			writeJSONError(w, http.StatusBadRequest, "invalid or expired code")
			return
		}

		// Find the most recent unused, unexpired code for this user.
		var prID int64
		var codeHash string
		err = db.Pool.QueryRow(ctx,
			`SELECT id, code_hash FROM password_resets
			  WHERE user_id = $1 AND used_at IS NULL AND expires_at > NOW()
			  ORDER BY created_at DESC LIMIT 1`, userID,
		).Scan(&prID, &codeHash)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				writeJSONError(w, http.StatusBadRequest, "invalid or expired code")
				return
			}
			writeJSONError(w, http.StatusInternalServerError, "could not reset password")
			return
		}

		if err := auth.CheckPassword(codeHash, body.Code); err != nil {
			writeJSONError(w, http.StatusBadRequest, "invalid or expired code")
			return
		}

		newHash, err := auth.HashPassword(body.NewPassword)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not reset password")
			return
		}

		// Update password + mark code as used in a single transaction.
		tx, err := db.Pool.Begin(ctx)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not reset password")
			return
		}
		defer tx.Rollback(ctx)

		if _, err := tx.Exec(ctx, `UPDATE users SET password_hash = $1 WHERE id = $2`, newHash, userID); err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not reset password")
			return
		}
		if _, err := tx.Exec(ctx, `UPDATE password_resets SET used_at = NOW() WHERE id = $1`, prID); err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not reset password")
			return
		}
		if err := tx.Commit(ctx); err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not reset password")
			return
		}

		// Issue a fresh JWT so the user is logged in immediately after reset.
		token, err := auth.IssueToken(userID)
		if err != nil {
			writeJSON(w, http.StatusOK, map[string]any{"ok": true})
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{
			"ok":    true,
			"token": token,
		})
	}
}
