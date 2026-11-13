package parser

// Technology evidence that comes from the HTTP response instead of the page
// source: what the server says about itself in its headers, and the names of
// the cookies it sets. Server-side frameworks such as Django or Laravel often
// leave no trace in the HTML, so this is the only place they can be seen.
//
// Cookie values are never stored or shown. Only the cookie's name is used, and
// the one rule that looks at a value (Flask) only checks its shape.

import (
	"net/http"
	"regexp"
	"sort"
	"strings"

	"github.com/ahomsi/explain-website/internal/model"
)

const (
	// A name that only one technology uses.
	scoreExplicit = 95
	// A default name that is distinctive but could be reused by someone else.
	scoreStrong = 80
	// A naming convention, not a fixed name. Reported as medium confidence.
	scoreConvention = 60
)

// headerTechSignal maps a substring of a self-describing response header to a
// technology. Headers are set by the serving infrastructure itself, which
// makes them the most reliable signal class available.
type headerTechSignal struct {
	match    string   // lowercased substring to find in a scanned header value
	name     string   // technology reported
	category string   // cms, framework, analytics, cdn, builder, ecommerce
	score    int      // 0 means scoreExplicit
	not      []string // skip when the value also contains any of these
}

// describingHeaders are the headers whose values name the software behind a
// response. Every headerTechSignal is checked against each of them.
var describingHeaders = []string{"X-Powered-By", "Powered-By", "Server", "X-Generator", "Via", "X-Cache"}

var headerTechSignals = []headerTechSignal{
	// Languages and frameworks
	{match: "php", name: "PHP", category: "framework"},
	{match: "express", name: "Express.js", category: "framework"},
	{match: "next.js", name: "Next.js", category: "framework"},
	{match: "nuxt", name: "Nuxt.js", category: "framework"},
	{match: "asp.net", name: "ASP.NET", category: "framework"},
	{match: "kestrel", name: "ASP.NET", category: "framework"},
	{match: "python", name: "Python", category: "framework"},
	{match: "werkzeug", name: "Flask", category: "framework", score: scoreConvention},
	{match: "servlet", name: "Java", category: "framework"},
	{match: "jsp/", name: "Java", category: "framework"},
	{match: "deno", name: "Deno", category: "framework"},

	// Web and application servers
	{match: "nginx", name: "Nginx", category: "framework"},
	{match: "apache", name: "Apache", category: "framework", not: []string{"coyote", "tomcat", "trafficserver", "traffic server"}},
	{match: "apache-coyote", name: "Apache Tomcat", category: "framework"},
	{match: "tomcat", name: "Apache Tomcat", category: "framework"},
	{match: "jetty", name: "Jetty", category: "framework"},
	{match: "litespeed", name: "LiteSpeed", category: "framework"},
	{match: "openresty", name: "OpenResty", category: "framework"},
	{match: "tengine", name: "Tengine", category: "framework"},
	{match: "lighttpd", name: "lighttpd", category: "framework"},
	{match: "caddy", name: "Caddy", category: "framework"},
	{match: "microsoft-iis", name: "Microsoft IIS", category: "framework"},
	{match: "gunicorn", name: "Gunicorn", category: "framework"},
	{match: "uvicorn", name: "Uvicorn", category: "framework"},
	{match: "phusion passenger", name: "Phusion Passenger", category: "framework"},
	{match: "cowboy", name: "Cowboy", category: "framework"},
	{match: "envoy", name: "Envoy", category: "framework"},
	{match: "kong/", name: "Kong", category: "framework"},
	{match: "varnish", name: "Varnish", category: "framework"},

	// CMS, builders and shops
	{match: "drupal", name: "Drupal", category: "cms"},
	{match: "wordpress", name: "WordPress", category: "cms"},
	{match: "craft cms", name: "Craft CMS", category: "cms"},
	{match: "strapi", name: "Strapi", category: "cms"},
	{match: "wix", name: "Wix", category: "builder"},
	{match: "pepyaka", name: "Wix", category: "builder"},
	{match: "squarespace", name: "Squarespace", category: "builder"},
	{match: "shopify", name: "Shopify", category: "ecommerce"},

	// Hosting, CDNs and edge protection
	{match: "cloudflare", name: "Cloudflare", category: "cdn"},
	{match: "vercel", name: "Vercel", category: "cdn"},
	{match: "netlify", name: "Netlify", category: "cdn"},
	{match: "cloudfront", name: "Amazon CloudFront", category: "cdn"},
	{match: "amazons3", name: "AWS S3", category: "cdn"},
	{match: "awselb", name: "AWS Elastic Load Balancing", category: "cdn"},
	{match: "akamai", name: "Akamai", category: "cdn"},
	{match: "github.com", name: "GitHub Pages", category: "cdn"},
	{match: "fly/", name: "Fly.io", category: "cdn"},
	{match: "railway", name: "Railway", category: "cdn"},
	{match: "heroku", name: "Heroku", category: "cdn"},
	{match: "vegur", name: "Heroku", category: "cdn"},
	{match: "1.1 google", name: "Google Cloud", category: "cdn"},
	{match: "bunnycdn", name: "BunnyCDN", category: "cdn"},
	{match: "keycdn", name: "KeyCDN", category: "cdn"},
	{match: "sucuri", name: "Sucuri", category: "cdn"},
	{match: "ddos-guard", name: "DDoS-Guard", category: "cdn"},
	{match: "wp engine", name: "WP Engine", category: "cdn"},
	{match: "plesk", name: "Plesk", category: "cdn"},
}

