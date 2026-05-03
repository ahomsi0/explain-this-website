package parser

import (
	"net/http"
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
	v := h.Get("Strict-Transport-Security")
	if v == "" {
		return model.SecurityHeaderCheck{ID: "hsts", Label: "Strict-Transport-Security", Status: "fail",
			Detail: "Header missing — browsers won't enforce HTTPS-only connections"}
	}
	return model.SecurityHeaderCheck{ID: "hsts", Label: "Strict-Transport-Security", Status: "pass",
		Detail: v}
}

func checkCSP(h http.Header) model.SecurityHeaderCheck {
	v := h.Get("Content-Security-Policy")
	if v == "" {
		return model.SecurityHeaderCheck{ID: "csp", Label: "Content-Security-Policy", Status: "fail",
			Detail: "Header missing — no protection against cross-site scripting (XSS)"}
	}
	return model.SecurityHeaderCheck{ID: "csp", Label: "Content-Security-Policy", Status: "pass",
		Detail: truncate(v, 80)}
}

func checkXFrame(h http.Header) model.SecurityHeaderCheck {
	v := strings.ToUpper(h.Get("X-Frame-Options"))
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
	v := strings.ToLower(h.Get("X-Content-Type-Options"))
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
	v := strings.ToLower(h.Get("Referrer-Policy"))
	if v == "" {
		return model.SecurityHeaderCheck{ID: "referrer", Label: "Referrer-Policy", Status: "warning",
			Detail: "Header missing — referrer defaults vary by browser"}
	}
	if v == "unsafe-url" || v == "no-referrer-when-downgrade" {
		return model.SecurityHeaderCheck{ID: "referrer", Label: "Referrer-Policy", Status: "warning",
			Detail: "Policy '" + h.Get("Referrer-Policy") + "' leaks full URL in referrer header"}
	}
	return model.SecurityHeaderCheck{ID: "referrer", Label: "Referrer-Policy", Status: "pass",
		Detail: h.Get("Referrer-Policy")}
}

func checkPermissions(h http.Header) model.SecurityHeaderCheck {
	v := h.Get("Permissions-Policy")
	if v == "" {
		return model.SecurityHeaderCheck{ID: "permissions", Label: "Permissions-Policy", Status: "fail",
			Detail: "Header missing — no browser feature restrictions set"}
	}
	return model.SecurityHeaderCheck{ID: "permissions", Label: "Permissions-Policy", Status: "pass",
		Detail: truncate(v, 80)}
}
