package parser

import (
	"testing"

	"github.com/ahomsi/explain-website/internal/model"
)

func TestDetectTech_ConfidenceHighForExplicitSignals(t *testing.T) {
	html := `
	<html>
	  <head>
	    <script src="https://www.googletagmanager.com/gtm.js?id=GTM-TEST"></script>
	    <script src="https://js.sentry-cdn.com/abc.min.js"></script>
	  </head>
	  <body>
	    <noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-TEST"></iframe></noscript>
	    <script>window.Sentry.init({dsn: "https://example@sentry.io/1"})</script>
	  </body>
	</html>`

	tech := detectTech(html, "https://example.com")

	gtm, ok := findTechByName(tech, "Google Tag Manager")
	if !ok {
		t.Fatalf("expected Google Tag Manager to be detected")
	}
	if gtm.Confidence != "high" {
		t.Fatalf("expected Google Tag Manager confidence high, got %q", gtm.Confidence)
	}

	sentry, ok := findTechByName(tech, "Sentry")
	if !ok {
		t.Fatalf("expected Sentry to be detected")
	}
	if sentry.Confidence != "high" {
		t.Fatalf("expected Sentry confidence high, got %q", sentry.Confidence)
	}
}

func TestDetectTech_ConfidenceMediumForIndirectSignals(t *testing.T) {
	html := `
	<html>
	  <head>
	    <script>window.addEventListener("vite:preloadError", function() {})</script>
	  </head>
	</html>`

	tech := detectTech(html, "https://example.com")
	vite, ok := findTechByName(tech, "Vite")
	if !ok {
		t.Fatalf("expected Vite to be detected")
	}
	if vite.Confidence != "medium" {
		t.Fatalf("expected Vite confidence medium, got %q", vite.Confidence)
	}
}

func TestDetectTech_ConfidenceLowForAmbiguousSignals(t *testing.T) {
	html := `<html><body><p>Our migration guide compares typo3 with other systems.</p></body></html>`

	tech := detectTech(html, "https://example.com")
	typo3, ok := findTechByName(tech, "Typo3")
	if !ok {
		t.Fatalf("expected Typo3 to be detected from ambiguous text")
	}
	if typo3.Confidence != "low" {
		t.Fatalf("expected Typo3 confidence low, got %q", typo3.Confidence)
	}
}

func TestDetectTech_DedupesByNameAndKeepsBestConfidence(t *testing.T) {
	html := `
	<html>
	  <head>
	    <script type="module" src="/@vite/client"></script>
	    <link rel="modulepreload" href="/assets/index-abc123.js">
	    <script type="module" src="/assets/index-abc123.js"></script>
	  </head>
	</html>`

	tech := detectTech(html, "https://example.com")
	count := 0
	for _, item := range tech {
		if item.Name == "Vite" {
			count++
			if item.Confidence != "high" {
				t.Fatalf("expected best Vite confidence to be high, got %q", item.Confidence)
			}
		}
	}
	if count != 1 {
		t.Fatalf("expected exactly one Vite entry, got %d", count)
	}
}

func TestDetectTech_WordPressIgnoresJSONLDFalsePositive(t *testing.T) {
	html := `
	<html>
	  <head>
	    <script type="application/ld+json">
	      {"logo":"https://cdn.third-party.com/wp-content/uploads/logo.png"}
	    </script>
	  </head>
	</html>`

	tech := detectTech(html, "https://example.com")
	if _, ok := findTechByName(tech, "WordPress"); ok {
		t.Fatalf("expected WordPress to be ignored for JSON-LD third-party wp-content reference")
	}
}

func TestDetectTech_ViteBroadHeuristicIsLow(t *testing.T) {
	// The low-confidence modulepreload heuristic was removed because it produced
	// false positives on Shopify, Astro, and any framework that serves assets from
	// /assets/ with rel="modulepreload". A generic modulepreload link should NOT
	// trigger Vite detection — only definitive signals (/@vite/client,
	// vite/modulepreload-polyfill) or strong runtime markers (__vite__mapdeps,
	// vite:preloaderror) should match.
	html := `
	<html>
	  <head>
	    <link rel="modulepreload" href="https://cdn.example.com/assets/chunk-a.js">
	  </head>
	</html>`

	tech := detectTech(html, "https://example.com")
	_, ok := findTechByName(tech, "Vite")
	if ok {
		t.Fatalf("expected Vite NOT to be detected for a generic modulepreload link (too broad)")
	}
}

func findTechByName(items []model.TechItem, name string) (model.TechItem, bool) {
	for _, item := range items {
		if item.Name == name {
			return item, true
		}
	}
	return model.TechItem{}, false
}