// headerPresenceSignal maps a header that only one technology sends to that
// technology. The header's presence is the evidence, whatever its value.
type headerPresenceSignal struct {
	header   string
	name     string
	category string
}

var headerPresenceSignals = []headerPresenceSignal{
	{header: "X-Vercel-Id", name: "Vercel", category: "cdn"},
	{header: "Cf-Ray", name: "Cloudflare", category: "cdn"},
	{header: "X-Amz-Cf-Id", name: "Amazon CloudFront", category: "cdn"},
	{header: "X-Nf-Request-Id", name: "Netlify", category: "cdn"},
	{header: "X-Github-Request-Id", name: "GitHub Pages", category: "cdn"},
	{header: "Fly-Request-Id", name: "Fly.io", category: "cdn"},
	{header: "X-Render-Origin-Server", name: "Render", category: "cdn"},
	{header: "X-Railway-Request-Id", name: "Railway", category: "cdn"},
	{header: "X-Railway-Edge", name: "Railway", category: "cdn"},
	{header: "X-Azure-Ref", name: "Microsoft Azure", category: "cdn"},
	{header: "X-Fastly-Request-Id", name: "Fastly", category: "cdn"},
	{header: "X-Akamai-Transformed", name: "Akamai", category: "cdn"},
	{header: "X-Kinsta-Cache", name: "Kinsta", category: "cdn"},
	{header: "X-Pantheon-Styx-Hostname", name: "Pantheon", category: "cdn"},
	{header: "X-Sucuri-Id", name: "Sucuri", category: "cdn"},
	{header: "X-Sucuri-Cache", name: "Sucuri", category: "cdn"},
	{header: "X-Iinfo", name: "Imperva", category: "cdn"},
	{header: "X-Datadome", name: "DataDome", category: "cdn"},
	{header: "X-Powered-By-Plesk", name: "Plesk", category: "cdn"},
	{header: "X-Litespeed-Cache", name: "LiteSpeed", category: "framework"},
	{header: "X-Varnish", name: "Varnish", category: "framework"},
	{header: "X-Aspnet-Version", name: "ASP.NET", category: "framework"},
	{header: "X-Aspnetmvc-Version", name: "ASP.NET", category: "framework"},
	{header: "X-Nextjs-Cache", name: "Next.js", category: "framework"},
	{header: "X-Nextjs-Prerender", name: "Next.js", category: "framework"},
	{header: "X-Drupal-Cache", name: "Drupal", category: "cms"},
	{header: "X-Drupal-Dynamic-Cache", name: "Drupal", category: "cms"},
	{header: "X-Pingback", name: "WordPress", category: "cms"},
	{header: "X-Hs-Hub-Id", name: "HubSpot CMS", category: "cms"},
	{header: "X-Wix-Request-Id", name: "Wix", category: "builder"},
	{header: "X-Magento-Tags", name: "Magento", category: "ecommerce"},
	{header: "X-Magento-Cache-Debug", name: "Magento", category: "ecommerce"},
	{header: "X-Shopify-Stage", name: "Shopify", category: "ecommerce"},
	{header: "X-Shopid", name: "Shopify", category: "ecommerce"},
	{header: "X-Sorting-Hat-Shopid", name: "Shopify", category: "ecommerce"},
}

// cookieTechSignal maps the name of a cookie the server sets to the technology
// that uses that name by default. Names are compared lowercased, with the
// "__Secure-" and "__Host-" prefixes removed.
type cookieTechSignal struct {
	cookie   string
	prefix   bool // match names that start with cookie, not just equal it
	name     string
	category string
	score    int // 0 means scoreExplicit
}

