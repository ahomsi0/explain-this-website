package parser

import (
	"path"
	"strings"

	"github.com/ahomsi/explain-website/internal/model"
	"golang.org/x/net/html"
)

// auditImages walks the HTML tree and produces an ImageFormatAudit.
func auditImages(doc *html.Node) model.ImageFormatAudit {
	var a model.ImageFormatAudit

	var walk func(*html.Node)
	walk = func(n *html.Node) {
		if n.Type == html.ElementNode && strings.ToLower(n.Data) == "img" {
			src := getAttr(n, "src")
			if src == "" {
				// srcset-only or blank — skip format counting but still note dims
				src = getAttr(n, "srcset")
			}
			if src == "" {
				for c := n.FirstChild; c != nil; c = c.NextSibling {
					walk(c)
				}
				return
			}

			a.Total++

			// Detect format from src extension (or srcset first entry).
			// We strip query strings and grab just the filename extension.
			clean := strings.ToLower(strings.SplitN(src, "?", 2)[0])
			clean = strings.SplitN(clean, " ", 2)[0] // srcset may have "url 2x"
			ext := strings.TrimPrefix(path.Ext(clean), ".")
			switch ext {
			case "webp":
				a.WebP++
			case "avif":
				a.AVIF++
			case "jpg", "jpeg":
				a.JPG++
			case "png":
				a.PNG++
			case "gif":
				a.GIF++
			case "svg":
				a.SVG++
			// data URIs and unknown extensions — count as total but no format bucket
			}

			// Missing width + height causes layout shift (CLS).
			if getAttr(n, "width") == "" || getAttr(n, "height") == "" {
				a.MissingDims++
			}

			// Missing loading=lazy (we flag all images; developers decide which are above fold).
			if strings.ToLower(getAttr(n, "loading")) != "lazy" {
				a.MissingLazy++
			}
		}

		for c := n.FirstChild; c != nil; c = c.NextSibling {
			walk(c)
		}
	}
	walk(doc)

	if a.Total > 0 {
		a.ModernPct = (a.WebP + a.AVIF) * 100 / a.Total
	}
	return a
}
