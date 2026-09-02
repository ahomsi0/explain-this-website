// Package email sends transactional emails. Uses Resend's HTTP API when
// RESEND_API_KEY is configured. Password reset codes are never logged in
// production; local development can explicitly opt into the stdout fallback.
package email

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"html"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
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
	escSubject := html.EscapeString(subject)
	escBody := html.EscapeString(body)
	htmlBody := fmt.Sprintf(`<div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1f2937">
  <h2 style="color:#111827;margin:0 0 16px">%s</h2>
  <div style="margin:0;font-size:14px;line-height:1.6;color:#4b5563;white-space:pre-wrap">%s</div>
  <p style="margin:24px 0 0;font-size:11px;color:#9ca3af">Sent by Explain The Website</p>
</div>`, escSubject, escBody)
	return send(ctx, to, subject, body, htmlBody)
}

// SendResetCode emails a password reset code to the recipient. If no email backend
// is configured, delivery is allowed only when APP_ENV is explicitly development.
func SendResetCode(ctx context.Context, to, code string) error {
	subject := "Your password reset code — Explain This Website"
	text := fmt.Sprintf("Your password reset code is: %s\n\nThis code expires in 35 minutes. If you didn't request a reset, you can safely ignore this email.\n\n— Explain This Website", code)
	htmlBody := fmt.Sprintf(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reset your password</title></head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <table width="100%%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:40px 16px">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%%%%">

        <!-- Logo bar -->
        <tr>
          <td style="padding-bottom:28px;text-align:center">
            <span style="font-size:13px;font-weight:700;color:#a78bfa;letter-spacing:0.05em">Explain This Website</span>
          </td>
        </tr>

        <!-- Card -->
        <tr>
          <td style="background:#18181b;border:1px solid #27272a;border-radius:16px;padding:36px 32px">

            <!-- Heading -->
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#8b5cf6">Password reset</p>
            <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#f4f4f5;line-height:1.2">Reset your password</h1>
            <p style="margin:0 0 28px;font-size:14px;line-height:1.6;color:#a1a1aa">Use the code below to set a new password. It expires in <strong style="color:#e4e4e7">35 minutes</strong>.</p>

            <!-- Code block -->
            <table width="100%%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
              <tr>
                <td style="background:#0f0f11;border:1px solid #3f3f46;border-radius:10px;padding:20px;text-align:center">
                  <span style="font-family:'Courier New',Courier,monospace;font-size:36px;font-weight:700;letter-spacing:10px;color:#a78bfa">%s</span>
                </td>
              </tr>
            </table>

            <!-- Fine print -->
            <p style="margin:0;font-size:12px;line-height:1.6;color:#52525b">If you didn't request a password reset, you can safely ignore this email — your account remains unchanged.</p>

          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding-top:24px;text-align:center">
            <p style="margin:0;font-size:11px;color:#3f3f46">Explain This Website &nbsp;·&nbsp; <a href="https://www.explainthiswebsite.com" style="color:#3f3f46;text-decoration:underline">explainthiswebsite.com</a></p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`, code)
	return send(ctx, to, subject, text, htmlBody)
}

// SendVerifyEmail sends an account verification link to a new user.
func SendVerifyEmail(ctx context.Context, to, verifyURL string) error {
	subject := "Verify your Explain This Website account"
	text := fmt.Sprintf("Welcome! Click the link below to verify your email address:\n\n%s\n\nThe link expires in 24 hours. If you didn't create an account, you can safely ignore this email.\n\n— Explain This Website", verifyURL)
	htmlBody := fmt.Sprintf(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Verify your email</title></head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
  <table width="100%%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:40px 16px">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%%%%">

        <tr>
          <td style="padding-bottom:28px;text-align:center">
            <span style="font-size:13px;font-weight:700;color:#a78bfa;letter-spacing:0.05em">Explain This Website</span>
          </td>
        </tr>

        <tr>
          <td style="background:#18181b;border:1px solid #27272a;border-radius:16px;padding:36px 32px">
            <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:#8b5cf6">Welcome</p>
            <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#f4f4f5;line-height:1.2">Verify your email address</h1>
            <p style="margin:0 0 28px;font-size:14px;line-height:1.6;color:#a1a1aa">Click the button below to confirm your account. The link expires in <strong style="color:#e4e4e7">24 hours</strong>.</p>

            <table width="100%%" cellpadding="0" cellspacing="0" style="margin-bottom:28px">
              <tr>
                <td>
                  <a href="%s" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;padding:13px 28px;border-radius:9px;font-weight:700;font-size:14px;letter-spacing:0.01em">Verify email address</a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 12px;font-size:12px;line-height:1.6;color:#52525b">Or copy this link into your browser:</p>
            <p style="margin:0;font-size:11px;color:#3f3f46;word-break:break-all">%s</p>

            <hr style="border:none;border-top:1px solid #27272a;margin:24px 0">
            <p style="margin:0;font-size:12px;line-height:1.6;color:#52525b">If you didn't create an account, you can safely ignore this email.</p>
          </td>
        </tr>

        <tr>
          <td style="padding-top:24px;text-align:center">
            <p style="margin:0;font-size:11px;color:#3f3f46">Explain This Website &nbsp;·&nbsp; <a href="https://www.explainthiswebsite.com" style="color:#3f3f46;text-decoration:underline">explainthiswebsite.com</a></p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`, html.EscapeString(verifyURL), html.EscapeString(verifyURL))
	return send(ctx, to, subject, text, htmlBody)
}

func send(ctx context.Context, to, subject, text, html string) error {
	if !adminstate.FlagEnabled(adminstate.FlagEmail) {
		return fmt.Errorf("email sending is disabled by an admin flag")
	}
	apiKey := os.Getenv("RESEND_API_KEY")
	if apiKey == "" {
		if !isDevelopment() {
			return fmt.Errorf("email delivery is not configured")
		}
		// Explicit local-dev fallback. Never enable this implicitly in production.
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

func isDevelopment() bool {
	switch strings.ToLower(strings.TrimSpace(os.Getenv("APP_ENV"))) {
	case "dev", "development", "local", "test":
		return true
	default:
		return false
	}
}