var cookieTechSignals = []cookieTechSignal{
	// Server-side frameworks
	{cookie: "csrftoken", name: "Django", category: "framework", score: scoreStrong},
	{cookie: "django_language", name: "Django", category: "framework"},
	{cookie: "laravel_session", name: "Laravel", category: "framework"},
	{cookie: "laravel_token", name: "Laravel", category: "framework"},
	{cookie: "phpsessid", name: "PHP", category: "framework"},
	{cookie: "jsessionid", name: "Java", category: "framework"},
	{cookie: "asp.net_sessionid", name: "ASP.NET", category: "framework"},
	{cookie: ".aspxauth", name: "ASP.NET", category: "framework"},
	{cookie: ".aspnetcore.", prefix: true, name: "ASP.NET", category: "framework"},
	{cookie: ".aspnet.", prefix: true, name: "ASP.NET", category: "framework"},
	{cookie: "__requestverificationtoken", prefix: true, name: "ASP.NET", category: "framework"},
	{cookie: "connect.sid", name: "Express.js", category: "framework", score: scoreStrong},
	{cookie: "express:sess", prefix: true, name: "Express.js", category: "framework", score: scoreStrong},
	{cookie: "sails.sid", name: "Sails.js", category: "framework"},
	{cookie: "koa.sess", prefix: true, name: "Koa", category: "framework", score: scoreStrong},
	{cookie: "koa:sess", prefix: true, name: "Koa", category: "framework", score: scoreStrong},
	{cookie: "ci_session", name: "CodeIgniter", category: "framework"},
	{cookie: "cakephp", name: "CakePHP", category: "framework"},
	{cookie: "play_session", name: "Play Framework", category: "framework"},
	{cookie: "yii_csrf_token", name: "Yii", category: "framework"},
	{cookie: "_csrf-frontend", name: "Yii", category: "framework", score: scoreStrong},
	{cookie: "_csrf-backend", name: "Yii", category: "framework", score: scoreStrong},
	{cookie: "__next_preview_data", name: "Next.js", category: "framework"},
	{cookie: "__prerender_bypass", name: "Next.js", category: "framework"},
	{cookie: "next-auth.", prefix: true, name: "NextAuth.js", category: "framework"},
	{cookie: "authjs.", prefix: true, name: "NextAuth.js", category: "framework"},

	// CMS, builders and shops
	{cookie: "wordpress_", prefix: true, name: "WordPress", category: "cms"},
	{cookie: "wp-settings-", prefix: true, name: "WordPress", category: "cms"},
	{cookie: "wp_woocommerce_session_", prefix: true, name: "WooCommerce", category: "ecommerce"},
	{cookie: "woocommerce_", prefix: true, name: "WooCommerce", category: "ecommerce"},
	{cookie: "moodlesession", prefix: true, name: "Moodle", category: "cms"},
	{cookie: "fe_typo_user", name: "Typo3", category: "cms"},
	{cookie: "bitrix_sm_", prefix: true, name: "1C-Bitrix", category: "cms"},
	{cookie: "craftsessionid", name: "Craft CMS", category: "cms"},
	{cookie: "ghost-members-ssr", prefix: true, name: "Ghost", category: "cms"},
	{cookie: "ghost-admin-api-session", name: "Ghost", category: "cms"},
	{cookie: "_forum_session", name: "Discourse", category: "cms"},
	{cookie: ".dotnetnuke", name: "DNN", category: "cms"},
	{cookie: "dotnetnukeanonymous", name: "DNN", category: "cms"},
	{cookie: "sc_analytics_global_cookie", name: "Sitecore", category: "cms"},
	{cookie: "svsession", name: "Wix", category: "builder", score: scoreStrong},
	{cookie: "_shopify_", prefix: true, name: "Shopify", category: "ecommerce"},
	{cookie: "secure_customer_sig", name: "Shopify", category: "ecommerce"},
	{cookie: "prestashop-", prefix: true, name: "PrestaShop", category: "ecommerce"},
	{cookie: "ocsessid", name: "OpenCart", category: "ecommerce"},

	// Hosting, load balancers and edge protection
	{cookie: "__cf_bm", name: "Cloudflare", category: "cdn"},
	{cookie: "cf_clearance", name: "Cloudflare", category: "cdn"},
	{cookie: "__cfruid", name: "Cloudflare", category: "cdn"},
	{cookie: "_cfuvid", name: "Cloudflare", category: "cdn"},
	{cookie: "__cflb", name: "Cloudflare", category: "cdn"},
	{cookie: "awsalb", prefix: true, name: "AWS Elastic Load Balancing", category: "cdn"},
	{cookie: "awselb", prefix: true, name: "AWS Elastic Load Balancing", category: "cdn"},
	{cookie: "arraffinity", prefix: true, name: "Microsoft Azure", category: "cdn"},
	{cookie: "incap_ses_", prefix: true, name: "Imperva", category: "cdn"},
	{cookie: "visid_incap_", prefix: true, name: "Imperva", category: "cdn"},
	{cookie: "ak_bmsc", name: "Akamai", category: "cdn"},
	{cookie: "bm_sv", name: "Akamai", category: "cdn"},
	{cookie: "bm_sz", name: "Akamai", category: "cdn"},
	{cookie: "_abck", name: "Akamai", category: "cdn"},
	{cookie: "datadome", name: "DataDome", category: "cdn"},
	{cookie: "sucuri_cloudproxy_uuid_", prefix: true, name: "Sucuri", category: "cdn"},
	{cookie: "bigipserver", prefix: true, name: "F5 BIG-IP", category: "cdn"},
	{cookie: "_pxhd", name: "PerimeterX", category: "cdn"},
}

