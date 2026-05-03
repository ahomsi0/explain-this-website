package handler

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/mail"
	"strings"
	"time"

	"github.com/ahomsi/explain-website/internal/auth"
	"github.com/ahomsi/explain-website/internal/db"
	"github.com/jackc/pgx/v5"
)

type authReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type authResp struct {
	Token string  `json:"token"`
	User  userOut `json:"user"`
}

type userOut struct {
	ID        int64     `json:"id"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"createdAt"`
}

func writeJSONError(w http.ResponseWriter, status int, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]string{"error": msg})
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

func parseAuthReq(r *http.Request) (authReq, error) {
	var body authReq
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		return body, errors.New("invalid request body")
	}
	body.Email = strings.ToLower(strings.TrimSpace(body.Email))
	if _, err := mail.ParseAddress(body.Email); err != nil {
		return body, errors.New("please enter a valid email address")
	}
	if len(body.Password) < 8 {
		return body, errors.New("password must be at least 8 characters")
	}
	return body, nil
}

// SignupHandler creates a new user account.
func SignupHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !db.IsAvailable() {
			writeJSONError(w, http.StatusServiceUnavailable, "accounts are not enabled on this server")
			return
		}
		body, err := parseAuthReq(r)
		if err != nil {
			writeJSONError(w, http.StatusBadRequest, err.Error())
			return
		}

		hash, err := auth.HashPassword(body.Password)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not create account")
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		var u userOut
		err = db.Pool.QueryRow(ctx,
			`INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at`,
			body.Email, hash,
		).Scan(&u.ID, &u.Email, &u.CreatedAt)
		if err != nil {
			// 23505 = unique_violation
			if strings.Contains(err.Error(), "23505") || strings.Contains(err.Error(), "duplicate") {
				writeJSONError(w, http.StatusConflict, "an account with this email already exists")
				return
			}
			writeJSONError(w, http.StatusInternalServerError, "could not create account")
			return
		}

		token, err := auth.IssueToken(u.ID)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not issue token")
			return
		}
		writeJSON(w, http.StatusOK, authResp{Token: token, User: u})
	}
}

// LoginHandler authenticates a user and returns a JWT.
func LoginHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !db.IsAvailable() {
			writeJSONError(w, http.StatusServiceUnavailable, "accounts are not enabled on this server")
			return
		}
		body, err := parseAuthReq(r)
		if err != nil {
			writeJSONError(w, http.StatusBadRequest, err.Error())
			return
		}

		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()

		var u userOut
		var hash string
		err = db.Pool.QueryRow(ctx,
			`SELECT id, email, created_at, password_hash FROM users WHERE email = $1`,
			body.Email,
		).Scan(&u.ID, &u.Email, &u.CreatedAt, &hash)
		if err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				writeJSONError(w, http.StatusUnauthorized, "incorrect email or password")
				return
			}
			writeJSONError(w, http.StatusInternalServerError, "login failed")
			return
		}
		if err := auth.CheckPassword(hash, body.Password); err != nil {
			writeJSONError(w, http.StatusUnauthorized, "incorrect email or password")
			return
		}
		token, err := auth.IssueToken(u.ID)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not issue token")
			return
		}
		writeJSON(w, http.StatusOK, authResp{Token: token, User: u})
	}
}

// MeHandler returns the current user (requires auth).
func MeHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		uid := auth.UserIDFromContext(r.Context())
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()
		var u userOut
		err := db.Pool.QueryRow(ctx,
			`SELECT id, email, created_at FROM users WHERE id = $1`, uid,
		).Scan(&u.ID, &u.Email, &u.CreatedAt)
		if err != nil {
			writeJSONError(w, http.StatusUnauthorized, "user not found")
			return
		}
		writeJSON(w, http.StatusOK, u)
	}
}
