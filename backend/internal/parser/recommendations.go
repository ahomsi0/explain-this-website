package parser

import (
	"github.com/ahomsi/explain-website/internal/model"
)

// generateRecommendations produces weak points and actionable recommendations
// based on the SEO audit and UX analysis results.
func generateRecommendations(seoChecks []model.SEOCheck, ux model.UXResult) (weakPoints []string, recommendations []string) {
	seo := indexSEO(seoChecks)

	// --- SEO weak points ---
	if seo["title"] == "fail" {
		weakPoints = append(weakPoints, "Missing page title — search engines will generate one automatically")
		recommendations = append(recommendations, "Add a descriptive <title> tag (50–60 chars) with your primary keyword")
	} else if seo["title"] == "warning" {
		weakPoints = append(weakPoints, "Page title is outside the recommended length range")
		recommendations = append(recommendations, "Adjust your page title to 50–60 characters for optimal SERP display")
	}

	if seo["meta_desc"] == "fail" {
		weakPoints = append(weakPoints, "No meta description — Google will auto-generate one, often poorly")
		recommendations = append(recommendations, "Write a compelling 120–160 char meta description with a clear value proposition")
	} else if seo["meta_desc"] == "warning" {
		weakPoints = append(weakPoints, "Meta description is outside the recommended length")
		recommendations = append(recommendations, "Revise the meta description to 120–160 characters")
	}

	if seo["canonical"] == "fail" {
		weakPoints = append(weakPoints, "No canonical URL tag — risk of duplicate content penalties")
		recommendations = append(recommendations, "Add <link rel=\"canonical\" href=\"...\"> in the <head> to prevent duplicate content issues")
	}

	if seo["h1_count"] == "fail" || seo["h1_count"] == "warning" {
		if seo["h1_count"] == "fail" {
			weakPoints = append(weakPoints, "No H1 heading — primary page topic is unclear to search engines")
			recommendations = append(recommendations, "Add a single H1 heading that clearly describes the page's main topic")
		} else {
			weakPoints = append(weakPoints, "Multiple H1 tags found — this can dilute keyword focus")
			recommendations = append(recommendations, "Reduce to a single H1 tag; use H2/H3 for subheadings")
		}
	}

	if seo["img_alt"] == "warning" || seo["img_alt"] == "fail" {
		weakPoints = append(weakPoints, "Images missing alt text — hurts accessibility and image SEO")
		recommendations = append(recommendations, "Add descriptive alt attributes to all images; include keywords naturally where relevant")
	}

	if seo["og_tags"] == "fail" {
		weakPoints = append(weakPoints, "Missing Open Graph tags — social media shares will look poor")
		recommendations = append(recommendations, "Add og:title, og:description, and og:image meta tags for rich social previews")
	} else if seo["og_tags"] == "warning" {
		weakPoints = append(weakPoints, "Incomplete Open Graph tags — social previews may be missing image or text")
		recommendations = append(recommendations, "Complete your Open Graph tags: ensure og:title, og:description, and og:image are all present")
	}

	if seo["schema"] == "fail" {
		weakPoints = append(weakPoints, "No structured data found — missing rich snippet opportunities")
		recommendations = append(recommendations, "Implement JSON-LD schema markup (Organization, WebPage, Product, or FAQ) for richer search results")
	}

	if seo["viewport"] == "fail" {
		weakPoints = append(weakPoints, "Missing viewport meta tag — page may not render correctly on mobile")
		recommendations = append(recommendations, "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"> in the <head>")
	}

	if seo["robots"] == "fail" {
		weakPoints = append(weakPoints, "Page has noindex directive — it will not appear in search results")
		recommendations = append(recommendations, "Remove the noindex directive if this page should be indexed by search engines")
	}

	if seo["https"] == "fail" {
		weakPoints = append(weakPoints, "Site not served over HTTPS — insecure and penalised by search engines and browsers")
		recommendations = append(recommendations, "Migrate to HTTPS with an SSL/TLS certificate — it's a confirmed Google ranking signal")
	}

	if seo["mixed_content"] == "warning" {
		weakPoints = append(weakPoints, "Mixed content detected — HTTP resources on an HTTPS page trigger browser security warnings")
		recommendations = append(recommendations, "Update all resource URLs (images, scripts, stylesheets) to use HTTPS")
	}

	// --- UX / Conversion weak points ---
	if !ux.HasCTA {
		weakPoints = append(weakPoints, "No clear call-to-action detected — visitors may not know what to do next")
		recommendations = append(recommendations, "Add prominent CTA buttons above the fold (e.g. \"Get Started\", \"Book a Demo\", \"Shop Now\")")
	}

	if !ux.HasForms {
		weakPoints = append(weakPoints, "No lead capture forms detected — no obvious way to collect visitor contact info")
		recommendations = append(recommendations, "Consider adding a contact form, newsletter signup, or demo request form")
	}

	if !ux.HasSocialProof {
		weakPoints = append(weakPoints, "No social proof detected — missing testimonials, reviews, or trust indicators")
		recommendations = append(recommendations, "Add testimonials, star ratings, customer logos, or a review count near your primary CTA")
	}

	if !ux.HasTrustSignals {
		weakPoints = append(weakPoints, "No trust signals found — visitors may hesitate to convert")
		recommendations = append(recommendations, "Add security badges, guarantees, certifications, or a privacy statement near CTAs")
	}

	if !ux.HasContactInfo {
		weakPoints = append(weakPoints, "No contact information found — reduces credibility and trust")
		recommendations = append(recommendations, "Display a phone number, email address, or live chat option in the header or footer")
	}

	return weakPoints, recommendations
}

// indexSEO returns a map from check ID to status string for O(1) lookups.
func indexSEO(checks []model.SEOCheck) map[string]string {
	m := make(map[string]string, len(checks))
	for _, c := range checks {
		m[c.ID] = c.Status
	}
	return m
}
