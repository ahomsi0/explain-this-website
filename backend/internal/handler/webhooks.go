package handler

import (
	"context"
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/ahomsi/explain-website/internal/auth"
	"github.com/ahomsi/explain-website/internal/db"
	"github.com/ahomsi/explain-website/internal/fetcher"
	"github.com/ahomsi/explain-website/internal/model"
)

type webhookListItem struct {
	ID              string     `json:"id"`
	URL             string     `json:"url"`
	CreatedAt       time.Time  `json:"createdAt"`
	LastDeliveredAt *time.Time `json:"lastDeliveredAt,omitempty"`
	LastStatus      *int       `json:"lastStatus,omitempty"`
	FailureCount    int        `json:"failureCount"`
	RevokedAt       *time.Time `json:"revokedAt,omitempty"`
}

type createWebhookRequest struct {
	URL string `json:"url"`
}

type createWebhookResponse struct {
	ID        string    `json:"id"`
	URL       string    `json:"url"`
	Secret    string    `json:"secret"`
	CreatedAt time.Time `json:"createdAt"`
}

type storedWebhook struct {
	ID               string
	URL              string
	SecretCiphertext []byte
}

const maxWebhooksPerUser = 10

func webhookEncryptionKey() ([]byte, error) {
	raw := strings.TrimSpace(os.Getenv("WEBHOOK_ENCRYPTION_KEY"))
	if raw == "" {
		return nil, errors.New("WEBHOOK_ENCRYPTION_KEY is not configured")
	}
	if decoded, err := hex.DecodeString(raw); err == nil && len(decoded) == 32 {
		return decoded, nil
	}
	if decoded, err := base64.StdEncoding.DecodeString(raw); err == nil && len(decoded) == 32 {
		return decoded, nil
	}
	return nil, errors.New("WEBHOOK_ENCRYPTION_KEY must be 32 bytes in hex or base64")
}

func encryptWebhookSecret(secret string) ([]byte, error) {
	key, err := webhookEncryptionKey()
	if err != nil {
		return nil, err
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return nil, err
	}
	return append(nonce, gcm.Seal(nil, nonce, []byte(secret), nil)...), nil
}

func decryptWebhookSecret(ciphertext []byte) (string, error) {
	key, err := webhookEncryptionKey()
	if err != nil {
		return "", err
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}
	if len(ciphertext) < gcm.NonceSize() {
		return "", errors.New("invalid encrypted webhook secret")
	}
	nonce, encrypted := ciphertext[:gcm.NonceSize()], ciphertext[gcm.NonceSize():]
	plain, err := gcm.Open(nil, nonce, encrypted, nil)
	if err != nil {
		return "", errors.New("could not decrypt webhook secret")
	}
	return string(plain), nil
}

func generateWebhookValue(prefix string) (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return prefix + base64.RawURLEncoding.EncodeToString(b), nil
}

func generateWebhookID() (string, error) {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func validateWebhookURL(raw string) error {
	u, err := url.ParseRequestURI(raw)
	if err != nil || u.Host == "" || u.User != nil {
		return errors.New("webhook URL must be a valid public HTTP(S) URL")
	}
	if u.Scheme != "https" && u.Scheme != "http" {
		return errors.New("webhook URL must use http or https")
	}
	return nil
}

// WebhookListHandler lists configured endpoints without exposing signing secrets.
func WebhookListHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !db.IsAvailable() {
			writeJSONError(w, http.StatusServiceUnavailable, "accounts are not enabled on this server")
			return
		}
		uid := auth.UserIDFromContext(r.Context())
		rows, err := db.Pool.Query(r.Context(), `
			SELECT id, url, created_at, last_delivered_at, last_status, failure_count, revoked_at
			  FROM webhooks WHERE user_id = $1 ORDER BY created_at DESC`, uid)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not load webhooks")
			return
		}
		defer rows.Close()
		out := []webhookListItem{}
		for rows.Next() {
			var item webhookListItem
			if err := rows.Scan(&item.ID, &item.URL, &item.CreatedAt, &item.LastDeliveredAt, &item.LastStatus, &item.FailureCount, &item.RevokedAt); err != nil {
				writeJSONError(w, http.StatusInternalServerError, "could not load webhooks")
				return
			}
			out = append(out, item)
		}
		if err := rows.Err(); err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not load webhooks")
			return
		}
		writeJSON(w, http.StatusOK, out)
	}
}

