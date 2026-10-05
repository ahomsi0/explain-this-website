package parser

import (
	"context"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/ahomsi/explain-website/internal/fetcher"
	"github.com/ahomsi/explain-website/internal/model"
	"golang.org/x/net/html"
)

const (
	linkCheckCap        = 30
	linkCheckTimeout    = 5 * time.Second
	linkCheckConcurrent = 8
)

var linkClient = fetcher.NewPublicHTTPClient(linkCheckTimeout)

// resolveHTTPLink resolves a page link against the analyzed page URL and
// accepts only navigable HTTP(S) URLs. This keeps relative and protocol-
// relative links from being silently dropped or probed with an invalid URL.
func resolveHTTPLink(baseURL, href string) (*url.URL, bool) {
	raw := strings.TrimSpace(href)
	if raw == "" {
		return nil, false
	}

	ref, err := url.Parse(raw)
	if err != nil {
		return nil, false
	}
	scheme := strings.ToLower(ref.Scheme)
	if scheme == "mailto" || scheme == "tel" || scheme == "javascript" || scheme == "data" {
		return nil, false
	}
	// A fragment-only reference never leaves the current document.
	if ref.Scheme == "" && ref.Host == "" && ref.Path == "" && ref.RawQuery == "" {
		return nil, false
	}

	base, err := url.Parse(baseURL)
	if err != nil || base.Scheme == "" || base.Host == "" {
		return nil, false
	}
	resolved := base.ResolveReference(ref)
	resolvedScheme := strings.ToLower(resolved.Scheme)
	if (resolvedScheme != "http" && resolvedScheme != "https") || resolved.Hostname() == "" {
		return nil, false
	}
	resolved.Fragment = ""
	return resolved, true
}

func normalizedHostname(host string) string {
	return strings.ToLower(strings.TrimSuffix(host, "."))
}

// sameSiteHost reports whether two hostnames refer to the same site, treating
// the www and non-www forms as equivalent so a site linking its own canonical
// variant isn't counted (and probed) as an external link.
func sameSiteHost(a, b string) bool {
	a, b = normalizedHostname(a), normalizedHostname(b)
	if a == b {
		return true
	}
	return strings.TrimPrefix(a, "www.") == strings.TrimPrefix(b, "www.")
}

// CheckLinks extracts up to linkCheckCap external links from doc and probes each one.
func CheckLinks(ctx context.Context, doc *html.Node, sourceURL string) model.LinkCheckResult {
	anchors := extractExternalAnchors(doc, sourceURL)
	if len(anchors) > linkCheckCap {
		anchors = anchors[:linkCheckCap]
	}

	if len(anchors) == 0 {
		return model.LinkCheckResult{}
	}

	items := make([]model.LinkCheckItem, len(anchors))
	completed := make([]bool, len(anchors))
	sem := make(chan struct{}, linkCheckConcurrent)
	var wg sync.WaitGroup

	for i, a := range anchors {
		if ctx.Err() != nil {
			break
		}
		wg.Add(1)
		select {
		case sem <- struct{}{}:
		case <-ctx.Done():
			wg.Done()
			continue
		}
		go func(idx int, anchor externalAnchor) {
			defer wg.Done()
			defer func() { <-sem }()
			if ctx.Err() != nil {
				return
			}
			item := probeLink(ctx, anchor.URL)
			if ctx.Err() != nil {
				return
			}
			item.Text = anchor.Text
			items[idx] = item
			completed[idx] = true
		}(i, a)
	}
	wg.Wait()

	checkedItems := make([]model.LinkCheckItem, 0, len(anchors))
	for i, item := range items {
		if !completed[i] {
			continue
		}
		checkedItems = append(checkedItems, item)
	}
	result := model.LinkCheckResult{Checked: len(checkedItems), Items: checkedItems}
	for _, item := range checkedItems {
		switch {
		case item.IsBroken:
			result.Broken++
		case item.Reason == reasonUnreachable || item.Reason == reasonBlocked:
			result.Unverified++
		case item.IsRedirect:
			result.Redirects++
		default:
			result.OK++
		}
	}
	return result
}

