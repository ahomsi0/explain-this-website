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
	// Pre-flight SSRF check (early rejection before spending resources on a connection).
	if err := validateNoSSRF(targetURL); err != nil {
		return "", err
	}

	jar, _ := cookiejar.New(&cookiejar.Options{PublicSuffixList: publicsuffix.List})

	// safeDialer resolves DNS fresh at dial time and validates every resolved IP.
	// This prevents DNS-rebinding attacks where the pre-flight check passes but a
	// subsequent DNS response returns a private address.
	safeDialer := &net.Dialer{
		Timeout:   30 * time.Second,
		KeepAlive: 30 * time.Second,
	}

	transport := &http.Transport{
		DialContext: func(ctx context.Context, network, addr string) (net.Conn, error) {
			host, port, err := net.SplitHostPort(addr)
			if err != nil {
				return nil, err
			}

			// If the transport already gave us a raw IP, validate it directly.
			if ip := net.ParseIP(host); ip != nil {
				if isPrivateIP(ip) {
					return nil, fmt.Errorf("requests to private or internal addresses are not allowed")
				}
				return safeDialer.DialContext(ctx, network, addr)
			}

			// Resolve hostname → IPs fresh (prevents DNS rebinding TOCTOU).
			ipAddrs, err := net.DefaultResolver.LookupIPAddr(ctx, host)
			if err != nil || len(ipAddrs) == 0 {
				return nil, fmt.Errorf("could not resolve host")
			}

			// Validate every resolved IP before choosing one to connect to.
			for _, ipa := range ipAddrs {
				if isPrivateIP(ipa.IP) {
					return nil, fmt.Errorf("requests to private or internal addresses are not allowed")
				}
			}

			// Connect to the first validated IP explicitly (not the hostname) so
			// the OS cannot perform a second DNS lookup with a different result.
			return safeDialer.DialContext(ctx, network, net.JoinHostPort(ipAddrs[0].IP.String(), port))
		},
		TLSHandshakeTimeout:   10 * time.Second,
		ResponseHeaderTimeout: 15 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,
	}

	client := &http.Client{
		Transport: transport,
		Jar:       jar,
		Timeout:   timeoutFromContext(ctx, 15*time.Second),
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 5 {
				return fmt.Errorf("too many redirects — the site may require a login")
			}
			// Re-validate every redirect target to prevent redirect-based SSRF.
			if err := validateNoSSRF(req.URL.String()); err != nil {
				return err
			}
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
		return fmt.Errorf("this page requires a login — try the public homepage instead")
	case status == 403:
		return fmt.Errorf("access denied — this site has strict bot protection. Try a different page or the root domain")
	case status == 404:
		return fmt.Errorf("page not found — check the URL and try again")
	case status == 429:
		return fmt.Errorf("the site is rate-limiting requests — try again in a moment")
	case status == 999:
		return fmt.Errorf("this site actively blocks automated requests — LinkedIn, Instagram, and similar platforms cannot be analyzed")
	case status >= 500:
		return fmt.Errorf("the target site returned a server error — it may be temporarily down")
	default:
		return fmt.Errorf("the site returned an unexpected response — the page may require authentication")
	}
}

// friendlyFetchError translates low-level network errors into readable messages
// without leaking information useful for reconnaissance.
func friendlyFetchError(err error) error {
	msg := err.Error()
	switch {
	case isTimeout(err):
		return fmt.Errorf("the site took too long to respond — it may be slow or blocking requests")
	case strings.Contains(msg, "no such host"),
		strings.Contains(msg, "could not resolve host"):
		return fmt.Errorf("domain not found — check the URL spelling and try again")
	case strings.Contains(msg, "connection refused"),
		strings.Contains(msg, "private or internal"):
		return fmt.Errorf("could not connect to the site — it may be down or not publicly accessible")
	case strings.Contains(msg, "too many redirects"):
		return fmt.Errorf("too many redirects — this site may require a login to view")
	case strings.Contains(msg, "certificate"):
		return fmt.Errorf("SSL certificate error — the site has an invalid security certificate")
	default:
		return fmt.Errorf("could not reach the site — please check the URL and try again")
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

// validateNoSSRF is an early-rejection check before opening a connection.
// The DialContext in FetchHTML provides the true defence against DNS rebinding;
// this function just avoids wasting resources on obviously bad inputs.
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

// blockedCIDRs is parsed once at startup so isPrivateIP never re-parses strings.
var blockedCIDRs []*net.IPNet

func init() {
	for _, cidr := range []string{
		"10.0.0.0/8",      // RFC 1918 private
		"172.16.0.0/12",   // RFC 1918 private
		"192.168.0.0/16",  // RFC 1918 private
		"127.0.0.0/8",     // IPv4 loopback
		"169.254.0.0/16",  // IPv4 link-local (covers AWS metadata 169.254.169.254)
		"0.0.0.0/8",       // "this" network
		"100.64.0.0/10",   // shared address space / CGNAT
		"192.0.0.0/24",    // IETF protocol assignments
		"198.18.0.0/15",   // network benchmark tests
		"198.51.100.0/24", // documentation TEST-NET-2
		"203.0.113.0/24",  // documentation TEST-NET-3
		"224.0.0.0/4",     // IPv4 multicast
		"240.0.0.0/4",     // IPv4 reserved / future use
		"::1/128",         // IPv6 loopback
		"fc00::/7",        // IPv6 unique local
		"fe80::/10",       // IPv6 link-local
		"ff00::/8",        // IPv6 multicast
	} {
		_, network, err := net.ParseCIDR(cidr)
		if err == nil {
			blockedCIDRs = append(blockedCIDRs, network)
		}
	}
}

// isPrivateIP returns true for any IP in a blocked range.
// It uses the pre-parsed blockedCIDRs slice so there is no per-call string parsing.
func isPrivateIP(ip net.IP) bool {
	for _, network := range blockedCIDRs {
		if network.Contains(ip) {
			return true
		}
	}
	return false
}

func timeoutFromContext(ctx context.Context, fallback time.Duration) time.Duration {
	if deadline, ok := ctx.Deadline(); ok {
		remaining := time.Until(deadline)
		if remaining > 0 {
			return remaining
		}
		return time.Millisecond
	}
	return fallback
}
