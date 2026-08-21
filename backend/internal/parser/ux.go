package parser

import (
	"regexp"
	"strconv"
	"strings"

	"github.com/ahomsi/explain-website/internal/model"
	"golang.org/x/net/html"
)

var ctaKeywords = []string{
	"buy", "get started", "sign up", "signup", "try", "free trial",
	"start", "book", "order", "subscribe", "contact us",
	"shop now", "get demo", "book a demo", "request demo", "download",
	"register", "join", "claim", "add to cart", "checkout", "get quote",
}

var socialProofKeywords = []string{
	"review", "testimonial", "rated", "customers", "clients", "trust pilot",
	"trustpilot", "verified", "stars", "rating", "g2 crowd", "capterra",
	// "4." and "5." removed — too broad, matches numbered lists
	"/5", "out of 5",
}

var trustKeywords = []string{
	"guarantee", "secure", "ssl", "certified", "award", "accredited",
	"privacy", "safe", "money back", "refund", "100%", "no risk", "verified",
}

var newsletterKeywords = []string{
	"newsletter", "subscribe", "subscription", "mailing list",
	"email updates", "get updates", "stay updated", "join our list",
	"weekly digest", "updates in your inbox",
}

var cookieBannerSignals = []string{
	"cookieconsent", "cookie-consent", "cookie-notice", "cookie-banner",
	"onetrust", "cookiebot", "cc-window", "gdpr-cookie", "cookie-law",
	"cookie_consent", "cookie-accept", "js-cookie", "cookie-popup",
	"we use cookies", "accept cookies", "cookie preferences",
}

var liveChatSignals = []string{
	// Crisp
	"crisp.chat", "client.crisp.chat", "$crisp",
	// Intercom
	"intercom", "widget.intercom.io", "intercomcdn",
	// Drift
	"js.driftt.com", "drift.com/", "driftt.com",
	// Tawk.to
	"tawk.to", "tawk_api", "embed.tawk.to",
	// Tidio
	"tidio", "code.tidio.co",
	// Freshchat / Freshdesk
	"freshchat", "wchat.freshchat.com", "freshdesk", "freshworks",
	// Zendesk / Zopim
	"zopim", "zendesk", "zdassets.com",
	// LiveChat
	"livechat.com", "cdn.livechatinc.com", "livechatinc",
	// HelpScout Beacon
	"helpscout", "beacon-v2", "beacon.helpscout",
	// Olark
	"olark",
	// Smartsupp
	"smartsupp",
	// HubSpot chat
	"js.hs-scripts.com", "hubspot",
	// Chatwoot
	"chatwoot",
	// Gist
	"getgist.com",
	// Zoho SalesIQ
	"salesiq.zoho.com", "zoho.com/salesiq",
	// LiveAgent
	"liveagent",
	// Re:amaze
	"reamaze",
	// Podium
	"podium.com",
	// Qualified
	"qualified.com",
	// Chatra
	"chatra.io",
	// UserLike
	"userlike.com",
	// Pure Chat
	"purechat.com",
	// SnapEngage
	"snapengage",
	// Comm100
	"comm100",
	// Kayako
	"kayako",
	// Generic chat widget markers often left in HTML
	"chat-widget", "chat_widget", "livechat-widget",
	"chat-bubble", "chatbubble", "chat-launcher",
	"__lc", "lc_chat", "lc2",
	// Custom/embedded chatbot patterns
	"chatbot", "chat-bot", "chat_bot",
	"togglechatbot", "chatbot-frame", "chatbot-container",
	"chatbot-button", "chatbot-toggle", "chatbot-icon",
	"openchat", "open-chat", "showchat",
}

// phoneRegex matches digit sequences that look like phone numbers.
// We require 9–20 characters in the pattern and then validate digit count below.
var phoneRegex = regexp.MustCompile(`\+?[\d][\d\s\-\(\)]{8,19}`)

// digitCount returns the number of ASCII digit characters in s.
func digitCount(s string) int {
	n := 0
	for _, c := range s {
		if c >= '0' && c <= '9' {
			n++
		}
	}
	return n
}

// looksLikePhone returns true when a regex match contains 7–15 digits,
// the range that covers real phone numbers while excluding product codes,
// ZIP+4 codes, and other numeric strings.
func looksLikePhone(match string) bool {
	if isYearRange(match) {
		return false
	}
	d := digitCount(match)
	return d >= 7 && d <= 15
}

// isYearRange detects strings like "2023 - 2024", "2023-2024", or "2019/2020"
// — copyright/fiscal-year ranges that are common on marketing pages but are
// never phone numbers. Every digit group must be a plausible 4-digit year.
func isYearRange(match string) bool {
	parts := strings.FieldsFunc(match, func(r rune) bool {
		return r < '0' || r > '9'
	})
	if len(parts) < 2 {
		return false
	}
	for _, p := range parts {
		if len(p) != 4 {
			return false
		}
		n, err := strconv.Atoi(p)
		if err != nil || n < 1900 || n > 2100 {
			return false
		}
	}
	return true
}

