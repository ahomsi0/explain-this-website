package parser

import (
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"

	"github.com/ahomsi/explain-website/internal/model"
	"golang.org/x/net/html"
)

const (
	linkCheckCap        = 30
	linkCheckTimeout    = 5 * time.Second
	linkCheckConcurrent = 8
)

var linkClient = &http.Client{
	Timeout: linkCheckTimeout,
	CheckRedirect: func(req *http.Request, via []*http.Request) error {
		if len(via) >= 5 {
			return http.ErrUseLastResponse
		}
		return nil
	},
}

// CheckLinks extracts up to linkCheckCap external links from doc and HEAD-probes each one.
func CheckLinks(doc *html.Node, sourceURL string) model.LinkCheckResult {
	links := extractExternalLinks(doc, sourceURL)
	if len(links) > linkCheckCap {
		links = links[:linkCheckCap]
	}

	if len(links) == 0 {
		return model.LinkCheckResult{}
	}

	items := make([]model.LinkCheckItem, len(links))
	sem := make(chan struct{}, linkCheckConcurrent)
	var wg sync.WaitGroup

	for i, u := range links {
		wg.Add(1)
		sem <- struct{}{}
		go func(idx int, target string) {
			defer wg.Done()
			defer func() { <-sem }()
			items[idx] = probeLink(target)
		}(i, u)
	}
	wg.Wait()

	result := model.LinkCheckResult{Checked: len(items), Items: items}
	for _, item := range items {
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
		sourceHost = u.Hostname()
	}

	seen := map[string]bool{}
	var links []string

	var walk func(*html.Node)
	walk = func(n *html.Node) {
		if n.Type == html.ElementNode && n.Data == "a" {
			href := getAttr(n, "href")
			if href == "" || strings.HasPrefix(href, "#") ||
				strings.HasPrefix(href, "mailto:") || strings.HasPrefix(href, "tel:") ||
				strings.HasPrefix(href, "/") || strings.HasPrefix(href, "./") {
				goto next
			}
			if u, err := url.Parse(href); err == nil && u.Host != "" && u.Hostname() != sourceHost {
				norm := u.Scheme + "://" + u.Host + u.Path
				if !seen[norm] {
					seen[norm] = true
					links = append(links, href)
				}
			}
		}
	next:
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			walk(c)
		}
	}
	walk(doc)
	return links
}

// probeLink makes a HEAD request (falling back to GET on 405) and returns the result.
func probeLink(target string) model.LinkCheckItem {
	item := model.LinkCheckItem{URL: target, FinalURL: target}

	req, err := http.NewRequest(http.MethodHead, target, nil)
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

	// Some servers reject HEAD; retry with GET.
	if resp.StatusCode == http.StatusMethodNotAllowed {
		req2, _ := http.NewRequest(http.MethodGet, target, nil)
		req2.Header.Set("User-Agent", req.Header.Get("User-Agent"))
		resp2, err2 := linkClient.Do(req2)
		if err2 == nil {
			io.Copy(io.Discard, resp2.Body)
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
	item.IsBroken = resp.StatusCode == 0 || resp.StatusCode >= 400
	return item
}