// WebhookCreateHandler creates an endpoint and returns its signing secret once.
func WebhookCreateHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !db.IsAvailable() {
			writeJSONError(w, http.StatusServiceUnavailable, "accounts are not enabled on this server")
			return
		}
		if _, err := webhookEncryptionKey(); err != nil {
			writeJSONError(w, http.StatusServiceUnavailable, "webhook encryption is not configured on this server")
			return
		}
		r.Body = http.MaxBytesReader(w, r.Body, 8*1024)
		var req createWebhookRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeJSONError(w, http.StatusBadRequest, "invalid request body")
			return
		}
		rawURL := strings.TrimSpace(req.URL)
		if len(rawURL) > 2048 {
			writeJSONError(w, http.StatusBadRequest, "webhook URL is too long")
			return
		}
		if err := validateWebhookURL(rawURL); err != nil {
			writeJSONError(w, http.StatusBadRequest, err.Error())
			return
		}
		uid := auth.UserIDFromContext(r.Context())
		var active int
		if err := db.Pool.QueryRow(r.Context(), `SELECT COUNT(*) FROM webhooks WHERE user_id = $1 AND revoked_at IS NULL`, uid).Scan(&active); err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not create webhook")
			return
		}
		if active >= maxWebhooksPerUser {
			writeJSONError(w, http.StatusConflict, "you can have at most 10 active webhooks")
			return
		}
		id, err := generateWebhookID()
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not create webhook")
			return
		}
		secret, err := generateWebhookValue("whsec_")
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not create webhook")
			return
		}
		ciphertext, err := encryptWebhookSecret(secret)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not protect webhook secret")
			return
		}
		var createdAt time.Time
		if err := db.Pool.QueryRow(r.Context(), `
			INSERT INTO webhooks (id, user_id, url, secret_ciphertext)
			VALUES ($1, $2, $3, $4) RETURNING created_at`, id, uid, rawURL, ciphertext).Scan(&createdAt); err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not create webhook")
			return
		}
		writeJSON(w, http.StatusCreated, createWebhookResponse{ID: id, URL: rawURL, Secret: secret, CreatedAt: createdAt})
	}
}

// WebhookRevokeHandler disables an endpoint without deleting delivery history.
func WebhookRevokeHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !db.IsAvailable() {
			writeJSONError(w, http.StatusServiceUnavailable, "accounts are not enabled on this server")
			return
		}
		uid := auth.UserIDFromContext(r.Context())
		id := strings.TrimSpace(r.PathValue("id"))
		result, err := db.Pool.Exec(r.Context(), `
			UPDATE webhooks SET revoked_at = NOW() WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL`, id, uid)
		if err != nil {
			writeJSONError(w, http.StatusInternalServerError, "could not revoke webhook")
			return
		}
		if result.RowsAffected() == 0 {
			writeJSONError(w, http.StatusNotFound, "webhook not found")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}

type webhookEvent struct {
	Event      string    `json:"event"`
	Version    string    `json:"version"`
	OccurredAt time.Time `json:"occurredAt"`
	Data       any       `json:"data"`
}

