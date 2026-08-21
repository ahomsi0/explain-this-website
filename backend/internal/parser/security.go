package parser

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/ahomsi/explain-website/internal/model"
)

// AuditSecurityHeaders checks 6 HTTP response headers that protect visitors.
func AuditSecurityHeaders(headers http.Header) []model.SecurityHeaderCheck {
	return []model.SecurityHeaderCheck{
		checkHSTS(headers),
		checkCSP(headers),
		checkXFrame(headers),
		checkXContentType(headers),
		checkReferrer(headers),
		checkPermissions(headers),
	}
}

func checkHSTS(h http.Header) model.SecurityHeaderCheck {
	v := strings.TrimSpace(h.Get("Strict-Transport-Security"))
	if v == "" {
		return model.SecurityHeaderCheck{ID: "hsts", Label: "Strict-Transport-Security", Status: "fail",
			Detail: "Header missing — browsers won't enforce HTTPS-only connections"}
	}
	maxAge, ok := hstsMaxAge(v)
	if !ok || maxAge <= 0 {
		return model.SecurityHeaderCheck{ID: "hsts", Label: "Strict-Transport-Security", Status: "fail",
			Detail: "Header must include a positive max-age — max-age=0 disables HTTPS enforcement"}
	}
	return model.SecurityHeaderCheck{ID: "hsts", Label: "Strict-Transport-Security", Status: "pass",
		Detail: v}
}

func checkCSP(h http.Header) model.SecurityHeaderCheck {
	v := strings.TrimSpace(h.Get("Content-Security-Policy"))
	if v == "" {
		if reportOnly := strings.TrimSpace(h.Get("Content-Security-Policy-Report-Only")); reportOnly != "" {
			return model.SecurityHeaderCheck{ID: "csp", Label: "Content-Security-Policy", Status: "warning",
				Detail: "Only a report-only CSP is present — it reports violations but does not block them"}
		}
		return model.SecurityHeaderCheck{ID: "csp", Label: "Content-Security-Policy", Status: "fail",
			Detail: "Header missing — no protection against cross-site scripting (XSS)"}
	}
	if !hasKnownCSPDirective(v) {
		return model.SecurityHeaderCheck{ID: "csp", Label: "Content-Security-Policy", Status: "warning",
			Detail: "CSP is present but no recognized enforcement directive was found"}
	}
	return model.SecurityHeaderCheck{ID: "csp", Label: "Content-Security-Policy", Status: "pass",
		Detail: truncate(v, 80)}
}

func checkXFrame(h http.Header) model.SecurityHeaderCheck {
	v := strings.ToUpper(strings.TrimSpace(h.Get("X-Frame-Options")))
	if v == "" {
		return model.SecurityHeaderCheck{ID: "xframe", Label: "X-Frame-Options", Status: "warning",
			Detail: "Header missing — page may be embeddable in iframes (clickjacking risk)"}
	}
	if v != "DENY" && v != "SAMEORIGIN" {
		return model.SecurityHeaderCheck{ID: "xframe", Label: "X-Frame-Options", Status: "warning",
			Detail: "Unexpected value: " + h.Get("X-Frame-Options")}
	}
	return model.SecurityHeaderCheck{ID: "xframe", Label: "X-Frame-Options", Status: "pass",
		Detail: h.Get("X-Frame-Options")}
}

func checkXContentType(h http.Header) model.SecurityHeaderCheck {
	v := strings.ToLower(strings.TrimSpace(h.Get("X-Content-Type-Options")))
	if v == "nosniff" {
		return model.SecurityHeaderCheck{ID: "xcontent", Label: "X-Content-Type-Options", Status: "pass",
			Detail: "nosniff"}
	}
	if v == "" {
		return model.SecurityHeaderCheck{ID: "xcontent", Label: "X-Content-Type-Options", Status: "warning",
			Detail: "Header missing — browsers may MIME-sniff responses"}
	}
	return model.SecurityHeaderCheck{ID: "xcontent", Label: "X-Content-Type-Options", Status: "warning",
		Detail: "Expected nosniff, got: " + h.Get("X-Content-Type-Options")}
}

