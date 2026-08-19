// Package auth handles password hashing, JWT issuance/verification, and the
// authentication middleware that pulls the user ID off Authorization headers.
package auth

import (
	"context"
	"errors"
	"fmt"
	"math"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type ctxKey string

const userIDKey ctxKey = "userID"
const tokenIssuedAtKey ctxKey = "tokenIssuedAt"

// tokenTTL is how long an issued JWT remains valid. 30 days = "stay logged in".
const tokenTTL = 30 * 24 * time.Hour

// jwtSecret returns the HMAC signing key. Authentication must fail closed when
// the secret is missing; a predictable fallback would let anyone forge tokens.
func jwtSecret() ([]byte, error) {
	s := strings.TrimSpace(os.Getenv("JWT_SECRET"))
	if s == "" {
		return nil, errors.New("JWT_SECRET is not configured")
	}
	return []byte(s), nil
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
	secret, err := jwtSecret()
	if err != nil {
		return "", err
	}
	claims := jwt.MapClaims{
		"sub": userID,
		"iat": time.Now().Unix(),
		"exp": time.Now().Add(tokenTTL).Unix(),
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return tok.SignedString(secret)
}

// ParseTokenDetails validates a JWT and returns its user ID and issued-at time.
// The issued-at time is used to invalidate tokens created before a password change.
func ParseTokenDetails(raw string) (int64, time.Time, error) {
	tok, err := jwt.Parse(raw, func(t *jwt.Token) (interface{}, error) {
		if t.Method != jwt.SigningMethodHS256 {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return jwtSecret()
	})
	if err != nil {
		return 0, time.Time{}, err
	}
	claims, ok := tok.Claims.(jwt.MapClaims)
	if !ok || !tok.Valid {
		return 0, time.Time{}, errors.New("invalid token")
	}
	sub, ok := claims["sub"].(float64) // numbers in JSON arrive as float64
	if !ok || sub <= 0 || math.Trunc(sub) != sub || sub >= float64(1<<63) {
		return 0, time.Time{}, errors.New("invalid sub")
	}

	issuedAt := time.Time{}
	if value, ok := claims["iat"].(float64); ok && value > 0 && math.Trunc(value) == value && value < float64(1<<63) {
		issuedAt = time.Unix(int64(value), 0)
	}
	return int64(sub), issuedAt, nil
}

// ParseToken validates a JWT and returns the user ID embedded in `sub`.
func ParseToken(raw string) (int64, error) {
	uid, _, err := ParseTokenDetails(raw)
	return uid, err
}

// Middleware extracts an "Authorization: Bearer <jwt>" header (if present) and stuffs the
// user ID into the request context. Missing/invalid tokens are NOT rejected — handlers
// decide whether they require auth via UserIDFromContext.
func Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		header := r.Header.Get("Authorization")
		if strings.HasPrefix(header, "Bearer ") {
			raw := strings.TrimPrefix(header, "Bearer ")
			if uid, issuedAt, err := ParseTokenDetails(raw); err == nil {
				ctx := context.WithValue(r.Context(), userIDKey, uid)
				ctx = context.WithValue(ctx, tokenIssuedAtKey, issuedAt)
				r = r.WithContext(ctx)
			}
		}
		next.ServeHTTP(w, r)
	})
}

// TokenIssuedAtFromContext returns the authenticated token's issue time, or zero
// when the request is anonymous or the token did not carry an iat claim.
func TokenIssuedAtFromContext(ctx context.Context) time.Time {
	if v, ok := ctx.Value(tokenIssuedAtKey).(time.Time); ok {
		return v
	}
	return time.Time{}
}

// ClearAuthentication removes authentication established by Middleware while
// preserving the rest of the request context.
func ClearAuthentication(ctx context.Context) context.Context {
	ctx = context.WithValue(ctx, userIDKey, int64(0))
	return context.WithValue(ctx, tokenIssuedAtKey, time.Time{})
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