func deliverWebhook(ctx context.Context, endpoint storedWebhook, event webhookEvent) error {
	secret, err := decryptWebhookSecret(endpoint.SecretCiphertext)
	if err != nil {
		return err
	}
	body, err := json.Marshal(event)
	if err != nil {
		return err
	}
	digest := hmac.New(sha256.New, []byte(secret))
	_, _ = digest.Write(body)
	signature := "sha256=" + hex.EncodeToString(digest.Sum(nil))
	client := fetcher.NewPublicHTTPClient(10 * time.Second)
	status := 0
	for attempt := 0; attempt < 3; attempt++ {
		req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint.URL, strings.NewReader(string(body)))
		if err != nil {
			return err
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("User-Agent", "ExplainThisWebsite-Webhooks/1.0")
		req.Header.Set("X-Explain-Website-Event", event.Event)
		req.Header.Set("X-Explain-Website-Signature", signature)
		resp, err := client.Do(req)
		if err == nil {
			status = resp.StatusCode
			_, _ = io.Copy(io.Discard, io.LimitReader(resp.Body, 64*1024))
			resp.Body.Close()
			if status >= 200 && status < 300 {
				return recordWebhookDelivery(endpoint.ID, status, nil)
			}
			if status < 500 && status != http.StatusTooManyRequests {
				break
			}
		}
		if attempt < 2 {
			timer := time.NewTimer(time.Duration(500*(1<<attempt)) * time.Millisecond)
			select {
			case <-timer.C:
			case <-ctx.Done():
				timer.Stop()
				return recordWebhookDelivery(endpoint.ID, status, ctx.Err())
			}
		}
	}
	return recordWebhookDelivery(endpoint.ID, status, fmt.Errorf("webhook returned HTTP %d", status))
}

func recordWebhookDelivery(id string, status int, deliveryErr error) error {
	if db.IsAvailable() {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		if deliveryErr == nil {
			_, _ = db.Pool.Exec(ctx, `
				UPDATE webhooks SET last_delivered_at = NOW(), last_status = $1, failure_count = 0 WHERE id = $2`, status, id)
		} else {
			_, _ = db.Pool.Exec(ctx, `
				UPDATE webhooks SET last_delivered_at = NOW(), last_status = $1, failure_count = failure_count + 1 WHERE id = $2`, status, id)
		}
	}
	return deliveryErr
}

func loadWebhook(ctx context.Context, id string, userID int64) (storedWebhook, error) {
	var endpoint storedWebhook
	err := db.Pool.QueryRow(ctx, `
		SELECT id, url, secret_ciphertext FROM webhooks
		 WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL`, id, userID).
		Scan(&endpoint.ID, &endpoint.URL, &endpoint.SecretCiphertext)
	return endpoint, err
}

// WebhookTestHandler sends a signed test event to one configured endpoint.
func WebhookTestHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !db.IsAvailable() {
			writeJSONError(w, http.StatusServiceUnavailable, "accounts are not enabled on this server")
			return
		}
		ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
		defer cancel()
		endpoint, err := loadWebhook(ctx, r.PathValue("id"), auth.UserIDFromContext(r.Context()))
		if err != nil {
			writeJSONError(w, http.StatusNotFound, "webhook not found")
			return
		}
		err = deliverWebhook(ctx, endpoint, webhookEvent{
			Event:      "webhook.test",
			Version:    "1",
			OccurredAt: time.Now().UTC(),
			Data:       map[string]string{"message": "This is a test event from Explain This Website."},
		})
		if err != nil {
			writeJSONError(w, http.StatusBadGateway, "webhook delivery failed")
			return
		}
		writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
	}
}

// dispatchAnalysisCompleted sends a compact, signed event asynchronously so a
// slow integration never delays an analysis response.
func dispatchAnalysisCompleted(userID int64, reportID string, result model.AnalysisResult) {
	if userID == 0 || !db.IsAvailable() {
		return
	}
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 90*time.Second)
		defer cancel()
		rows, err := db.Pool.Query(ctx, `
			SELECT id, url, secret_ciphertext FROM webhooks
			 WHERE user_id = $1 AND revoked_at IS NULL`, userID)
		if err != nil {
			return
		}
		defer rows.Close()
		event := webhookEvent{
			Event:      "analysis.completed",
			Version:    "1",
			OccurredAt: time.Now().UTC(),
			Data:       comparisonSnapshot(reportID, result.Overview.Title, result.FetchedAt, result),
		}
		for rows.Next() {
			var endpoint storedWebhook
			if err := rows.Scan(&endpoint.ID, &endpoint.URL, &endpoint.SecretCiphertext); err == nil {
				go func(endpoint storedWebhook) { _ = deliverWebhook(ctx, endpoint, event) }(endpoint)
			}
		}
		if err := rows.Err(); err != nil {
			return
		}
	}()
}
