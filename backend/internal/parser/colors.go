package parser

import (
	"fmt"
	"regexp"
	"sort"
	"strconv"
	"strings"

	"github.com/ahomsi/explain-website/internal/model"
	"golang.org/x/net/html"
)

// reHexColor matches a CSS property value containing a hex colour.
// Looks for hex after a colon (CSS property context) to avoid matching HTML IDs.
// Supports 3-, 4-, 6-, and 8-digit forms; the alpha digits of 4/8-digit values
// are captured separately and ignored.
var reHexColor = regexp.MustCompile(`(?i):\s*#([0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b`)

// ExtractColorPalette pulls brand colours from <style> blocks, inline styles, and meta theme-color.
func ExtractColorPalette(doc *html.Node, rawHTML string) model.ColorPalette {
	palette := model.ColorPalette{}
	freq := map[string]int{}

	var walk func(*html.Node)
	walk = func(n *html.Node) {
		if n.Type == html.ElementNode {
			switch strings.ToLower(n.Data) {
			case "style":
				if n.FirstChild != nil && n.FirstChild.Type == html.TextNode {
					extractHexColors(n.FirstChild.Data, freq)
				}
			case "meta":
				if strings.EqualFold(getAttr(n, "name"), "theme-color") {
					if c := normalizeHex(getAttr(n, "content")); c != "" {
						palette.ThemeColor = c
					}
				}
			}
			if style := getAttr(n, "style"); style != "" {
				extractHexColors(style, freq)
			}
		}
		for c := n.FirstChild; c != nil; c = c.NextSibling {
			walk(c)
		}
	}
	walk(doc)

	type kv struct {
		hex  string
		freq int
	}
	var sorted []kv
	for hex, f := range freq {
		if !isNearBlack(hex) && !isNearWhite(hex) {
			sorted = append(sorted, kv{hex, f})
		}
	}
	sort.SliceStable(sorted, func(i, j int) bool {
		if sorted[i].freq != sorted[j].freq {
			return sorted[i].freq > sorted[j].freq
		}
		// Deterministic tie order so equal-frequency colours always list the same way.
		return sorted[i].hex < sorted[j].hex
	})
	if len(sorted) > 8 {
		sorted = sorted[:8]
	}
	for _, kv := range sorted {
		palette.Colors = append(palette.Colors, model.ColorEntry{Hex: kv.hex, Frequency: kv.freq})
	}
	return palette
}

func extractHexColors(css string, freq map[string]int) {
	matches := reHexColor.FindAllStringSubmatch(css, -1)
	for _, m := range matches {
		if hex := normalizeHex("#" + m[1]); hex != "" {
			freq[hex]++
		}
	}
}

// normalizeHex expands 3-digit hex to 6-digit lowercase (#abc → #aabbcc).
// 4- and 8-digit forms keep only the RGB digits (alpha is dropped).
func normalizeHex(s string) string {
	s = strings.TrimSpace(strings.ToLower(s))
	if !strings.HasPrefix(s, "#") {
		return ""
	}
	h := s[1:]
	switch len(h) {
	case 3:
		h = string([]byte{h[0], h[0], h[1], h[1], h[2], h[2]})
	case 4:
		h = string([]byte{h[0], h[0], h[1], h[1], h[2], h[2]})
	case 8:
		h = h[:6]
	}
	if len(h) != 6 {
		return ""
	}
	if _, err := strconv.ParseUint(h, 16, 32); err != nil {
		return ""
	}
	return fmt.Sprintf("#%s", h)
}

// isNearBlack returns true for colours where all RGB channels are < 30.
func isNearBlack(hex string) bool {
	r, g, b, ok := hexToRGB(hex)
	return ok && r < 30 && g < 30 && b < 30
}

// isNearWhite returns true for colours where all RGB channels are > 225.
func isNearWhite(hex string) bool {
	r, g, b, ok := hexToRGB(hex)
	return ok && r > 225 && g > 225 && b > 225
}

func hexToRGB(hex string) (r, g, b uint64, ok bool) {
	if len(hex) != 7 || hex[0] != '#' {
		return
	}
	r, err := strconv.ParseUint(hex[1:3], 16, 8)
	if err != nil {
		return
	}
	g, err = strconv.ParseUint(hex[3:5], 16, 8)
	if err != nil {
		return
	}
	b, err = strconv.ParseUint(hex[5:7], 16, 8)
	if err != nil {
		return
	}
	ok = true
	return
}