func checkReferrer(h http.Header) model.SecurityHeaderCheck {
	raw := strings.TrimSpace(h.Get("Referrer-Policy"))
	v := strings.ToLower(raw)
	if v == "" {
		return model.SecurityHeaderCheck{ID: "referrer", Label: "Referrer-Policy", Status: "warning",
			Detail: "Header missing — referrer defaults vary by browser"}
	}
	if v == "unsafe-url" || v == "no-referrer-when-downgrade" {
		return model.SecurityHeaderCheck{ID: "referrer", Label: "Referrer-Policy", Status: "warning",
			Detail: "Policy '" + h.Get("Referrer-Policy") + "' leaks full URL in referrer header"}
	}
	if !validReferrerPolicy(v) {
		return model.SecurityHeaderCheck{ID: "referrer", Label: "Referrer-Policy", Status: "warning",
			Detail: "Unrecognized referrer policy: " + raw}
	}
	return model.SecurityHeaderCheck{ID: "referrer", Label: "Referrer-Policy", Status: "pass",
		Detail: raw}
}

func checkPermissions(h http.Header) model.SecurityHeaderCheck {
	v := strings.TrimSpace(h.Get("Permissions-Policy"))
	if v == "" {
		return model.SecurityHeaderCheck{ID: "permissions", Label: "Permissions-Policy", Status: "fail",
			Detail: "Header missing — no browser feature restrictions set"}
	}
	if !hasPermissionsDirective(v) {
		return model.SecurityHeaderCheck{ID: "permissions", Label: "Permissions-Policy", Status: "warning",
			Detail: "Permissions-Policy is present but no feature policy directive was recognized"}
	}
	return model.SecurityHeaderCheck{ID: "permissions", Label: "Permissions-Policy", Status: "pass",
		Detail: truncate(v, 80)}
}

func hstsMaxAge(value string) (int64, bool) {
	for _, directive := range strings.Split(value, ";") {
		parts := strings.SplitN(strings.TrimSpace(directive), "=", 2)
		if len(parts) != 2 || !strings.EqualFold(strings.TrimSpace(parts[0]), "max-age") {
			continue
		}
		age, err := strconv.ParseInt(strings.TrimSpace(parts[1]), 10, 64)
		return age, err == nil
	}
	return 0, false
}

var knownCSPDirectives = map[string]bool{
	"base-uri": true, "child-src": true, "connect-src": true, "default-src": true,
	"font-src": true, "form-action": true, "frame-ancestors": true, "frame-src": true,
	"img-src": true, "manifest-src": true, "media-src": true, "navigate-to": true,
	"object-src": true, "plugin-types": true, "prefetch-src": true, "report-to": true,
	"report-uri": true, "require-sri-for": true, "require-trusted-types-for": true,
	"sandbox": true, "script-src": true, "script-src-attr": true, "script-src-elem": true,
	"style-src": true, "style-src-attr": true, "style-src-elem": true, "trusted-types": true,
	"upgrade-insecure-requests": true, "worker-src": true, "block-all-mixed-content": true,
}

func hasKnownCSPDirective(value string) bool {
	for _, directive := range strings.Split(value, ";") {
		fields := strings.Fields(strings.TrimSpace(directive))
		if len(fields) > 0 && knownCSPDirectives[strings.ToLower(fields[0])] {
			return true
		}
	}
	return false
}

func validReferrerPolicy(value string) bool {
	switch value {
	case "no-referrer", "no-referrer-when-downgrade", "origin", "origin-when-cross-origin",
		"same-origin", "strict-origin", "strict-origin-when-cross-origin", "unsafe-url":
		return true
	default:
		return false
	}
}

func hasPermissionsDirective(value string) bool {
	for _, directive := range strings.Split(value, ",") {
		if strings.Contains(strings.TrimSpace(directive), "=") {
			return true
		}
	}
	return false
}
