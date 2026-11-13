package parser

import (
	"net/http"
	"strings"
	"testing"

	"github.com/ahomsi/explain-website/internal/model"
)

func headerTechByName(headers http.Header) map[string]model.TechItem {
	out := map[string]model.TechItem{}
	for _, item := range detectHeaderTech(headers) {
		out[item.Name] = item
	}
	return out
}

func cookieHeaders(cookies ...string) http.Header {
	h := http.Header{}
	for _, c := range cookies {
		h.Add("Set-Cookie", c)
	}
	return h
}

func TestCookieNamesIdentifyServerFrameworks(t *testing.T) {
	cases := []struct {
		cookie string
		want   string
	}{
		{"csrftoken=abc123; Path=/; SameSite=Lax", "Django"},
		{"laravel_session=eyJpdiI6; path=/; httponly", "Laravel"},
		{"PHPSESSID=9f2c; path=/", "PHP"},
		{"JSESSIONID=1A2B3C; Path=/; HttpOnly", "Java"},
		{"ASP.NET_SessionId=xyz; path=/; HttpOnly", "ASP.NET"},
		{".AspNetCore.Antiforgery.w5W7x28NAIs=CfDJ8; path=/", "ASP.NET"},
		{"connect.sid=s%3Aabc; Path=/; HttpOnly", "Express.js"},
		{"ci_session=abc; path=/", "CodeIgniter"},
		{"CAKEPHP=abc; path=/", "CakePHP"},
		{"wordpress_test_cookie=WP%20Cookie%20check; path=/", "WordPress"},
		{"_shopify_y=1234; path=/", "Shopify"},
		{"__cf_bm=abc; path=/; Secure", "Cloudflare"},
		{"AWSALB=abc; Path=/", "AWS Elastic Load Balancing"},
		{"ARRAffinity=abc; Path=/; HttpOnly", "Microsoft Azure"},
		{"__Secure-next-auth.session-token=abc; Path=/", "NextAuth.js"},
		{"MoodleSession=abc; path=/", "Moodle"},
	}
	for _, tc := range cases {
		got := headerTechByName(cookieHeaders(tc.cookie))
		item, ok := got[tc.want]
		if !ok {
			t.Errorf("cookie %q: want %s, got %v", tc.cookie, tc.want, got)
			continue
		}
		if item.Confidence != "high" {
			t.Errorf("cookie %q: %s should be high confidence, got %s", tc.cookie, tc.want, item.Confidence)
		}
		if item.RuleID != "http-cookie" {
			t.Errorf("cookie %q: rule id = %q, want http-cookie", tc.cookie, item.RuleID)
		}
	}
}

// The evidence shown in a report is the cookie's name. Its value can be a
// session identifier and must never leave the parser.
func TestCookieValuesNeverAppearInEvidence(t *testing.T) {
	const secret = "s3cr3t-session-value-0123456789"
	headers := cookieHeaders(
		"csrftoken="+secret+"; Path=/",
		"laravel_session="+secret+"; path=/",
		"PHPSESSID="+secret+"; path=/",
		"session=eyJ1c2VyIjoiYWxpY2UifQ.ZxYz12.abcdefghijklmnopqrstuvwxyz0; Path=/",
	)
	items := detectHeaderTech(headers)
	if len(items) == 0 {
		t.Fatal("expected cookie detections")
	}
	for _, item := range items {
		for _, sig := range item.Signals {
			if strings.Contains(sig.Match, secret) || strings.Contains(sig.Match, "eyJ1c2Vy") {
				t.Fatalf("%s evidence leaks a cookie value: %q", item.Name, sig.Match)
			}
			if strings.Contains(sig.Match, "=") {
				t.Fatalf("%s evidence should be a bare cookie name, got %q", item.Name, sig.Match)
			}
		}
	}
}

