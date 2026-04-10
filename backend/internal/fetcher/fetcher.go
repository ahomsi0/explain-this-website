package fetcher

import (
	"compress/gzip"
	"context"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"strings"
	"time"

	"golang.org/x/net/publicsuffix"
)

// browserHeaders mimics a real Chrome 124 navigation request.
// Order matters — some WAFs fingerprint header order.
var browserHeaders = [][2]string{
	{"Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"},
	{"Accept-Language", "en-US,en;q=0.9"},
	{"Accept-Encoding", "gzip, deflate"},
	{"Cache-Control", "max-age=0"},
	{"Upgrade-Insecure-Requests", "1"},
	{"Sec-Fetch-Dest", "document"},
	{"Sec-Fetch-Mode", "navigate"},
	{"Sec-Fetch-Site", "none"},
	{"Sec-Fetch-User", "?1"},
	{"Connection", "keep-alive"},
}

const chromeUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
	"AppleWebKit/537.36 (KHTML, like Gecko) " +
	"Chrome/124.0.0.0 Safari/537.36"

// FetchHTML retrieves the raw HTML of the given URL.
func FetchHTML(ctx context.Context, targetURL string, maxBytes int64) (string, error) {
	if err := validateNoSSRF(targetURL); err != nil {
		return "", err
	}

	jar, _ := cookiejar.New(&cookiejar.Options{PublicSuffixList: publicsuffix.List})

	client := &http.Client{
		Jar:     jar,
		Timeout: 15 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 5 {
				return fmt.Errorf("too many redirects — the site may require a login")
			}
			// Carry browser headers through redirects.
			req.Header.Set("User-Agent", chromeUA)
			return nil
		},
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, targetURL, nil)
	if err != nil {
		return "", fmt.Errorf("could not build request: %w", err)
	}

	req.Header.Set("User-Agent", chromeUA)
	for _, h := range browserHeaders {
		req.Header.Set(h[0], h[1])
	}

	resp, err := client.Do(req)
	if err != nil {
		return "", friendlyFetchError(err)
	}
	defer resp.Body.Close()

	if err := friendlyStatusError(resp.StatusCode, targetURL); err != nil {
		return "", err
	}

	ct := resp.Header.Get("Content-Type")
	if ct != "" && !strings.Contains(ct, "text/html") && !strings.Contains(ct, "application/xhtml") {
		return "", fmt.Errorf("this URL doesn't serve a web page (Content-Type: %s) — try the homepage instead", ct)
	}

	body, err := readBody(resp, maxBytes)
	if err != nil {
		return "", fmt.Errorf("failed reading page content: %w", err)
	}

	return body, nil
}

// readBody handles gzip-encoded responses (since we request gzip explicitly,
// Go's transport won't auto-decompress for us).
func readBody(resp *http.Response, maxBytes int64) (string, error) {
	var reader io.Reader = resp.Body

	if strings.EqualFold(resp.Header.Get("Content-Encoding"), "gzip") {
		gz, err := gzip.NewReader(resp.Body)
		if err != nil {
			return "", fmt.Errorf("could not decompress response: %w", err)
		}
		defer gz.Close()
		reader = gz
	}

	b, err := io.ReadAll(io.LimitReader(reader, maxBytes))
	if err != nil {
		return "", err
	}
	return string(b), nil
}

// friendlyStatusError maps HTTP status codes to plain-English messages.
func friendlyStatusError(status int, targetURL string) error {
	switch {
	case status >= 200 && status < 300:
		return nil

	case status == 301 || status == 302 || status == 303 || status == 307 || status == 308:
		return fmt.Errorf("the site redirected too many times — it may require a login")

	case status == 401:
		return fmt.Errorf("this page requires a login (HTTP 401) — try the public homepage instead")

	case status == 403:
		return fmt.Errorf("access denied (HTTP 403) — this site has strict bot protection (e.g. Cloudflare). Try a different page or the root domain")

	case status == 404:
		return fmt.Errorf("page not found (404) — check the URL and try again")

	case status == 429:
		return fmt.Errorf("rate limited (429) — this site is blocking too many requests, try again in a moment")

	case status == 999:
		// LinkedIn's custom bot-blocking code.
		return fmt.Errorf("this site actively blocks automated requests (HTTP 999) — LinkedIn, Instagram, and similar platforms cannot be analyzed")

	case status >= 500:
		return fmt.Errorf("the target site returned a server error (HTTP %d) — it may be temporarily down", status)

	case status >= 400:
		return fmt.Errorf("the site returned HTTP %d — the page may require authentication or doesn't exist", status)

	default:
		return fmt.Errorf("unexpected HTTP status %d", status)
	}
}

// friendlyFetchError translates low-level network errors into readable messages.
func friendlyFetchError(err error) error {
	msg := err.Error()
	switch {
	case isTimeout(err):
		return fmt.Errorf("the site took too long to respond (timeout) — it may be slow or blocking requests")
	case strings.Contains(msg, "no such host"):
		return fmt.Errorf("domain not found — check the URL spelling and try again")
	case strings.Contains(msg, "connection refused"):
		return fmt.Errorf("connection refused — the site may be down or blocking requests")
	case strings.Contains(msg, "too many redirects"):
		return fmt.Errorf("too many redirects — this site may require a login to view")
	case strings.Contains(msg, "certificate"):
		return fmt.Errorf("SSL certificate error — the site has an invalid security certificate")
	default:
		return fmt.Errorf("could not reach the site: %s", msg)
	}
}

func isTimeout(err error) bool {
	if netErr, ok := err.(net.Error); ok && netErr.Timeout() {
		return true
	}
	msg := err.Error()
	return strings.Contains(msg, "context deadline exceeded") ||
		strings.Contains(msg, "context canceled") ||
		strings.Contains(msg, "timeout")
}

// validateNoSSRF rejects requests targeting private/loopback IP ranges.
func validateNoSSRF(rawURL string) error {
	u, err := url.Parse(rawURL)
	if err != nil {
		return fmt.Errorf("invalid URL")
	}

	host := u.Hostname()
	addrs, err := net.LookupHost(host)
	if err != nil {
		return nil // DNS failure will surface naturally during the fetch
	}

	for _, addr := range addrs {
		ip := net.ParseIP(addr)
		if ip == nil {
			continue
		}
		if isPrivateIP(ip) {
			return fmt.Errorf("requests to private or internal addresses are not allowed")
		}
	}
	return nil
}

func isPrivateIP(ip net.IP) bool {
	for _, cidr := range []string{"10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "127.0.0.0/8", "::1/128", "fc00::/7"} {
		_, network, err := net.ParseCIDR(cidr)
		if err != nil {
			continue
		}
		if network.Contains(ip) {
			return true
		}
	}
	return false
}
