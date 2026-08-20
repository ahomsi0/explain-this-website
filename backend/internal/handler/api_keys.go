package handler

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/ahomsi/explain-website/internal/auth"
	"github.com/ahomsi/explain-website/internal/db"
)

const maxAPIKeysPerUser = 10

type apiKeyListItem struct {
	ID            string     `json:"id"`
	Name          string     `json:"name"`
	Prefix        string     `json:"prefix"`
	CreatedAt     time.Time  `json:"createdAt"`
	LastUsedAt    *time.Time `json:"lastUsedAt,omitempty"`
	RevokedAt     *time.Time `json:"revokedAt,omitempty"`
	TodayRequests int        `json:"todayRequests"`
}

type createAPIKeyRequest struct {
	Name string `json:"name"`
}

type createAPIKeyResponse struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Prefix    string    `json:"prefix"`
	Key       string    `json:"key"`
	CreatedAt time.Time `json:"createdAt"`
}

func generateAPIKey() (id, raw, prefix, hash string, err error) {
	idBytes := make([]byte, 16)
	if _, err = rand.Read(idBytes); err != nil {
		return "", "", "", "", err
	}
	keyBytes := make([]byte, 32)
	if _, err = rand.Read(keyBytes); err != nil {
		return "", "", "", "", err
	}
	raw = "etw_" + base64.RawURLEncoding.EncodeToString(keyBytes)
	prefix = raw[:12]
	digest := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(idBytes), raw, prefix, hex.EncodeToString(digest[:]), nil
}

// HashAPIKey returns the storage digest for a plaintext API key.
func HashAPIKey(raw string) string {
	digest := sha256.Sum256([]byte(raw))
	return hex.EncodeToString(digest[:])
}

// APIKeyListHandler lists active and revoked API keys without exposing secrets.
func APIKeyListHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !db.IsAvailable() {
			writeJSONError(w, http.StatusServiceUnavailable, "accounts are not enabled on this server")
			return
		}
		uid := auth.UserIDFromContext(r.Context())
		rows, err := db.Pool.Query(r.Context(), `
			SELECT k.id, k.name, k.key_prefix, k.created_at, k.last_used_at, k.revoked_at,
			       COALESCE(u.request_count, 0)
			  FROM api_keys k
			  LEFT JOIN api_key_daily_usage u
			    ON u.api_key_id = k.id AND u.usage_date = CURRENT_DATE
			 WHERE k.user_id = $1
			 ORDER BY k.created_at DESC`, uid)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not load API keys")
			return
		}
		defer rows.Close()

		out := []apiKeyListItem{}
		for rows.Next() {
			var item apiKeyListItem
			if err := rows.Scan(&item.ID, &item.Name, &item.Prefix, &item.CreatedAt, &item.LastUsedAt, &item.RevokedAt, &item.TodayRequests); err != nil {
				writeJSONError(w, http.StatusInternalServerError, "could not load API keys")
				return
			}
			out = append(out, item)
		}
		if err := rows.Err(); err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not load API keys")
			return
		}
		writeJSON(w, http.StatusOK, out)
	}
}

// APIKeyCreateHandler creates a key and returns the plaintext secret exactly once.
func APIKeyCreateHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !db.IsAvailable() {
			writeJSONError(w, http.StatusServiceUnavailable, "accounts are not enabled on this server")
			return
		}
		r.Body = http.MaxBytesReader(w, r.Body, 4*1024)
		var req createAPIKeyRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSONError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		name := strings.TrimSpace(req.Name)
		if name == "" {
			name = "API key"
		}
		if len(name) > 64 {
			writeJSONError(w, http.StatusBadRequest, "API key name must be 64 characters or fewer")
			return
		}

		uid := auth.UserIDFromContext(r.Context())
		var active int
		if err := db.Pool.QueryRow(r.Context(), `SELECT COUNT(*) FROM api_keys WHERE user_id = $1 AND revoked_at IS NULL`, uid).Scan(&active); err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not create API key")
			return
		}
		if active >= maxAPIKeysPerUser {
			writeJSONError(w, http.StatusConflict, "you can have at most 10 active API keys")
			return
		}

		id, raw, prefix, keyHash, err := generateAPIKey()
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not create API key")
			return
		}
		var createdAt time.Time
		if err := db.Pool.QueryRow(r.Context(), `
			INSERT INTO api_keys (id, user_id, name, key_prefix, key_hash)
			VALUES ($1, $2, $3, $4, $5)
			RETURNING created_at`, id, uid, name, prefix, keyHash).Scan(&createdAt); err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not create API key")
			return
		}
		writeJSON(w, http.StatusCreated, createAPIKeyResponse{ID: id, Name: name, Prefix: prefix, Key: raw, CreatedAt: createdAt})
	}
}

// APIKeyRevokeHandler permanently disables a key while retaining audit metadata.
func APIKeyRevokeHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !db.IsAvailable() {
			writeJSONError(w, http.StatusServiceUnavailable, "accounts are not enabled on this server")
			return
		}
		uid := auth.UserIDFromContext(r.Context())
		id := strings.TrimSpace(r.PathValue("id"))
		if id == "" {
			writeJSONError(w, http.StatusBadRequest, "API key id is required")
			return
		}
		result, err := db.Pool.Exec(r.Context(), `
			UPDATE api_keys SET revoked_at = NOW()
			 WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL`, id, uid)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not revoke API key")
			return
		}
		if result.RowsAffected() == 0 {
			writeJSONError(w, http.StatusNotFound, "API key not found")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}