// conventionTechNames lists technologies that detectHeaderTech reports from a
// naming convention instead of a table above. The catalog count test reads
// this, so a rule added below needs its name added here.
var conventionTechNames = []string{"Ruby on Rails", "Laravel", "Drupal", "Flask", "WordPress", "Fastly"}

var (
	// Drupal names its session cookie SESS or SSESS plus a 32 character hash.
	drupalSessionCookieRe = regexp.MustCompile(`^s?sess[0-9a-f]{32}$`)
	// Flask signs its session as payload.timestamp.signature. The short middle
	// part is what tells it apart from a JWT, whose first two parts both start
	// with "eyJ".
	flaskSessionValueRe = regexp.MustCompile(`^(\.eJ|eyJ)[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{4,8}\.[A-Za-z0-9_-]{20,}$`)
)

type responseCookie struct {
	name  string // lowercased, without __Secure- or __Host-
	shown string // the name as the server sent it
	value string
}

// responseCookies returns the cookies a response sets. Malformed entries and
// absurdly long names are dropped.
func responseCookies(headers http.Header) []responseCookie {
	var cookies []responseCookie
	for _, line := range headers.Values("Set-Cookie") {
		pair, _, _ := strings.Cut(line, ";")
		rawName, value, ok := strings.Cut(pair, "=")
		rawName = strings.TrimSpace(rawName)
		if !ok || rawName == "" || len(rawName) > 80 {
			continue
		}
		name := strings.ToLower(rawName)
		name = strings.TrimPrefix(name, "__secure-")
		name = strings.TrimPrefix(name, "__host-")
		cookies = append(cookies, responseCookie{name: name, shown: rawName, value: strings.TrimSpace(value)})
	}
	return cookies
}

const maxSignalsPerHeaderTech = 3

type headerTechHit struct {
	category string
	score    int
	ruleID   string
	signals  []model.TechSignal
}

type headerTechHits map[string]*headerTechHit

func (hits headerTechHits) add(name, category string, score int, ruleID, pattern, match string) {
	if score == 0 {
		score = scoreExplicit
	}
	evidence := "explicit"
	if score < scoreStrong {
		evidence = "indirect"
	}
	signal := model.TechSignal{
		Pattern:      pattern,
		Match:        truncateHeaderValue(strings.TrimSpace(match)),
		EvidenceType: evidence,
		Source:       "first-party",
	}

	hit, exists := hits[name]
	if !exists {
		hits[name] = &headerTechHit{category: category, score: score, ruleID: ruleID, signals: []model.TechSignal{signal}}
		return
	}
	if score > hit.score {
		hit.score, hit.ruleID, hit.category = score, ruleID, category
	}
	for _, s := range hit.signals {
		if s.Pattern == signal.Pattern && s.Match == signal.Match {
			return
		}
	}
	if len(hit.signals) < maxSignalsPerHeaderTech {
		hit.signals = append(hit.signals, signal)
	}
}

const (
	ruleHeader = "http-header"
	ruleCookie = "http-cookie"
)

