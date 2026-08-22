package parser

import (
	"context"
	"fmt"
	"net/url"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/ahomsi/explain-website/internal/fetcher"
	"github.com/ahomsi/explain-website/internal/model"
	"golang.org/x/net/html"
)

const (
	maxSubpages        = 4
	subpageConcurrency = 2
	// Budget for the whole subpage scan; each fetch gets its own shorter cap.
	subpageScanBudget  = 60 * time.Second
	subpageFetchBudget = 20 * time.Second
	subpageMaxBytes    = int64(2 * 1024 * 1024)
)

// keyPagePrefixes ranks internal URLs by how likely they carry business
// meaning. Lower rank = scanned first; pages matching nothing act as fillers.
var keyPagePrefixes = []string{
	"/pricing", "/about", "/contact", "/features", "/product",
	"/services", "/solutions", "/plans", "/blog", "/docs", "/support",
}

// selectDeepScanTargets picks up to max same-site URLs worth auditing,
// prioritizing common key pages and falling back to other internal links.
func selectDeepScanTargets(doc *html.Node, sourceURL string, max int) []string {
	source, err := url.Parse(sourceURL)
	if err != nil || source.Host == "" {
		return nil
	}
	baseHost := normalizedHostname(source.Hostname())

	type candidate struct {
		target string
		path   string
		prio   int // lower is better; -1 when no pattern matches
		seq    int
	}
	var candidates []candidate
	seen := map[string]bool{strings.TrimSuffix(strings.ToLower(source.Path), "/"): true}
	seq := 0

	consider := func(href string) {
		u, ok := resolveHTTPLink(sourceURL, href)
		if !ok || !sameSiteHost(u.Hostname(), baseHost) {
			return
		}
		path := strings.TrimSuffix(u.Path, "/")
		key := strings.ToLower(path)
		if path == "" || seen[key] {
			return
		}
		seen[key] = true

		prio := -1
		for i, prefix := range keyPagePrefixes {
			if strings.HasPrefix(key, prefix) || strings.Contains(key, prefix+"/") ||
				strings.Contains(key, "-"+prefix) || strings.Contains(key, "_"+prefix) {
				prio = i
				break
			}
		}
		candidates = append(candidates, candidate{target: u.String(), path: path, prio: prio, seq: seq})
		seq++
	}

	var walk func(*html.Node)
	walk = func(n *html.Node) {
		if n.Type == html.ElementNode && strings.EqualFold(n.Data, "a") {
			consider(getAttr(n, "href"))
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			walk(c)
		}
	}
	walk(doc)

	sort.SliceStable(candidates, func(i, j int) bool {
		// Pattern matches (-1 <= prio) beat fillers (prio == len); among
		// equals, document order wins.
		pi := candidates[i].prio
		pj := candidates[j].prio
		if pi == -1 {
			pi = len(keyPagePrefixes)
		}
		if pj == -1 {
			pj = len(keyPagePrefixes)
		}
		if pi != pj {
			return pi < pj
		}
		return candidates[i].seq < candidates[j].seq
	})
	out := make([]string, 0, max)
	for _, c := range candidates {
		if len(out) >= max {
			break
		}
		out = append(out, c.target)
	}
	return out
}

// auditSubpages fetches and audits up to maxSubpages key internal pages.
// Subpages skip PageSpeed entirely (quota + latency); failures are recorded
// per page instead of failing the whole analysis.
func auditSubpages(parent context.Context, doc *html.Node, sourceURL string, mainSEOScore int) *model.SitePagesAudit {
	targets := selectDeepScanTargets(doc, sourceURL, maxSubpages)
	if len(targets) == 0 {
		return nil
	}

	// Detach from the parent deadline so a fast main-page parse doesn't leave
	// the scan with an unusable sliver of time, but still abort on disconnect.
	ctx, cancel := context.WithTimeout(context.WithoutCancel(parent), subpageScanBudget)
	defer cancel()

	results := make([]model.SitePageAudit, len(targets))
	sem := make(chan struct{}, subpageConcurrency)
	var wg sync.WaitGroup
	for i, target := range targets {
		wg.Add(1)
		go func(idx int, target string) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			entry := model.SitePageAudit{URL: target, Status: "error"}
			pageCtx, pageCancel := context.WithTimeout(ctx, subpageFetchBudget)
			defer pageCancel()

			pageHTML, _, err := fetcher.FetchHTML(pageCtx, target, subpageMaxBytes)
			if err == nil {
				var res model.AnalysisResult
				// Empty PageSpeed key → subpages never touch the PSI quota.
				res, err = Parse(pageCtx, pageHTML, target, "")
				if err == nil {
					entry.Status = "ok"
					entry.Title = res.Overview.Title
					entry.SEOScore = SEOScore(res.SEOChecks)
				}
			}
			if err != nil {
				entry.Error = truncateErrorText(err.Error())
			}
			results[idx] = entry
		}(i, target)
	}
	wg.Wait()

	sum := mainSEOScore
	count := 1
	for _, p := range results {
		if p.Status == "ok" {
			sum += p.SEOScore
			count++
		}
	}
	return &model.SitePagesAudit{
		Pages:       results,
		AvgSEOScore: sum / count,
		FetchedAt:   time.Now().UTC(),
	}
}

// truncateErrorText keeps per-page failure notes readable in the UI.
func truncateErrorText(msg string) string {
	msg = strings.TrimSpace(msg)
	const maxLen = 140
	if len(msg) <= maxLen {
		return msg
	}
	return fmt.Sprintf("%s…", msg[:maxLen])
}
