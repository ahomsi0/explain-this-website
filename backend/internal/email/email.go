// Package email sends transactional emails. Uses Resend's HTTP API when
// RESEND_API_KEY is configured; otherwise falls back to logging to stdout
// (handy for local dev — the dev can read the code from server logs).
package email

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/ahomsi/explain-website/internal/adminstate"
)

// fromAddress is what shows up in the recipient's inbox. Override via FROM_EMAIL.
// Resend's "onboarding@resend.dev" is the verified default for unverified domains.
func fromAddress() string {
	if v := os.Getenv("FROM_EMAIL"); v != "" {
		return v
	}
	return "Explain The Website <onboarding@resend.dev>"
}

// SendBroadcast sends a plain-text admin announcement to a single recipient.
// The body is rendered as both plain text and a minimal HTML version.
func SendBroadcast(ctx context.Context, to, subject, body string) error {
	htmlBody := fmt.Sprintf(`<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1f2937">
  <h2 style="color:#111827;margin:0 0 16px">%s</h2>
  <div style="margin:0;font-size:14px;line-height:1.6;color:#4b5563;white-space:pre-wrap">%s</div>
  <p style="margin:24px 0 0;font-size:11px;color:#9ca3af">Sent by Explain The Website</p>
</div>`, subject, body)
	return send(ctx, to, subject, body, htmlBody)
}

// SendResetCode emails a password reset code to the recipient. If no email backend
// is configured (RESEND_API_KEY unset) it logs the code instead so dev still works.
func SendResetCode(ctx context.Context, to, code string) error {
	subject := "Your password reset code"
	text := fmt.Sprintf("Your password reset code is: %s\n\nThis code expires in 35 minutes. If you didn't request a reset, you can safely ignore this email.", code)
	html := fmt.Sprintf(`<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1f2937">
  <h2 style="color:#111827;margin:0 0 16px">Reset your password</h2>
  <p style="margin:0 0 16px;font-size:14px;line-height:1.5;color:#4b5563">Use this code to set a new password:</p>
  <div style="font-size:32px;font-weight:700;letter-spacing:6px;color:#7c3aed;background:#f5f3ff;padding:16px;border-radius:8px;text-align:center;margin:0 0 16px;font-family:ui-monospace,monospace">%s</div>
  <p style="margin:0;font-size:12px;color:#6b7280">This code expires in 35 minutes. If you didn't request a reset, you can safely ignore this email.</p>
</div>`, code)
	return send(ctx, to, subject, text, html)
}

func send(ctx context.Context, to, subject, text, html string) error {
	if !adminstate.FlagEnabled(adminstate.FlagEmail) {
		return fmt.Errorf("email sending is disabled by an admin flag")
	}
	apiKey := os.Getenv("RESEND_API_KEY")
	if apiKey == "" {
		// Dev fallback: log the email instead of sending. The user can copy the
		// code straight from the server log.
		log.Printf("[email/dev] To=%s | Subject=%s\n--- TEXT ---\n%s\n", to, subject, text)
		return nil
	}

	body, err := json.Marshal(map[string]any{
		"from":    fromAddress(),
		"to":      []string{to},
		"subject": subject,
		"text":    text,
		"html":    html,
	})
	if err != nil {
		return err
	}

	reqCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(reqCtx, "POST", "https://api.resend.com/emails", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		adminstate.RecordEmailFailure(err.Error())
		return fmt.Errorf("resend request: %w", err)
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 300 {
		errMsg := fmt.Sprintf("resend %d: %s", resp.StatusCode, string(respBody))
		adminstate.RecordEmailFailure(errMsg)
		return fmt.Errorf("%s", errMsg)
	}
	adminstate.RecordEmailSuccess()
	log.Printf("[email] resend ok: %s", string(respBody))
	return nil
}
