// Package auth handles password hashing, JWT issuance/verification, and the
// authentication middleware that pulls the user ID off Authorization headers.
package auth

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type ctxKey string

const userIDKey ctxKey = "userID"

// tokenTTL is how long an issued JWT remains valid. 30 days = "stay logged in".
const tokenTTL = 30 * 24 * time.Hour

// jwtSecret is the HMAC signing key. Falls back to a hardcoded dev value when JWT_SECRET
// is unset so local development "just works" — production MUST set the env var.
func jwtSecret() []byte {
	s := os.Getenv("JWT_SECRET")
	if s == "" {
		return []byte("dev-secret-do-not-use-in-prod")
	}
	return []byte(s)
}

// HashPassword bcrypts a plaintext password.
func HashPassword(plain string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(b), nil
}

// CheckPassword returns nil if the plaintext matches the stored hash.
func CheckPassword(hash, plain string) error {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(plain))
}

// IssueToken creates a signed JWT for the given user ID.
func IssueToken(userID int64) (string, error) {
	claims := jwt.MapClaims{
		"sub": userID,
		"iat": time.Now().Unix(),
		"exp": time.Now().Add(tokenTTL).Unix(),
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return tok.SignedString(jwtSecret())
}

// ParseToken validates a JWT and returns the user ID embedded in `sub`.
func ParseToken(raw string) (int64, error) {
	tok, err := jwt.Parse(raw, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return jwtSecret(), nil
	})
	if err != nil {
		return 0, err
	}
	claims, ok := tok.Claims.(jwt.MapClaims)
	if !ok || !tok.Valid {
		return 0, errors.New("invalid token")
	}
	sub, ok := claims["sub"].(float64) // numbers in JSON arrive as float64
	if !ok {
		return 0, errors.New("missing sub")
	}
	return int64(sub), nil
}

// Middleware extracts an "Authorization: Bearer <jwt>" header (if present) and stuffs the
// user ID into the request context. Missing/invalid tokens are NOT rejected — handlers
// decide whether they require auth via UserIDFromContext.
func Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		header := r.Header.Get("Authorization")
		if strings.HasPrefix(header, "Bearer ") {
			raw := strings.TrimPrefix(header, "Bearer ")
			if uid, err := ParseToken(raw); err == nil {
				ctx := context.WithValue(r.Context(), userIDKey, uid)
				r = r.WithContext(ctx)
			}
		}
		next.ServeHTTP(w, r)
	})
}

// UserIDFromContext returns the authenticated user ID, or 0 if anonymous.
func UserIDFromContext(ctx context.Context) int64 {
	if v, ok := ctx.Value(userIDKey).(int64); ok {
		return v
	}
	return 0
}

// RequireAuth returns 401 if the request has no valid user, otherwise calls next.
func RequireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if UserIDFromContext(r.Context()) == 0 {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusUnauthorized)
			w.Write([]byte(`{"error":"authentication required"}`))
			return
		}
		next(w, r)
	}
}