// detectHeaderTech derives technologies from HTTP response headers and from
// the names of the cookies the response sets.
func detectHeaderTech(headers http.Header) []model.TechItem {
	if len(headers) == 0 {
		return nil
	}
	hits := headerTechHits{}

	for _, key := range describingHeaders {
		for _, value := range headers.Values(key) {
			lower := strings.ToLower(value)
			for _, sig := range headerTechSignals {
				if !strings.Contains(lower, sig.match) || containsAny(lower, sig.not) {
					continue
				}
				hits.add(sig.name, sig.category, sig.score, ruleHeader, "response header", value)
			}
		}
	}

	for _, sig := range headerPresenceSignals {
		if len(headers.Values(sig.header)) > 0 {
			hits.add(sig.name, sig.category, scoreExplicit, ruleHeader, "response header", strings.ToLower(sig.header))
		}
	}

	// WordPress announces its REST API in a Link header.
	for _, value := range headers.Values("Link") {
		if strings.Contains(strings.ToLower(value), "api.w.org") {
			hits.add("WordPress", "cms", scoreExplicit, ruleHeader, "response header", "link: api.w.org")
		}
	}
	// Fastly names its cache nodes "cache-<airport><number>".
	for _, value := range headers.Values("X-Served-By") {
		// A request that crossed several nodes lists them all; one is enough.
		node, _, _ := strings.Cut(strings.TrimSpace(value), ",")
		if strings.HasPrefix(strings.ToLower(node), "cache-") {
			hits.add("Fastly", "cdn", scoreStrong, ruleHeader, "response header", "x-served-by: "+node)
		}
	}

	cookies := responseCookies(headers)
	hasXSRFToken := false
	for _, c := range cookies {
		if c.name == "xsrf-token" {
			hasXSRFToken = true
		}
	}
	for _, c := range cookies {
		for _, sig := range cookieTechSignals {
			if c.name == sig.cookie || (sig.prefix && strings.HasPrefix(c.name, sig.cookie)) {
				hits.add(sig.name, sig.category, sig.score, ruleCookie, "cookie name", c.shown)
			}
		}

		switch {
		case drupalSessionCookieRe.MatchString(c.name):
			hits.add("Drupal", "cms", scoreStrong, ruleCookie, "cookie name", c.shown)
		case isRailsSessionCookie(c.name):
			hits.add("Ruby on Rails", "framework", scoreConvention, ruleCookie, "cookie name", c.shown)
		case hasXSRFToken && isLaravelSessionCookie(c.name):
			// Laravel names its session "<app>_session" and always pairs it
			// with an XSRF-TOKEN cookie.
			hits.add("Laravel", "framework", scoreConvention, ruleCookie, "cookie name", c.shown)
		case c.name == "session" && flaskSessionValueRe.MatchString(c.value):
			hits.add("Flask", "framework", scoreConvention, ruleCookie, "cookie name", c.shown)
		}
	}

	// Fastly runs on Varnish and says so in its Via header. Reporting both
	// would describe the same layer twice.
	if _, fastly := hits["Fastly"]; fastly {
		delete(hits, "Varnish")
	}

	names := make([]string, 0, len(hits))
	for name := range hits {
		names = append(names, name)
	}
	sort.Strings(names)

	items := make([]model.TechItem, 0, len(hits))
	for _, name := range names {
		hit := hits[name]
		items = append(items, model.TechItem{
			Name:       name,
			Category:   hit.category,
			Confidence: confidenceFromScore(hit.score),
			Score:      hit.score,
			RuleID:     hit.ruleID,
			Signals:    hit.signals,
		})
	}
	return items
}

// isRailsSessionCookie reports whether name follows the Rails default of
// "_<app>_session". Shopify storefronts run on Rails but are reported as
// Shopify, so their cookies are left out.
func isRailsSessionCookie(name string) bool {
	if name == "_session_id" {
		return true
	}
	if !strings.HasPrefix(name, "_") || !strings.HasSuffix(name, "_session") {
		return false
	}
	if strings.HasPrefix(name, "_shopify") || strings.HasPrefix(name, "_secure") {
		return false
	}
	return len(name) > len("__session")
}

// isLaravelSessionCookie reports whether name follows the Laravel default of
// "<app>_session". It is only meaningful next to an XSRF-TOKEN cookie.
func isLaravelSessionCookie(name string) bool {
	return strings.HasSuffix(name, "_session") && !strings.HasPrefix(name, "_") && len(name) > len("_session")
}

func containsAny(s string, needles []string) bool {
	for _, n := range needles {
		if strings.Contains(s, n) {
			return true
		}
	}
	return false
}

func truncateHeaderValue(v string) string {
	if len(v) > 60 {
		return v[:60]
	}
	return v
}
