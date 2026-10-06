package parser

import (
	"path"
	"strings"

	"github.com/ahomsi/explain-website/internal/model"
	"golang.org/x/net/html"
)

// formatFromURL returns the image format bucket ("webp", "avif", "jpg", "png",
// "gif", "svg") for a src/href/srcset value, or "" when it can't be told (data
// URIs, extensionless URLs).
func formatFromURL(src string) string {
	clean := strings.ToLower(strings.SplitN(src, "?", 2)[0])
	clean = strings.SplitN(strings.TrimSpace(clean), " ", 2)[0] // srcset may have "url 2x"
	clean = strings.SplitN(clean, ",", 2)[0]
	switch ext := strings.TrimPrefix(path.Ext(clean), "."); ext {
	case "webp", "avif", "png", "gif", "svg":
		return ext
	case "jpg", "jpeg":
		return "jpg"
	}
	return ""
}

func countFormat(a *model.ImageFormatAudit, format string) {
	switch format {
	case "webp":
		a.WebP++
	case "avif":
		a.AVIF++
	case "jpg":
		a.JPG++
	case "png":
		a.PNG++
	case "gif":
		a.GIF++
	case "svg":
		a.SVG++
	}
}

// pictureModernFormat reports the modern format a <picture> offers for an <img>
// inside it ("avif" preferred over "webp"), or "" when it only offers legacy
// formats or the <img> is not in a <picture>. Browsers choose the first
// supported <source>, so a modern source means modern delivery even though the
// <img> fallback is a JPEG or PNG.
func pictureModernFormat(img *html.Node) string {
	if img.Parent == nil || !strings.EqualFold(img.Parent.Data, "picture") {
		return ""
	}
	found := ""
	for c := img.Parent.FirstChild; c != nil; c = c.NextSibling {
		if c.Type != html.ElementNode || !strings.EqualFold(c.Data, "source") {
			continue
		}
		format := ""
		switch strings.ToLower(strings.TrimSpace(getAttr(c, "type"))) {
		case "image/avif":
			format = "avif"
		case "image/webp":
			format = "webp"
		default:
			if f := formatFromURL(getAttr(c, "srcset")); f == "avif" || f == "webp" {
				format = f
			}
		}
		if format == "avif" {
			return "avif"
		}
		if format == "webp" {
			found = "webp"
		}
	}
	return found
}

// auditImages walks the HTML tree and produces an ImageFormatAudit. It counts
// <img> elements and SVG <image> elements (inline SVG, via href or xlink:href).
func auditImages(doc *html.Node) model.ImageFormatAudit {
	var a model.ImageFormatAudit

	var walk func(*html.Node)
	walk = func(n *html.Node) {
		if n.Type == html.ElementNode {
			switch strings.ToLower(n.Data) {
			case "img":
				src := getAttr(n, "src")
				if src == "" {
					// srcset-only or blank
					src = getAttr(n, "srcset")
				}
				if src != "" {
					a.Total++
					format := pictureModernFormat(n)
					if format == "" {
						format = formatFromURL(src)
					}
					countFormat(&a, format)

					// Missing width + height causes layout shift (CLS).
					if getAttr(n, "width") == "" || getAttr(n, "height") == "" {
						a.MissingDims++
					}
					// Missing loading=lazy (we flag all images; developers decide which are above fold).
					if strings.ToLower(getAttr(n, "loading")) != "lazy" {
						a.MissingLazy++
					}
				}

			case "image":
				// Inline SVG <image href="..."> (the parser keeps this tag name only
				// inside <svg>). It is sized by its attributes and is not lazy-loadable,
				// so it counts toward format totals but not dims/lazy flags.
				if href := strings.TrimSpace(getAttr(n, "href")); href != "" {
					a.Total++
					countFormat(&a, formatFromURL(href))
				}
			}
		}

		for c := n.FirstChild; c != nil; c = c.NextSibling {
			walk(c)
		}
	}
	walk(doc)

	// SVG is vector: it cannot be "converted to WebP/AVIF", so it stays out of
	// the modern-format percentage.
	a.Raster = a.WebP + a.AVIF + a.JPG + a.PNG + a.GIF
	if a.Raster > 0 {
		a.ModernPct = (a.WebP + a.AVIF) * 100 / a.Raster
	}
	return a
}
