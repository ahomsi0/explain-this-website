package parser

import (
	"strings"

	"github.com/ahomsi/explain-website/internal/model"
)

type techPattern struct {
	name       string
	category   string
	confidence string
	patterns   []string
}

// techPatterns lists all detectable technologies with their HTML fingerprints.
var techPatterns = []techPattern{
	// CMS
	{name: "WordPress", category: "cms", confidence: "high",
		patterns: []string{"/wp-content/", "/wp-includes/", "wp-json", "wordpress"}},
	{name: "Drupal", category: "cms", confidence: "high",
		patterns: []string{"drupal.js", "/sites/default/files/", "Drupal.settings"}},
	{name: "Joomla", category: "cms", confidence: "high",
		patterns: []string{"/media/jui/", "joomla!", "/components/com_"}},

	// Page builders / hosted
	{name: "Wix", category: "builder", confidence: "high",
		patterns: []string{"wix.com/", "static.parastorage.com", "wixstatic.com"}},
	{name: "Webflow", category: "builder", confidence: "high",
		patterns: []string{"webflow.com", "data-wf-page", "webflow.js"}},
	{name: "Squarespace", category: "builder", confidence: "high",
		patterns: []string{"squarespace.com", "static.squarespace.com"}},

	// E-commerce
	{name: "Shopify", category: "ecommerce", confidence: "high",
		patterns: []string{"cdn.shopify.com", "shopify.theme", "myshopify.com"}},
	{name: "WooCommerce", category: "ecommerce", confidence: "high",
		patterns: []string{"woocommerce", "/wc-api/", "wc_add_to_cart"}},
	{name: "BigCommerce", category: "ecommerce", confidence: "high",
		patterns: []string{"bigcommerce.com", "bigcommercecdn.com"}},
	{name: "Magento", category: "ecommerce", confidence: "high",
		patterns: []string{"x-magento-init", "mage/bootstrap", "mage.cookies", "mage-init"}},

	// JS Frameworks
	{name: "Next.js", category: "framework", confidence: "high",
		patterns: []string{"_next/static", "__NEXT_DATA__", "/_next/"}},
	{name: "Nuxt.js", category: "framework", confidence: "high",
		patterns: []string{"__nuxt", "/_nuxt/", "nuxt.js"}},
	{name: "React", category: "framework", confidence: "medium",
		patterns: []string{"react.production.min.js", "data-reactroot", "data-reactid", "__reactFiber", "react-dom"}},
	{name: "Vue", category: "framework", confidence: "medium",
		patterns: []string{"vue.min.js", "vue.runtime", "__vue__", "vue@"}},
	{name: "Angular", category: "framework", confidence: "medium",
		patterns: []string{"ng-version", "angular.min.js", "angular/core"}},
	{name: "Svelte", category: "framework", confidence: "medium",
		patterns: []string{"__svelte", "svelte/"}},
	{name: "Gatsby", category: "framework", confidence: "high",
		patterns: []string{"___gatsby", "gatsby-chunk"}},

	// Analytics & Marketing
	{name: "Google Analytics 4", category: "analytics", confidence: "high",
		patterns: []string{"gtag/js?id=G-", "gtag('config', 'G-", `gtag("config", "G-`}},
	{name: "Google Analytics (UA)", category: "analytics", confidence: "high",
		patterns: []string{"google-analytics.com/analytics.js", "gtag('config', 'UA-", `gtag("config", "UA-`}},
	{name: "Google Tag Manager", category: "analytics", confidence: "high",
		patterns: []string{"googletagmanager.com/gtm.js", "GTM-", "googletagmanager.com/ns.html"}},
	{name: "Meta Pixel", category: "analytics", confidence: "high",
		patterns: []string{"connect.facebook.net/en_US/fbevents.js", "fbq('init'", `fbq("init"`}},
	{name: "HubSpot", category: "analytics", confidence: "high",
		patterns: []string{"js.hs-scripts.com", "hubspot.com", "_hsp"}},
	{name: "Hotjar", category: "analytics", confidence: "high",
		patterns: []string{"static.hotjar.com", "hjid", "hjsv"}},
	{name: "Intercom", category: "analytics", confidence: "high",
		patterns: []string{"widget.intercom.io", "intercomSettings"}},

	// CDN / Infrastructure
	{name: "Cloudflare", category: "cdn", confidence: "medium",
		patterns: []string{"__cf_bm", "cloudflare.com/cdn-cgi", "cf-ray", "cloudflareinsights.com"}},
	{name: "Amazon CloudFront", category: "cdn", confidence: "high",
		patterns: []string{"cloudfront.net", "x-amz-cf-id", "x-amz-cf-pop"}},
	{name: "AWS", category: "cdn", confidence: "medium",
		patterns: []string{"amazonaws.com", "s3.amazonaws.com", "aws-amplify"}},
	{name: "jsDelivr", category: "cdn", confidence: "medium",
		patterns: []string{"cdn.jsdelivr.net"}},
	{name: "unpkg", category: "cdn", confidence: "medium",
		patterns: []string{"unpkg.com/"}},
	{name: "Bootstrap", category: "framework", confidence: "medium",
		patterns: []string{"bootstrap.min.css", "bootstrap.min.js", "bootstrap@"}},
	{name: "jQuery", category: "framework", confidence: "medium",
		patterns: []string{"jquery.min.js", "jquery-", "/jquery/"}},

	// Proprietary / large platform signals
	{name: "Amazon (Proprietary)", category: "framework", confidence: "high",
		patterns: []string{"images-amazon.com", "media-amazon.com", "fls-na.amazon.com", "amazon-adsystem.com", "ssl-images-amazon.com"}},
	{name: "YouTube / Google Video", category: "framework", confidence: "high",
		patterns: []string{"youtube.com/embed", "ytimg.com", "youtube-nocookie.com"}},
	{name: "Salesforce", category: "analytics", confidence: "high",
		patterns: []string{"salesforce.com", "pardot.com", "force.com", "sfdcstatic.com"}},
	{name: "Zendesk", category: "analytics", confidence: "high",
		patterns: []string{"zendesk.com", "zdassets.com", "zendeskcdn.com"}},
	{name: "Stripe", category: "analytics", confidence: "high",
		patterns: []string{"js.stripe.com", "stripe.network", "stripe-js"}},
	{name: "Akamai", category: "cdn", confidence: "high",
		patterns: []string{"akamaihd.net", "akamai.net", "akamaized.net", "edgesuite.net"}},
	{name: "Fastly", category: "cdn", confidence: "high",
		patterns: []string{"fastly.net", "fastlylb.net"}},
	{name: "Vercel", category: "cdn", confidence: "high",
		patterns: []string{"vercel.app", "vercel-cdn", "_vercel"}},
	{name: "Netlify", category: "cdn", confidence: "high",
		patterns: []string{"netlify.app", "netlify.com"}},
	{name: "Tailwind CSS", category: "framework", confidence: "medium",
		patterns: []string{"tailwindcss", "cdn.tailwindcss.com"}},
	{name: "Alpine.js", category: "framework", confidence: "high",
		patterns: []string{"alpine.js", "alpinejs", "cdn.jsdelivr.net/npm/alpinejs", "x-cloak"}},
	{name: "HTMX", category: "framework", confidence: "high",
		patterns: []string{"htmx.org", "htmx.min.js", "unpkg.com/htmx"}},
	{name: "Segment", category: "analytics", confidence: "high",
		patterns: []string{"cdn.segment.com", "segment.io", "analytics.identify(", "analytics.track("}},
	{name: "Mixpanel", category: "analytics", confidence: "high",
		patterns: []string{"cdn.mxpnl.com", "mixpanel.com", "mixpanel.init"}},
	{name: "Klaviyo", category: "analytics", confidence: "high",
		patterns: []string{"klaviyo.com", "static.klaviyo.com"}},
	{name: "Crisp Chat", category: "analytics", confidence: "high",
		patterns: []string{"client.crisp.chat", "crisp.chat"}},
	{name: "Tawk.to", category: "analytics", confidence: "high",
		patterns: []string{"tawk.to", "embed.tawk.to"}},
}

// detectTech performs substring matching on the raw (lowercased) HTML string.
func detectTech(rawHTML string) []model.TechItem {
	lower := strings.ToLower(rawHTML)
	var found []model.TechItem
	seen := make(map[string]bool)

	for _, p := range techPatterns {
		if seen[p.name] {
			continue
		}
		for _, pat := range p.patterns {
			if strings.Contains(lower, strings.ToLower(pat)) {
				found = append(found, model.TechItem{
					Name:       p.name,
					Category:   p.category,
					Confidence: p.confidence,
				})
				seen[p.name] = true
				break
			}
		}
	}
	return found
}
