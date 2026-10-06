package parser

import (
	"strings"
	"testing"

	"github.com/ahomsi/explain-website/internal/model"
	"golang.org/x/net/html"
)

func auditHTML(t *testing.T, body string) model.ImageFormatAudit {
	t.Helper()
	doc, err := html.Parse(strings.NewReader("<!doctype html><html><body>" + body + "</body></html>"))
	if err != nil {
		t.Fatal(err)
	}
	return auditImages(doc)
}

// Reported on Reddit: a single AVIF used through an inline SVG <image> was
// ignored, leaving 0 images and a bogus "Only 0% of images use modern formats".
func TestAuditImagesCountsInlineSVGImageElements(t *testing.T) {
	a := auditHTML(t, `<svg width="88" height="88"><image x="0" y="0" width="88" height="88" href="/globe.avif"></image></svg>`)
	if a.Total != 1 || a.AVIF != 1 || a.Raster != 1 || a.ModernPct != 100 {
		t.Fatalf("want 1 AVIF counted as 100%% modern, got %+v", a)
	}
	if a.MissingDims != 0 || a.MissingLazy != 0 {
		t.Fatalf("SVG <image> must not be flagged for dims/lazy loading: %+v", a)
	}
}

func TestAuditImagesReadsXlinkHrefOnSVGImage(t *testing.T) {
	a := auditHTML(t, `<svg><image xlink:href="/hero.webp?v=2" width="10" height="10"></image></svg>`)
	if a.Total != 1 || a.WebP != 1 || a.ModernPct != 100 {
		t.Fatalf("xlink:href not read: %+v", a)
	}
}

func TestAuditImagesIgnoresSVGFilesWhenComputingModernPct(t *testing.T) {
	// Vector files can't be converted to WebP/AVIF, so they are not "legacy".
	a := auditHTML(t, `<img src="/logo.svg" width="1" height="1" loading="lazy"><svg><image href="/globe.avif" width="1" height="1"></image></svg>`)
	if a.Total != 2 || a.SVG != 1 || a.Raster != 1 || a.ModernPct != 100 {
		t.Fatalf("want svg excluded from the denominator, got %+v", a)
	}
}

func TestAuditImagesNoBitmapsMeansNothingToConvert(t *testing.T) {
	a := auditHTML(t, `<img src="/logo.svg" width="1" height="1" loading="lazy">`)
	if a.Total != 1 || a.Raster != 0 {
		t.Fatalf("unexpected %+v", a)
	}
}

func TestAuditImagesModernPctOverBitmapsOnly(t *testing.T) {
	a := auditHTML(t, `<img src="a.jpg"><img src="b.png"><img src="c.avif"><img src="d.svg">`)
	if a.Raster != 3 || a.ModernPct != 33 {
		t.Fatalf("want 33%% of 3 bitmaps, got %+v", a)
	}
}

func TestAuditImagesPictureWithModernSourceCountsAsModern(t *testing.T) {
	a := auditHTML(t, `<picture><source srcset="/hero.avif" type="image/avif"><source srcset="/hero.webp" type="image/webp"><img src="/hero.jpg" width="1" height="1"></picture>`)
	if a.Total != 1 || a.AVIF != 1 || a.JPG != 0 || a.ModernPct != 100 {
		t.Fatalf("picture with an AVIF source should count as AVIF, got %+v", a)
	}
}

func TestAuditImagesPictureWithOnlyLegacySourcesStaysLegacy(t *testing.T) {
	a := auditHTML(t, `<picture><source srcset="/hero.jpg" type="image/jpeg"><img src="/hero.png"></picture>`)
	if a.Total != 1 || a.ModernPct != 0 || a.Raster != 1 {
		t.Fatalf("unexpected %+v", a)
	}
}
