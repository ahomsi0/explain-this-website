package parser

import (
	"strings"
	"testing"

	"golang.org/x/net/html"
)

func TestExtractColorPalette_HexFromStyle(t *testing.T) {
	rawHTML := `<html><head><style>
		body { background-color: #1a1a2e; color: #e94560; }
		.btn { background: #0f3460; border-color: #533483; }
	</style></head><body></body></html>`
	doc, _ := html.Parse(strings.NewReader(rawHTML))
	palette := ExtractColorPalette(doc, rawHTML)
	if len(palette.Colors) == 0 {
		t.Fatal("expected colors to be extracted from <style>")
	}
	hexes := make(map[string]bool)
	for _, c := range palette.Colors {
		hexes[c.Hex] = true
	}
	if !hexes["#1a1a2e"] && !hexes["#e94560"] {
		t.Errorf("expected #1a1a2e or #e94560 in palette, got %v", palette.Colors)
	}
}

func TestExtractColorPalette_ThemeColor(t *testing.T) {
	rawHTML := `<html><head><meta name="theme-color" content="#6d28d9"></head><body></body></html>`
	doc, _ := html.Parse(strings.NewReader(rawHTML))
	palette := ExtractColorPalette(doc, rawHTML)
	if palette.ThemeColor != "#6d28d9" {
		t.Errorf("expected theme-color #6d28d9, got %q", palette.ThemeColor)
	}
}

func TestExtractColorPalette_FiltersNearBlack(t *testing.T) {
	rawHTML := `<html><head><style>body { color: #000000; background: #ffffff; }</style></head><body></body></html>`
	doc, _ := html.Parse(strings.NewReader(rawHTML))
	palette := ExtractColorPalette(doc, rawHTML)
	for _, c := range palette.Colors {
		if c.Hex == "#000000" || c.Hex == "#ffffff" {
			t.Errorf("near-black/near-white %s should be filtered out", c.Hex)
		}
	}
}
