package parser

import (
	"strings"

	"github.com/ahomsi/explain-website/internal/model"
)

// thirdPartyEntityMap maps Lighthouse entity names (as returned by the PageSpeed
// third-parties-insight audit) to a normalized tech name + our category.
// Only entities listed here are surfaced — we deliberately skip the long tail of
// generic/CDN/asset domains so the tech stack stays meaningful.
type thirdPartyMeta struct {
	Name     string // canonical product name (use exactly when adding to TechStack)
	Category string // matches our tech detection categories
}

var thirdPartyEntityMap = map[string]thirdPartyMeta{
	// Analytics & product
	"Google Analytics":            {"Google Analytics", "analytics"},
	"Google/Doubleclick Ads":      {"Google Ads", "analytics"},
	"Google Tag Manager":          {"Google Tag Manager", "analytics"},
	"Hotjar":                      {"Hotjar", "analytics"},
	"Mixpanel":                    {"Mixpanel", "analytics"},
	"Segment":                     {"Segment", "analytics"},
	"Amplitude":                   {"Amplitude", "analytics"},
	"Heap":                        {"Heap Analytics", "analytics"},
	"FullStory":                   {"FullStory", "analytics"},
	"Chartbeat":                   {"Chartbeat", "analytics"},
	"Cxense":                      {"Cxense", "analytics"},
	"Scorecard Research":          {"Scorecard Research", "analytics"},
	"New Relic":                   {"New Relic", "analytics"},
	"Datadog":                     {"Datadog RUM", "analytics"},
	"Sentry":                      {"Sentry", "analytics"},
	"LogRocket":                   {"LogRocket", "analytics"},
	"Quantcast":                   {"Quantcast", "analytics"},

	// Marketing / CRM
	"HubSpot":            {"HubSpot", "analytics"},
	"Klaviyo":            {"Klaviyo", "analytics"},
	"Marketo":            {"Marketo", "analytics"},
	"Salesforce":         {"Salesforce", "analytics"},
	"Pardot":             {"Pardot", "analytics"},
	"Mailchimp":          {"Mailchimp", "analytics"},
	"Intercom":           {"Intercom", "analytics"},
	"Drift":              {"Drift", "analytics"},
	"Optimizely":         {"Optimizely", "analytics"},
	"VWO":                {"VWO", "analytics"},
	"Crazy Egg":          {"Crazy Egg", "analytics"},
	"Wunderkind":         {"Wunderkind", "analytics"},
	"Iterable":           {"Iterable", "analytics"},
	"Braze":              {"Braze", "analytics"},
	"OneTrust":           {"OneTrust", "analytics"},

	// Ad tech
	"Meta Pixel":          {"Meta Pixel", "analytics"},
	"Facebook":            {"Meta", "analytics"},
	"Twitter":             {"X (Twitter)", "analytics"},
	"LinkedIn":            {"LinkedIn Insight", "analytics"},
	"TikTok":              {"TikTok Pixel", "analytics"},
	"Pinterest":           {"Pinterest Tag", "analytics"},
	"Amazon Ads":          {"Amazon Ads", "analytics"},
	"Criteo":              {"Criteo", "analytics"},
	"Pubmatic":            {"PubMatic", "analytics"},
	"Index Exchange":      {"Index Exchange", "analytics"},
	"Rubicon Project":     {"Rubicon Project", "analytics"},
	"OpenX":               {"OpenX", "analytics"},
	"Integral Ad Science": {"Integral Ad Science", "analytics"},
	"GumGum":              {"GumGum", "analytics"},
	"Conversant":          {"Conversant", "analytics"},
	"Innovid":             {"Innovid", "analytics"},

	// Payments & checkout
	"Stripe":   {"Stripe", "ecommerce"},
	"PayPal":   {"PayPal", "ecommerce"},
	"Klarna":   {"Klarna", "ecommerce"},
	"Affirm":   {"Affirm", "ecommerce"},
	"Afterpay": {"Afterpay", "ecommerce"},
	"Adyen":    {"Adyen", "ecommerce"},
	"Square":   {"Square", "ecommerce"},
	"Recurly":  {"Recurly", "ecommerce"},
	"piano":    {"Piano", "ecommerce"}, // paywall/subscription
	"Piano":    {"Piano", "ecommerce"},

	// CDN & infra
	"Cloudflare":     {"Cloudflare", "cdn"},
	"Akamai":         {"Akamai", "cdn"},
	"Fastly":         {"Fastly", "cdn"},
	"Amazon Web Services": {"AWS", "cdn"},
	"Amazon CloudFront":   {"CloudFront", "cdn"},
	"Vercel":         {"Vercel", "cdn"},
	"Netlify":        {"Netlify", "cdn"},
	"JSDelivr CDN":   {"jsDelivr", "cdn"},
	"jsDelivr":       {"jsDelivr", "cdn"},
	"Unpkg":          {"unpkg", "cdn"},
	"Bunny CDN":      {"Bunny.net", "cdn"},
	"BunnyCDN":       {"Bunny.net", "cdn"},
	"KeyCDN":         {"KeyCDN", "cdn"},

	// Customer support
	"Zendesk":   {"Zendesk", "analytics"},
	"Freshdesk": {"Freshdesk", "analytics"},
	"Tawk.to":   {"Tawk.to", "analytics"},
	"Crisp":     {"Crisp", "analytics"},
	"LiveChat":  {"LiveChat", "analytics"},

	// Media / fonts
	"Google Fonts":    {"Google Fonts", "media"},
	"Adobe Fonts":     {"Adobe Fonts (Typekit)", "media"},
	"Typekit":         {"Adobe Fonts (Typekit)", "media"},
	"YouTube":         {"YouTube", "media"},
	"Vimeo":           {"Vimeo", "media"},
	"Wistia":          {"Wistia", "media"},
	"Cloudinary":      {"Cloudinary", "media"},
	"Imgix":           {"imgix", "media"},
	"Spotify":         {"Spotify", "media"},

	// SaaS platforms
	"Shopify":     {"Shopify", "ecommerce"},
	"Squarespace": {"Squarespace", "builder"},
	"Wix":         {"Wix", "builder"},
	"Webflow":     {"Webflow", "builder"},
	"WordPress":   {"WordPress", "cms"},
}

// mergeThirdParties augments an existing tech stack with high-confidence services
// detected by Lighthouse via real network requests. Skips entries already present
// (deduped by lowercase name) and unknown entities.
func mergeThirdParties(existing []model.TechItem, thirdParties []model.ThirdPartyEntity) []model.TechItem {
	if len(thirdParties) == 0 {
		return existing
	}

	have := make(map[string]struct{}, len(existing))
	for _, t := range existing {
		have[strings.ToLower(t.Name)] = struct{}{}
	}

	out := existing
	for _, tp := range thirdParties {
		meta, ok := thirdPartyEntityMap[tp.Name]
		if !ok {
			continue
		}
		key := strings.ToLower(meta.Name)
		if _, dup := have[key]; dup {
			continue
		}
		have[key] = struct{}{}
		out = append(out, model.TechItem{
			Name:       meta.Name,
			Category:   meta.Category,
			Confidence: "high", // Lighthouse confirmed via network requests
			RuleID:     "lighthouse-third-party",
		})
	}
	return out
}