// externalAnchor is a deduplicated external link and the text it was shown with.
type externalAnchor struct {
	URL  string
	Text string
}

// extractExternalAnchors returns deduplicated external links from <a> tags,
// keeping the anchor text of the first occurrence of each URL.
func extractExternalAnchors(doc *html.Node, sourceURL string) []externalAnchor {
	var sourceHost string
	if u, err := url.Parse(sourceURL); err == nil {
		sourceHost = normalizedHostname(u.Hostname())
	}

	seen := map[string]bool{}
	var anchors []externalAnchor

	var walk func(*html.Node)
	walk = func(n *html.Node) {
		if n.Type == html.ElementNode && strings.EqualFold(n.Data, "a") {
			href := getAttr(n, "href")
			if u, ok := resolveHTTPLink(sourceURL, href); ok && !sameSiteHost(u.Hostname(), sourceHost) {
				norm := u.String()
				if !seen[norm] {
					seen[norm] = true
					anchors = append(anchors, externalAnchor{URL: norm, Text: evidenceText(extractText(n))})
				}
			}
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			walk(c)
		}
	}
	walk(doc)
	return anchors
}

// extractExternalLinks returns deduplicated external hrefs from <a> tags.
func extractExternalLinks(doc *html.Node, sourceURL string) []string {
	anchors := extractExternalAnchors(doc, sourceURL)
	links := make([]string, len(anchors))
	for i, a := range anchors {
		links[i] = a.URL
	}
	return links
}

const (
	reasonNotFound    = "not_found"
	reasonServerError = "server_error"
	reasonUnreachable = "unreachable"
	reasonBlocked     = "blocked"
)

// classifyStatus maps an HTTP status to a reason and whether the link counts as
// broken. Only 404/410 and 5xx are broken; other 4xx (401, 403, 429, 999, ...)
// usually mean bot protection, so they are "blocked" (unverified), not broken.
func classifyStatus(status int) (reason string, broken bool) {
	switch {
	case status == http.StatusNotFound || status == http.StatusGone:
		return reasonNotFound, true
	case status >= 500:
		return reasonServerError, true
	case status >= 400:
		return reasonBlocked, false
	}
	return "", false
}

func doProbe(ctx context.Context, method, target string) (*http.Response, error) {
	req, err := http.NewRequestWithContext(ctx, method, target, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; ExplainThisWebsite/1.0)")
	return linkClient.Do(req)
}

// probeLink makes a HEAD request and, on any error or 4xx/5xx, confirms with a
// GET before judging: many servers reject, rate-limit or time out HEAD while
// serving the same URL fine via GET.
func probeLink(ctx context.Context, target string) model.LinkCheckItem {
	item := model.LinkCheckItem{URL: target, FinalURL: target}

	resp, err := doProbe(ctx, http.MethodHead, target)
	if err != nil || resp.StatusCode >= 400 {
		if getResp, getErr := doProbe(ctx, http.MethodGet, target); getErr == nil {
			if err == nil {
				resp.Body.Close()
			}
			resp, err = getResp, nil
		}
	}
	if err != nil {
		item.Reason = reasonUnreachable
		return item
	}
	defer resp.Body.Close()

	item.Status = resp.StatusCode
	if resp.Request != nil {
		finalURL := resp.Request.URL.String()
		if finalURL != target {
			// Only flag as redirect if the host or path meaningfully changed.
			parsedOrig, e1 := url.Parse(target)
			parsedFinal, e2 := url.Parse(finalURL)
			if e1 == nil && e2 == nil &&
				(strings.ToLower(parsedOrig.Host) != strings.ToLower(parsedFinal.Host) ||
					parsedOrig.Path != parsedFinal.Path) {
				item.FinalURL = finalURL
				item.IsRedirect = true
			}
		}
	}
	item.Reason, item.IsBroken = classifyStatus(resp.StatusCode)
	return item
}