func TestNamingConventionsAreMediumConfidence(t *testing.T) {
	rails := headerTechByName(cookieHeaders("_myapp_session=abc; path=/; HttpOnly"))
	if item, ok := rails["Ruby on Rails"]; !ok || item.Confidence != "medium" {
		t.Fatalf("want Ruby on Rails at medium confidence, got %+v", rails)
	}

	laravel := headerTechByName(cookieHeaders("XSRF-TOKEN=abc; path=/", "acme_shop_session=abc; path=/; httponly"))
	if item, ok := laravel["Laravel"]; !ok || item.Confidence != "medium" {
		t.Fatalf("want Laravel at medium confidence, got %+v", laravel)
	}

	flask := headerTechByName(cookieHeaders("session=eyJ1c2VyIjoiYWxpY2UifQ.ZxYz12.abcdefghijklmnopqrstuvwxyz0; HttpOnly; Path=/"))
	if item, ok := flask["Flask"]; !ok || item.Confidence != "medium" {
		t.Fatalf("want Flask at medium confidence, got %+v", flask)
	}

	drupal := headerTechByName(cookieHeaders("SSESS0123456789abcdef0123456789abcdef=abc; path=/"))
	if _, ok := drupal["Drupal"]; !ok {
		t.Fatalf("want Drupal from its session cookie, got %+v", drupal)
	}
}

func TestOrdinaryCookiesIdentifyNothing(t *testing.T) {
	cases := [][]string{
		{"session=abc123; Path=/"}, // a plain value, not a Flask signed session
		{"session=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U; Path=/"}, // a JWT
		{"sessionid=abc; Path=/"},
		{"XSRF-TOKEN=abc; Path=/"},   // on its own it is not Laravel
		{"shop_session=abc; Path=/"}, // "<app>_session" without XSRF-TOKEN
		{"__session=abc; Path=/"},
		{"_secure_session_id=abc; Path=/"},
		{"theme=dark; Path=/", "lang=en; Path=/", "_ga=GA1.2.3; Path=/"},
		{"=novalue", "justaname", strings.Repeat("x", 200) + "=1"},
	}
	for _, cookies := range cases {
		if got := detectHeaderTech(cookieHeaders(cookies...)); len(got) != 0 {
			t.Errorf("cookies %v should identify nothing, got %+v", cookies, got)
		}
	}
}

func TestServerHeadersIdentifyTheStack(t *testing.T) {
	cases := []struct {
		header, value string
		want          string
	}{
		{"Server", "gunicorn", "Gunicorn"},
		{"Server", "uvicorn", "Uvicorn"},
		{"Server", "Werkzeug/3.0.1 Python/3.11.4", "Flask"},
		{"Server", "Werkzeug/3.0.1 Python/3.11.4", "Python"},
		{"Server", "Microsoft-IIS/10.0", "Microsoft IIS"},
		{"Server", "LiteSpeed", "LiteSpeed"},
		{"Server", "openresty/1.21.4.1", "OpenResty"},
		{"Server", "Caddy", "Caddy"},
		{"Server", "Apache-Coyote/1.1", "Apache Tomcat"},
		{"Server", "AmazonS3", "AWS S3"},
		{"Server", "Kestrel", "ASP.NET"},
		{"X-Powered-By", "Phusion Passenger(R) 6.0.18", "Phusion Passenger"},
		{"X-Powered-By", "Servlet/3.1 JSP/2.3", "Java"},
		{"Powered-By", "Shopify", "Shopify"},
		{"Via", "1.1 vegur", "Heroku"},
		{"Via", "1.1 google", "Google Cloud"},
		{"X-Cache", "Miss from cloudfront", "Amazon CloudFront"},
		{"Cf-Ray", "8a1b2c3d4e5f-FRA", "Cloudflare"},
		{"X-Drupal-Cache", "HIT", "Drupal"},
		{"X-Pingback", "https://example.com/xmlrpc.php", "WordPress"},
		{"Link", `<https://example.com/wp-json/>; rel="https://api.w.org/"`, "WordPress"},
		{"X-Magento-Tags", "cms_p_2", "Magento"},
		{"X-Aspnet-Version", "4.0.30319", "ASP.NET"},
		{"X-Github-Request-Id", "ABCD:1234", "GitHub Pages"},
		{"X-Served-By", "cache-fra-eddf8230043-FRA", "Fastly"},
	}
	for _, tc := range cases {
		h := http.Header{}
		h.Set(tc.header, tc.value)
		if _, ok := headerTechByName(h)[tc.want]; !ok {
			t.Errorf("%s: %s should identify %s, got %v", tc.header, tc.value, tc.want, headerTechByName(h))
		}
	}
}

