package parser

import (
	"strings"

	"github.com/ahomsi/explain-website/internal/model"
	"golang.org/x/net/html"
)

// AssessRendering detects common empty application shells. It does not claim
// to execute JavaScript; it gives the report a confidence warning when the
// server response is too sparse to represent the rendered page.
func AssessRendering(doc *html.Node, visibleText string) model.RenderingInfo {
	info := model.RenderingInfo{Mode: "server-html"}
	rootShell := false
	scriptCount := 0
	h1Count := 0

	var walk func(*html.Node)
	walk = func(n *html.Node) {
		if n.Type == html.ElementNode {
			tag := strings.ToLower(n.Data)
			if tag == "script" {
				scriptCount++
			}
			if tag == "h1" {
				h1Count++
			}
			id := strings.ToLower(getAttr(n, "id"))
			if id == "root" || id == "app" || id == "__next" || id == "__nuxt" || id == "svelte" {
				rootShell = true
			}
		}
		for child := n.FirstChild; child != nil; child = child.NextSibling {
			walk(child)
		}
	}
	walk(doc)

	wordCount := len(strings.Fields(visibleText))
	info.LikelyClientRendered = rootShell && scriptCount >= 2 && (wordCount < 40 || h1Count == 0)
	if info.LikelyClientRendered {
		info.Notice = "This page appears to depend on client-side JavaScript. The audit uses server-delivered HTML, so rendered content and interactive states may be incomplete."
	}
	return info
}
