package parser

import (
	"regexp"
	"strings"

	"github.com/ahomsi/explain-website/internal/model"
	"golang.org/x/net/html"
)

var ctaKeywords = []string{
	"buy", "get started", "sign up", "signup", "try", "free trial",
	"start", "book", "order", "subscribe", "contact us", "learn more",
	"shop now", "get demo", "book a demo", "request demo", "download",
	"register", "join", "claim", "add to cart", "checkout", "get quote",
}

var socialProofKeywords = []string{
	"review", "testimonial", "rated", "customers", "clients", "trust pilot",
	"trustpilot", "verified", "stars", "rating", "g2 crowd", "capterra",
	"4.", "5.", "/5", "out of 5",
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
	"crisp.chat", "client.crisp.chat",
	"intercom", "widget.intercom.io",
	"js.driftt.com", "drift.com/",
	"tawk.to", "tawk_api",
	"tidio", "code.tidio.co",
	"freshchat", "wchat.freshchat.com",
	"zopim", "zendesk",
	"livechat.com", "cdn.livechatinc.com",
	"helpscout", "beacon-v2",
	"olark", "smartsupp",
	"hubspot", "js.hs-scripts.com",
}

var phoneRegex = regexp.MustCompile(`\+?[\d][\d\s\-\(\)]{7,}`)

// analyzeUX scans the HTML tree for conversion and UX signals.
func analyzeUX(doc *html.Node, rawHTML string) model.UXResult {
	result := model.UXResult{}

	walkUX(doc, &result)

	lower := strings.ToLower(rawHTML)

	// Phone numbers in raw HTML
	if phoneRegex.MatchString(lower) {
		result.HasContactInfo = true
	}

	// Trust signals
	for _, kw := range trustKeywords {
		if strings.Contains(lower, kw) {
			result.HasTrustSignals = true
			break
		}
	}

	// Social proof
	for _, kw := range socialProofKeywords {
		if strings.Contains(lower, kw) {
			result.HasSocialProof = true
			break
		}
	}

	// Cookie/GDPR banner
	for _, sig := range cookieBannerSignals {
		if strings.Contains(lower, sig) {
			result.HasCookieBanner = true
			break
		}
	}

	// Live chat widget
	for _, sig := range liveChatSignals {
		if strings.Contains(lower, sig) {
			result.HasLiveChat = true
			break
		}
	}

	// Newsletter signup: email input + subscribe/newsletter context
	hasEmailInput := strings.Contains(lower, `type="email"`) || strings.Contains(lower, `type='email'`)
	if hasEmailInput {
		for _, kw := range newsletterKeywords {
			if strings.Contains(lower, kw) {
				result.HasNewsletterSignup = true
				break
			}
		}
	}

	return result
}

func walkUX(n *html.Node, result *model.UXResult) {
	if n.Type == html.ElementNode {
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