// analyzeUX scans the HTML tree for conversion and UX signals.
func analyzeUX(doc *html.Node, rawHTML string) model.UXResult {
	result := model.UXResult{}

	walkUX(doc, &result)

	lower := strings.ToLower(rawHTML)
	visibleLower := strings.ToLower(extractVisibleText(doc))

	// ── Phone numbers ─────────────────────────────────────────────────────────
	// Validate digit count to avoid matching product IDs, date strings, etc.
	for _, m := range phoneRegex.FindAllString(visibleLower, -1) {
		if looksLikePhone(m) {
			result.HasContactInfo = true
			break
		}
	}

	// ── Trust signals ─────────────────────────────────────────────────────────
	// Require at least 2 distinct trust keywords to reduce false positives from
	// articles or blog posts that mention a single keyword in passing.
	trustHits := 0
	for _, kw := range trustKeywords {
		if strings.Contains(visibleLower, kw) {
			trustHits++
			if trustHits >= 2 {
				result.HasTrustSignals = true
				break
			}
		}
	}

	// ── Social proof ──────────────────────────────────────────────────────────
	for _, kw := range socialProofKeywords {
		if strings.Contains(visibleLower, kw) {
			result.HasSocialProof = true
			break
		}
	}

	// ── Cookie / GDPR banner ──────────────────────────────────────────────────
	for _, sig := range cookieBannerSignals {
		if strings.Contains(lower, sig) {
			result.HasCookieBanner = true
			break
		}
	}

	// ── Live chat widget ──────────────────────────────────────────────────────
	for _, sig := range liveChatSignals {
		if strings.Contains(lower, sig) {
			result.HasLiveChat = true
			break
		}
	}

	// ── Newsletter signup ─────────────────────────────────────────────────────
	// Require an email input AND a newsletter keyword within ±500 characters of
	// that input. This avoids flagging contact forms on pages that happen to
	// mention the word "newsletter" in unrelated body copy.
	result.HasNewsletterSignup = detectNewsletter(doc)

	return result
}

// detectNewsletter checks for an email <input> with a newsletter-related keyword
// appearing within a 500-character window around it.
func detectNewsletter(doc *html.Node) bool {
	var walk func(*html.Node) bool
	walk = func(n *html.Node) bool {
		if n.Type == html.ElementNode {
			if isHiddenElement(n) {
				return false
			}
			if strings.EqualFold(n.Data, "input") && strings.EqualFold(getAttr(n, "type"), "email") {
				// Prefer the nearest form/container so unrelated page copy does not
				// turn a contact field into a newsletter detection.
				for parent, depth := n.Parent, 0; parent != nil && depth < 4; parent, depth = parent.Parent, depth+1 {
					context := strings.ToLower(extractText(parent))
					for _, kw := range newsletterKeywords {
						if strings.Contains(context, kw) {
							return true
						}
					}
					if strings.EqualFold(parent.Data, "form") {
						break
					}
				}
			}
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			if walk(c) {
				return true
			}
		}
		return false
	}
	return walk(doc)
}

func walkUX(n *html.Node, result *model.UXResult) {
	if n.Type == html.ElementNode {
		if isHiddenElement(n) {
			return
		}
		tag := strings.ToLower(n.Data)

		switch tag {
		case "form":
			result.HasForms = true
			result.FormCount++

		case "a", "button":
			text := strings.ToLower(strings.TrimSpace(extractText(n)))
			for _, kw := range ctaKeywords {
				if strings.Contains(text, kw) {
					result.HasCTA = true
					result.CTACount++
					break
				}
			}
			if tag == "a" {
				href := strings.ToLower(getAttr(n, "href"))
				if strings.HasPrefix(href, "mailto:") || strings.HasPrefix(href, "tel:") {
					result.HasContactInfo = true
				}
				// Privacy policy link
				if strings.Contains(href, "privacy") || strings.Contains(text, "privacy policy") {
					result.HasPrivacyPolicy = true
				}
			}

		case "video":
			result.HasVideoContent = true

		case "iframe":
			src := strings.ToLower(getAttr(n, "src"))
			if strings.Contains(src, "youtube.com") || strings.Contains(src, "youtu.be") ||
				strings.Contains(src, "vimeo.com") || strings.Contains(src, "wistia.com") ||
				strings.Contains(src, "loom.com") {
				result.HasVideoContent = true
			}

		case "meta":
			if strings.ToLower(getAttr(n, "name")) == "viewport" {
				result.MobileReady = true
			}
		}
	}

	for c := n.FirstChild; c != nil; c = c.NextSibling {
		walkUX(c, result)
	}
}

// extractText recursively collects all text content under a node.
func extractText(n *html.Node) string {
	if n.Type == html.TextNode {
		return n.Data
	}
	var sb strings.Builder
	for c := n.FirstChild; c != nil; c = c.NextSibling {
		sb.WriteString(extractText(c))
	}
	return sb.String()
}
