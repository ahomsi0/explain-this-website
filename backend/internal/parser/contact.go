package parser

import (
	"net/url"
	"regexp"
	"strings"
	"unicode/utf8"
)

// contactWord matches contact-ish words as whole words, so "/helpful-articles"
// does not match "help" but "/contact-us" and "/support/" do.
var contactWord = regexp.MustCompile(`(^|[^a-z])(contact|contactus|support|help|helpdesk|helpcenter|feedback)([^a-z]|$)`)

// maxContactTextLen keeps long article headlines that happen to mention
// "support" from counting as a contact link.
const maxContactTextLen = 40

// isContactRoute reports whether an anchor gives visitors a way to get in
// touch: mailto/tel, a contact/support/help/feedback page, or a GitHub/GitLab
// discussions or issues page. An email or phone number is not required.
func isContactRoute(href, text string) bool {
	h := strings.ToLower(strings.TrimSpace(href))
	if strings.HasPrefix(h, "mailto:") || strings.HasPrefix(h, "tel:") {
		return true
	}

	if u, err := url.Parse(h); err == nil {
		host := strings.TrimPrefix(u.Hostname(), "www.")
		if host == "github.com" || host == "gitlab.com" {
			for _, seg := range strings.Split(u.Path, "/") {
				if seg == "discussions" || seg == "issues" {
					return true
				}
			}
		}
		if contactWord.MatchString(u.Path) {
			return true
		}
	}

	// Text-only matches need a real, navigable href.
	if h == "" || strings.HasPrefix(h, "#") || strings.HasPrefix(h, "javascript:") {
		return false
	}
	return isContactText(text)
}

// isContactText reports whether short visible text (a link or button label)
// reads like a contact prompt, e.g. "Contact us" or "Get support".
func isContactText(text string) bool {
	t := strings.ToLower(strings.TrimSpace(text))
	return t != "" && utf8.RuneCountInString(t) <= maxContactTextLen && contactWord.MatchString(t)
}

// evidenceText trims and collapses whitespace in link text and caps its length.
func evidenceText(s string) string {
	s = strings.Join(strings.Fields(s), " ")
	if r := []rune(s); len(r) > 80 {
		return string(r[:80])
	}
	return s
}