func TestServerHeadersAreNotMisread(t *testing.T) {
	tomcat := http.Header{}
	tomcat.Set("Server", "Apache-Coyote/1.1")
	if _, ok := headerTechByName(tomcat)["Apache"]; ok {
		t.Error("Tomcat's connector must not be reported as the Apache web server")
	}

	// Fastly is built on Varnish and says so; the report names the layer once.
	fastly := http.Header{}
	fastly.Set("Via", "1.1 varnish")
	fastly.Set("X-Served-By", "cache-lhr-egll1980052-LHR")
	got := headerTechByName(fastly)
	if _, ok := got["Fastly"]; !ok {
		t.Errorf("want Fastly, got %v", got)
	}
	if _, ok := got["Varnish"]; ok {
		t.Error("Varnish should not be listed next to Fastly")
	}

	// A Link header that preloads a stylesheet is not a WordPress signal.
	link := http.Header{}
	link.Set("Link", "<https://cdn.example.com/app.css>; rel=preload; as=style")
	if got := detectHeaderTech(link); len(got) != 0 {
		t.Errorf("a preload Link header should identify nothing, got %+v", got)
	}
}

func TestCookieEvidenceMergesIntoTheTechStack(t *testing.T) {
	headers := cookieHeaders("csrftoken=abc; Path=/", "laravel_session=abc; path=/")
	headers.Set("Server", "gunicorn")

	items := detectTech("<html><body><h1>Dashboard</h1></body></html>", "https://example.com", headers)
	got := map[string]bool{}
	for _, item := range items {
		got[item.Name] = true
	}
	for _, want := range []string{"Django", "Laravel", "Gunicorn"} {
		if !got[want] {
			t.Errorf("want %s in the tech stack, got %v", want, got)
		}
	}
}

// Every name these tables can report must be listed once, with one category,
// so a technology never appears twice in a report under different groups.
func TestHeaderAndCookieSignalsAgreeOnCategories(t *testing.T) {
	categories := map[string]string{}
	check := func(name, category string) {
		if prev, ok := categories[name]; ok && prev != category {
			t.Errorf("%s is listed as both %q and %q", name, prev, category)
		}
		categories[name] = category
	}
	for _, s := range headerTechSignals {
		check(s.name, s.category)
	}
	for _, s := range headerPresenceSignals {
		check(s.name, s.category)
	}
	for _, s := range cookieTechSignals {
		check(s.name, s.category)
	}
	for _, p := range techPatterns {
		if prev, ok := categories[p.name]; ok && prev != p.category {
			t.Errorf("%s is %q in the header tables but %q in the page patterns", p.name, prev, p.category)
		}
	}
}

func TestGitHubItselfIsNotAGitHubPagesSite(t *testing.T) {
	headers := http.Header{}
	headers.Set("Server", "github.com")

	for _, item := range detectTech("<html></html>", "https://github.com/", headers) {
		if item.Name == "GitHub Pages" {
			t.Fatal("github.com must not be reported as hosted on GitHub Pages")
		}
	}
	hosted := false
	for _, item := range detectTech("<html></html>", "https://docs.example.com/", headers) {
		hosted = hosted || item.Name == "GitHub Pages"
	}
	if !hosted {
		t.Fatal("a site answering with GitHub's Server header should be reported as GitHub Pages")
	}
}
