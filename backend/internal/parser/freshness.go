package parser

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/ahomsi/explain-website/internal/model"
	"golang.org/x/net/html"
)

var (
	// © 2023, © 2022-2024, Copyright 2023, etc.
	reCopyright = regexp.MustCompile(`(?i)(?:©|&copy;|copyright)\s*(?:\d{4}\s*[-–]\s*)?(\d{4})`)
	// ISO 8601 dates (YYYY-MM-DD) appearing in text or attributes
	reISODate = regexp.MustCompile(`\b(20\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b`)
)

// auditFreshness extracts date/freshness signals from the parsed HTML tree and raw HTML.
func auditFreshness(doc *html.Node, rawHTML string) model.SiteFreshness {
	now := time.Now().UTC()
	currentYear := now.Year()

	var signals []string
	latestYear := 0
	latestDate := ""

	// 1. Copyright year from raw HTML text (catches JS-rendered footers too)
	if m := reCopyright.FindAllStringSubmatch(rawHTML, -1); len(m) > 0 {
		for _, match := range m {
			if y, err := strconv.Atoi(match[1]); err == nil && y > latestYear && y <= currentYear {
				latestYear = y
			}
		}
		if latestYear > 0 {
			signals = append(signals, fmt.Sprintf("Copyright © %d found", latestYear))
		}
	}

	// 2. <time> elements with datetime attribute
	var walkTime func(*html.Node)
	walkTime = func(n *html.Node) {
		if n.Type == html.ElementNode && strings.ToLower(n.Data) == "time" {
			dt := getAttr(n, "datetime")
			if dt == "" {
				dt = getAttr(n, "data-datetime")
			}
			if m := reISODate.FindString(dt); m != "" {
				if m > latestDate {
					latestDate = m
				}
				if y, err := strconv.Atoi(m[:4]); err == nil && y > latestYear && y <= currentYear {
					latestYear = y
				}
			}
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			walkTime(c)
		}
	}
	walkTime(doc)
	if latestDate != "" {
		signals = append(signals, fmt.Sprintf("Article/post dated %s", latestDate))
	}

	// 3. OG article meta tags
	var walkMeta func(*html.Node)
	walkMeta = func(n *html.Node) {
		if n.Type == html.ElementNode && strings.ToLower(n.Data) == "meta" {
			prop := strings.ToLower(getAttr(n, "property"))
			name := strings.ToLower(getAttr(n, "name"))
			content := getAttr(n, "content")
			key := prop
			if key == "" {
				key = name
			}
			switch key {
			case "article:published_time", "article:modified_time",
				"og:updated_time", "date", "last-modified":
				if m := reISODate.FindString(content); m != "" {
					if m > latestDate {
						latestDate = m
					}
					if y, err := strconv.Atoi(m[:4]); err == nil && y > latestYear && y <= currentYear {
						latestYear = y
					}
					signals = append(signals, fmt.Sprintf("%s: %s", prettyMetaKey(key), m))
				}
			}
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			walkMeta(c)
		}
	}
	walkMeta(doc)

	// 4. JSON-LD datePublished / dateModified
	lowerHTML := strings.ToLower(rawHTML)
	if strings.Contains(lowerHTML, "datepublished") || strings.Contains(lowerHTML, "datemodified") {
		for _, key := range []string{"datePublished", "dateModified"} {
			idx := strings.Index(rawHTML, `"`+key+`"`)
			if idx == -1 {
				idx = strings.Index(rawHTML, `'`+key+`'`)
			}
			if idx == -1 {
				continue
			}
			snippet := rawHTML[idx : min(idx+60, len(rawHTML))]
			if m := reISODate.FindString(snippet); m != "" {
				if m > latestDate {
					latestDate = m
				}
				if y, err := strconv.Atoi(m[:4]); err == nil && y > latestYear && y <= currentYear {
					latestYear = y
				}
				signals = append(signals, fmt.Sprintf("JSON-LD %s: %s", key, m))
			}
		}
	}

	// 5. ISO dates in raw HTML as a last-resort scan (capped to avoid noise)
	if latestDate == "" {
		matches := reISODate.FindAllString(rawHTML, 20)
		for _, m := range matches {
			if m > latestDate {
				latestDate = m
			}
		}
	}

	// Deduplicate signals
	signals = dedupeStrings(signals)

	// Rating
	rating := rateAge(latestYear, latestDate, currentYear, now)

	copyrightYear := latestYear
	if copyrightYear == 0 {
		// Try parsing from latestDate
		if len(latestDate) >= 4 {
			if y, err := strconv.Atoi(latestDate[:4]); err == nil {
				copyrightYear = y
			}
		}
	}

	// Normalize nil slice to empty so JSON serializes as [] not null —
	// frontend then doesn't have to .signals?.length defensively.
	if signals == nil {
		signals = []string{}
	}
	return model.SiteFreshness{
		CopyrightYear: copyrightYear,
		LatestDate:    latestDate,
		Rating:        rating,
		Signals:       signals,
	}
}

func rateAge(latestYear int, latestDate string, currentYear int, now time.Time) string {
	// Use ISO date if available (more precise than year alone)
	if latestDate != "" {
		if t, err := time.Parse("2006-01-02", latestDate); err == nil {
			age := now.Sub(t)
			if age < 180*24*time.Hour {
				return "fresh"
			}
			if age < 18*30*24*time.Hour {
				return "aging"
			}
			return "stale"
		}
	}
	if latestYear == 0 {
		return "unknown"
	}
	diff := currentYear - latestYear
	if diff == 0 {
		return "fresh"
	}
	if diff == 1 {
		return "aging"
	}
	return "stale"
}

func prettyMetaKey(key string) string {
	switch key {
	case "article:published_time":
		return "Published"
	case "article:modified_time", "og:updated_time":
		return "Modified"
	case "date":
		return "Date"
	case "last-modified":
		return "Last-Modified"
	}
	return key
}

func dedupeStrings(ss []string) []string {
	seen := make(map[string]bool)
	out := ss[:0]
	for _, s := range ss {
		if !seen[s] {
			seen[s] = true
			out = append(out, s)
		}
	}
	return out
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

// jsonLDDate is a fallback struct for extracting raw date fields from any JSON-LD block.
type jsonLDDate struct {
	DatePublished string `json:"datePublished"`
	DateModified  string `json:"dateModified"`
}

// extractJSONLDDates parses all <script type="application/ld+json"> blocks for dates.
func extractJSONLDDates(doc *html.Node) []string {
	var dates []string
	var walk func(*html.Node)
	walk = func(n *html.Node) {
		if n.Type == html.ElementNode && strings.ToLower(n.Data) == "script" {
			if strings.Contains(strings.ToLower(getAttr(n, "type")), "ld+json") {
				if n.FirstChild != nil {
					var d jsonLDDate
					if err := json.Unmarshal([]byte(n.FirstChild.Data), &d); err == nil {
						if d.DatePublished != "" {
							dates = append(dates, d.DatePublished)
						}
						if d.DateModified != "" {
							dates = append(dates, d.DateModified)
						}
					}
				}
			}
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			walk(c)
		}
	}
	walk(doc)
	return dates
}
