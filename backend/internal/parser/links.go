package parser

import (
	"context"
	"io"
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

// CheckLinks extracts up to linkCheckCap external links from doc and HEAD-probes each one.
func CheckLinks(ctx context.Context, doc *html.Node, sourceURL string) model.LinkCheckResult {
	links := extractExternalLinks(doc, sourceURL)
	if len(links) > linkCheckCap {
		links = links[:linkCheckCap]
	}

	if len(links) == 0 {
		return model.LinkCheckResult{}
	}

	items := make([]model.LinkCheckItem, len(links))
	completed := make([]bool, len(links))
	sem := make(chan struct{}, linkCheckConcurrent)
	var wg sync.WaitGroup

	for i, u := range links {
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
		go func(idx int, target string) {
			defer wg.Done()
			defer func() { <-sem }()
			if ctx.Err() != nil {
				return
			}
			item := probeLink(ctx, target)
			if ctx.Err() != nil {
				return
			}
			items[idx] = item
			completed[idx] = true
		}(i, u)
	}
	wg.Wait()

	checkedItems := make([]model.LinkCheckItem, 0, len(links))
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
		case item.IsRedirect:
			result.Redirects++
		default:
			result.OK++
		}
	}
	return result
}

// extractExternalLinks returns deduplicated external hrefs from <a> tags.
func extractExternalLinks(doc *html.Node, sourceURL string) []string {
	var sourceHost string
	if u, err := url.Parse(sourceURL); err == nil {
		sourceHost = normalizedHostname(u.Hostname())
	}

	seen := map[string]bool{}
	var links []string

	var walk func(*html.Node)
	walk = func(n *html.Node) {
		if n.Type == html.ElementNode && strings.EqualFold(n.Data, "a") {
			href := getAttr(n, "href")
			if u, ok := resolveHTTPLink(sourceURL, href); ok && !sameSiteHost(u.Hostname(), sourceHost) {
				norm := u.String()
				if !seen[norm] {
					seen[norm] = true
					links = append(links, norm)
				}
			}
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			walk(c)
		}
	}
	walk(doc)
	return links
}

// probeLink makes a HEAD request (falling back to GET on 405) and returns the result.
func probeLink(ctx context.Context, target string) model.LinkCheckItem {
	item := model.LinkCheckItem{URL: target, FinalURL: target}

	req, err := http.NewRequestWithContext(ctx, http.MethodHead, target, nil)
	if err != nil {
		item.IsBroken = true
		return item
	}
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; ExplainThisWebsite/1.0)")

	resp, err := linkClient.Do(req)
	if err != nil {
		item.Status = 0
		item.IsBroken = true
		return item
	}
	defer resp.Body.Close()

	// Some servers reject or block HEAD while serving the same URL via GET;
	// retry those responses before calling a link broken.
	if resp.StatusCode == http.StatusMethodNotAllowed ||
		resp.StatusCode == http.StatusNotImplemented || resp.StatusCode == http.StatusForbidden {
		req2, _ := http.NewRequestWithContext(ctx, http.MethodGet, target, nil)
		req2.Header.Set("User-Agent", req.Header.Get("User-Agent"))
		resp2, err2 := linkClient.Do(req2)
		if err2 == nil {
			_, _ = io.Copy(io.Discard, io.LimitReader(resp2.Body, 1<<20))
			resp2.Body.Close()
			resp = resp2
		}
	}

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
	item.IsBroken = resp.StatusCode >= 400
	return item
}
