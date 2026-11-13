package parser

import (
	"net/url"
	"regexp"
	"strings"

	"golang.org/x/net/html"
)

// loginWallMaxWords is the most visible text a page can carry and still be
// read as "just a sign-in screen". Real pages that happen to include a login
// form (a store with an account dropdown, a forum) carry far more.
const loginWallMaxWords = 250

// loginPathRe matches paths where a sign-in form is what the visitor asked
// for. Analysing /login on purpose is not hitting a wall.
var loginPathRe = regexp.MustCompile(`(?i)(^|/)(log[-_]?in|sign[-_]?in|sign[-_]?up|signon|register|registration|auth|sso|session|sessions|wp-login\.php)(/|$|\.)`)

// DetectLoginWall reports whether a fetched page is a sign-in screen standing
// in for the page the user asked for. The fetcher follows redirects, so a
// dashboard URL that bounces to a login form arrives here as that form: without
// this, the report would silently describe the wrong page.
func DetectLoginWall(doc *html.Node, visibleText string, sourceURL string) bool {
	if u, err := url.Parse(sourceURL); err == nil && loginPathRe.MatchString(u.Path) {
		return false
	}
	if !hasPasswordField(doc) {
		return false
	}
	return len(strings.Fields(visibleText)) <= loginWallMaxWords
}

func hasPasswordField(n *html.Node) bool {
	if n == nil {
		return false
	}
	if n.Type == html.ElementNode && n.Data == "input" && strings.EqualFold(strings.TrimSpace(getAttr(n, "type")), "password") {
		return true
	}
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		if hasPasswordField(c) {
			return true
		}
	}
	return false
}
