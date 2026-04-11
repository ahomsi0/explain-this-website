package parser

import (
	"fmt"
	"strings"

	"github.com/ahomsi/explain-website/internal/model"
)

// ── Intent detection ──────────────────────────────────────────────────────────

// inferIntent classifies the website's primary purpose from page signals.
func inferIntent(overview model.Overview, tech []model.TechItem, ux model.UXResult, stats model.PageStats, rawHTML string) model.IntentSummary {
	lower := strings.ToLower(rawHTML)
	combined := strings.ToLower(overview.Title + " " + overview.Description)

	hasEcommerceTech := hasTechCat(tech, "ecommerce")
	hasFramework := hasTechCat(tech, "framework")

	// E-commerce
	ecom := 0
	if hasEcommerceTech {
		ecom += 3
	}
	if anyIn(lower, "add to cart", "add to bag", "checkout", "shopping cart", "buy now", "purchase") {
		ecom += 2
	}
	if anyIn(combined, "shop", "store", "product", "buy", "order") {
		ecom++
	}
	if ecom >= 3 {
		return model.IntentSummary{
			Category:    "ecommerce",
			Label:       "E-commerce Store",
			Description: "This appears to be an e-commerce store focused on selling products directly to customers.",
		}
	}

	// SaaS / Web App
	saas := 0
	if anyIn(combined, "free trial", "sign up", "signup", "dashboard", "pricing", "platform", "software") {
		saas += 2
	}
	if anyIn(lower, "free trial", "start for free", "get started", "sign up free", "create account") {
		saas += 2
	}
	if hasFramework && !hasEcommerceTech {
		saas++
	}
	if ux.HasForms && ux.CTACount >= 2 {
		saas++
	}
	if saas >= 3 {
		return model.IntentSummary{
			Category:    "saas",
			Label:       "SaaS / Web App",
			Description: "This looks like a SaaS product or web application targeting users who want to sign up or start a trial.",
		}
	}

	// Portfolio
	portfolio := 0
	if anyIn(combined, "portfolio", "my work", "hire me", "case study", "projects") {
		portfolio += 2
	}
	if anyIn(lower, "portfolio", "my work", "hire me", "case study", "about me", "i'm a", "i am a") {
		portfolio += 2
	}
	if stats.InternalLinks < 12 && stats.WordCount < 1200 {
		portfolio++
	}
	if portfolio >= 2 {
		return model.IntentSummary{
			Category:    "portfolio",
			Label:       "Portfolio / Showcase",
			Description: "This appears to be a personal portfolio or showcase site, likely aimed at attracting clients or employers.",
		}
	}

	// Blog / Content site
	blog := 0
	if stats.WordCount > 1800 {
		blog++
	}
	if stats.H2Count+stats.H3Count > 8 {
		blog++
	}
	if anyIn(lower, "read more", "latest post", "recent article", "subscribe", "author", "published on", "comment") {
		blog += 2
	}
	if stats.ExternalLinks > 8 {
		blog++
	}
	if blog >= 3 {
		return model.IntentSummary{
			Category:    "blog",
			Label:       "Blog / Content Site",
			Description: "This looks like a content-driven site or blog aimed at informing or educating its audience.",
		}
	}

	// Landing page
	landing := 0
	if ux.CTACount >= 3 {
		landing++
	}
	if stats.WordCount < 700 {
		landing++
	}
	if stats.InternalLinks < 8 {
		landing++
	}
	if anyIn(lower, "limited time", "exclusive offer", "join now", "get access", "claim your") {
		landing += 2
	}
	if landing >= 3 {
		return model.IntentSummary{
			Category:    "landing",
			Label:       "Landing Page",
			Description: "This appears to be a focused landing page designed to drive a single conversion action.",
		}
	}

	// Service business
	service := 0
	if ux.HasContactInfo {
		service++
	}
	if ux.HasForms {
		service++
	}
	if anyIn(lower, "get a quote", "book a", "schedule a", "consultation", "appointment", "our services", "call us") {
		service += 2
	}
	if anyIn(combined, "service", "agency", "studio", "consultant", "freelance") {
		service += 2
	}
	if service >= 3 {
		return model.IntentSummary{
			Category:    "service",
			Label:       "Service Business",
			Description: "This looks like a service-oriented business website aimed at attracting and converting local or online clients.",
		}
	}

	// Corporate / Enterprise
	corporate := 0
	if stats.InternalLinks > 20 {
		corporate++
	}
	if anyIn(lower, "about us", "our team", "careers", "investors", "press release", "annual report") {
		corporate += 2
	}
	if anyIn(combined, "enterprise", "corporation", "group", "holdings", "global") {
		corporate += 2
	}
	if corporate >= 2 {
		return model.IntentSummary{
			Category:    "corporate",
			Label:       "Corporate / Business",
			Description: "This appears to be a corporate or established business site focused on brand presence and information.",
		}
	}

	return model.IntentSummary{
		Category:    "general",
		Label:       "General Website",
		Description: "This appears to be a general informational website. Defining a clearer purpose would help both visitors and search engines.",
	}
}

// ── Customer view ─────────────────────────────────────────────────────────────

// buildCustomerView produces a first-time visitor evaluation of the page.
func buildCustomerView(overview model.Overview, ux model.UXResult, seo map[string]string, stats model.PageStats, isHTTPS bool) model.CustomerView {
	titleOK := overview.Title != "" && len(overview.Title) >= 15
	descOK := overview.Description != "" && len(overview.Description) >= 50
	h1OK := stats.H1Count == 1
	offerClear := titleOK && (h1OK || descOK)

	ctaClear := ux.HasCTA

	strongTrust := isHTTPS && ux.HasTrustSignals && ux.HasPrivacyPolicy
	noTrust := !ux.HasTrustSignals && !ux.HasSocialProof && !ux.HasContactInfo
	var trustLevel string
	switch {
	case strongTrust || (ux.HasTrustSignals && ux.HasSocialProof):
		trustLevel = "strong"
	case noTrust:
		trustLevel = "weak"
	default:
		trustLevel = "moderate"
	}

	var stmts []string

	// Offer clarity
	if offerClear {
		stmts = append(stmts, "As a visitor, I can quickly understand what this website offers — the headline and description communicate the value clearly.")
	} else {
		stmts = append(stmts, "As a visitor, I struggle to grasp what this website is about — the main message isn't immediately obvious from the headline.")
	}

	// CTA
	if ctaClear {
		stmts = append(stmts, "The next step is clear — there's a visible call-to-action guiding me toward taking action.")
	} else {
		stmts = append(stmts, "The next step is not obvious — I'm not sure what I'm supposed to do after reading the page.")
	}

	// Trust
	switch trustLevel {
	case "strong":
		stmts = append(stmts, "Trust is well reinforced — the page has visible signals of legitimacy, security, and credibility.")
	case "moderate":
		stmts = append(stmts, "Trust is partially established — some signals are present, but more reassurance would help first-time visitors feel confident.")
	case "weak":
		stmts = append(stmts, "Trust is not well established — there are no visible signals to reassure me that this is a safe and legitimate business.")
	}

	// Friction / loading
	heavyPage := stats.RenderBlockingScripts >= 3 || stats.ScriptCount > 12
	if heavyPage {
		stmts = append(stmts, "The page may feel slow — multiple blocking scripts can delay content from appearing, which increases early drop-off.")
	} else {
		stmts = append(stmts, "The page feels accessible and fast — no obvious loading friction was detected.")
	}

	// Value proposition
	if descOK {
		stmts = append(stmts, "The value proposition is understandable — I can see what's being offered and why it matters.")
	} else {
		stmts = append(stmts, "The value proposition isn't immediately obvious — it's not entirely clear why I should choose this over alternatives.")
	}

	return model.CustomerView{
		OfferClear: offerClear,
		CTAClear:   ctaClear,
		TrustLevel: trustLevel,
		Statements: stmts,
	}
}

// ── Conversion scores ─────────────────────────────────────────────────────────

// computeConversionScores derives four focused sub-scores from existing signals.
func computeConversionScores(ux model.UXResult, seo map[string]string, stats model.PageStats, isHTTPS bool, readingLevel string) model.ConversionScores {
	// Clarity (0–100): can visitors quickly understand the offer?
	clarity := 0
	clarityReasons := []string{}
	if stats.H1Count == 1 {
		clarity += 28
		clarityReasons = append(clarityReasons, "clear H1 heading present")
	} else if stats.H1Count == 0 {
		clarityReasons = append(clarityReasons, "no H1 heading")
	}
	if seo["meta_desc"] == "pass" {
		clarity += 24
		clarityReasons = append(clarityReasons, "meta description present")
	} else {
		clarityReasons = append(clarityReasons, "meta description missing or weak")
	}
	if seo["title"] == "pass" {
		clarity += 20
		clarityReasons = append(clarityReasons, "well-formed page title")
	}
	if ux.HasCTA {
		clarity += 18
		clarityReasons = append(clarityReasons, "CTA visible")
	} else {
		clarityReasons = append(clarityReasons, "no CTA found")
	}
	if readingLevel == "simple" || readingLevel == "moderate" {
		clarity += 10
		clarityReasons = append(clarityReasons, "accessible reading level")
	}
	clarityNote := describeScore(clarity, clarityReasons)

	// Trust (0–100): do visitors feel safe and confident?
	trust := 0
	trustReasons := []string{}
	if isHTTPS {
		trust += 25
		trustReasons = append(trustReasons, "HTTPS secured")
	} else {
		trustReasons = append(trustReasons, "not HTTPS")
	}
	if ux.HasPrivacyPolicy {
		trust += 20
		trustReasons = append(trustReasons, "privacy policy present")
	} else {
		trustReasons = append(trustReasons, "no privacy policy")
	}
	if ux.HasTrustSignals {
		trust += 20
		trustReasons = append(trustReasons, "trust signals visible")
	} else {
		trustReasons = append(trustReasons, "no trust signals")
	}
	if ux.HasContactInfo {
		trust += 20
		trustReasons = append(trustReasons, "contact info visible")
	} else {
		trustReasons = append(trustReasons, "no contact info")
	}
	if ux.HasSocialProof {
		trust += 15
		trustReasons = append(trustReasons, "social proof present")
	} else {
		trustReasons = append(trustReasons, "no social proof")
	}
	trustNote := describeScore(trust, trustReasons)

	// CTA Strength (0–100): how well does the page drive action?
	cta := 0
	ctaReasons := []string{}
	if ux.HasCTA {
		cta += 50
		ctaReasons = append(ctaReasons, "CTAs present")
		if ux.CTACount >= 3 {
			cta += 20
			ctaReasons = append(ctaReasons, fmt.Sprintf("%d CTAs detected", ux.CTACount))
		}
	} else {
		ctaReasons = append(ctaReasons, "no CTAs found")
	}
	if ux.HasForms {
		cta += 20
		ctaReasons = append(ctaReasons, "lead capture form present")
	}
	if ux.HasNewsletterSignup {
		cta += 10
		ctaReasons = append(ctaReasons, "newsletter signup present")
	}
	ctaNote := describeScore(cta, ctaReasons)

	// Friction (0–100): higher = less friction = better experience
	friction := 100
	frictionReasons := []string{}
	if stats.RenderBlockingScripts >= 3 {
		friction -= 25
		frictionReasons = append(frictionReasons, fmt.Sprintf("%d render-blocking scripts", stats.RenderBlockingScripts))
	} else if stats.RenderBlockingScripts >= 1 {
		friction -= 10
		frictionReasons = append(frictionReasons, fmt.Sprintf("%d render-blocking script", stats.RenderBlockingScripts))
	}
	if stats.ScriptCount > 12 {
		friction -= 15
		frictionReasons = append(frictionReasons, "many scripts loaded")
	}
	if readingLevel == "advanced" {
		friction -= 15
		frictionReasons = append(frictionReasons, "complex language may lose visitors")
	}
	if !ux.HasCTA {
		friction -= 15
		frictionReasons = append(frictionReasons, "no clear next step increases confusion")
	}
	if !ux.MobileReady {
		friction -= 15
		frictionReasons = append(frictionReasons, "not mobile-optimised")
	}
	if friction < 0 {
		friction = 0
	}
	if len(frictionReasons) == 0 {
		frictionReasons = append(frictionReasons, "no significant friction detected")
	}
	frictionNote := describeScore(friction, frictionReasons)

	overall := (clarity*30 + trust*25 + cta*30 + friction*15) / 100

	return model.ConversionScores{
		Overall:      overall,
		Clarity:      clarity,
		Trust:        trust,
		CTAStrength:  cta,
		Friction:     friction,
		ClarityNote:  clarityNote,
		TrustNote:    trustNote,
		CTANote:      ctaNote,
		FrictionNote: frictionNote,
	}
}

// ── First impression score ────────────────────────────────────────────────────

// computeFirstImpression rates how clear and compelling the page feels on first scan.
func computeFirstImpression(overview model.Overview, ux model.UXResult, seo map[string]string, stats model.PageStats, isHTTPS bool) model.FirstImpression {
	score := 0

	if stats.H1Count == 1 {
		score += 2 // clear main heading
	}
	if ux.HasCTA {
		score += 2 // visible action
	}
	if isHTTPS {
		score++ // secure
	}
	if seo["meta_desc"] == "pass" {
		score++ // descriptive snippet
	}
	if ux.MobileReady {
		score++ // works on mobile
	}
	if ux.HasTrustSignals || ux.HasSocialProof {
		score++ // credibility signal
	}
	if overview.Description != "" && len(overview.Description) >= 50 {
		score++ // offer described
	}
	if stats.RenderBlockingScripts == 0 && stats.ScriptCount <= 8 {
		score++ // no obvious performance drag
	}

	if score > 10 {
		score = 10
	}

	var label string
	switch {
	case score <= 2:
		label = "Poor"
	case score <= 4:
		label = "Weak"
	case score <= 6:
		label = "Fair"
	case score <= 8:
		label = "Good"
	default:
		label = "Strong"
	}

	var explanation string
	switch {
	case score <= 2:
		explanation = "The page gives very little to work with in the first few seconds — no clear headline, no CTA, and limited trust signals."
	case score <= 4:
		explanation = "The first impression is weak — key elements like a clear heading, CTA, or trust signals are missing or underdeveloped."
	case score <= 6:
		explanation = "The page makes a reasonable first impression but key elements could be stronger — especially the headline or CTA clarity."
	case score <= 8:
		explanation = "The page makes a solid first impression — it's clear, has a visible CTA, and feels reasonably trustworthy."
	default:
		explanation = "The page makes a strong first impression — the offer is clear, a CTA is prominent, and trust is well established."
	}

	return model.FirstImpression{Score: score, Label: label, Explanation: explanation}
}

// ── Biggest missed opportunity ────────────────────────────────────────────────

// findBiggestOpportunity returns the single highest-impact improvement for this page.
func findBiggestOpportunity(seo map[string]string, ux model.UXResult, stats model.PageStats) string {
	switch {
	case seo["robots"] == "fail":
		return "The page has a noindex directive — it won't appear in search results at all. Removing it would immediately restore search visibility."
	case seo["https"] == "fail":
		return "The site is not on HTTPS. Switching would instantly improve visitor trust, eliminate browser security warnings, and benefit search rankings."
	case !ux.HasCTA:
		return "There is no call-to-action on the page. Adding one clear, prominent CTA above the fold would be the single highest-leverage conversion improvement."
	case seo["h1_count"] == "fail":
		return "The page has no H1 heading — the most fundamental signal to both visitors and search engines about what the page is about. Adding one is an immediate win."
	case seo["title"] == "fail":
		return "There is no page title. This is one of the most basic SEO elements — without it, search engines have no title to show in results."
	case stats.RenderBlockingScripts >= 3:
		return fmt.Sprintf("%d render-blocking scripts are slowing the page. Deferring or removing them would directly improve loading speed and visitor experience.", stats.RenderBlockingScripts)
	case !ux.HasTrustSignals && !ux.HasSocialProof:
		return "There are no visible trust signals or social proof on the page. Adding testimonials, certifications, or a review count near the CTA could significantly lift conversion."
	case seo["img_alt"] == "fail":
		return "A majority of images are missing alt text — this directly hurts accessibility, image SEO, and the experience for users relying on screen readers."
	case seo["meta_desc"] == "fail":
		return "There is no meta description, so Google auto-generates one. Writing a compelling 120–160 character description would immediately improve click-through rates from search."
	case !ux.HasContactInfo:
		return "There's no contact information visible on the page. For most business sites, making it easy to get in touch is a direct driver of leads and trust."
	default:
		return "The biggest opportunity is improving overall content structure — a clearer headline, stronger CTA, and visible trust signals would make a meaningful difference."
	}
}

// ── Competitor / market positioning insight ───────────────────────────────────

// buildCompetitorInsight returns a short heuristic insight about market positioning.
func buildCompetitorInsight(intent model.IntentSummary, tech []model.TechItem, ux model.UXResult, stats model.PageStats) string {
	switch intent.Category {
	case "ecommerce":
		if !ux.HasTrustSignals && !ux.HasSocialProof {
			return "In a competitive e-commerce environment, trust signals like reviews, guarantees, and security badges are often the deciding factor at the moment of purchase."
		}
		return "E-commerce is highly competitive — conversion rate optimisation, product photography, and social proof are the most common differentiators against similar stores."
	case "saas":
		if !ux.HasForms {
			return "SaaS products live and die by their signup funnel — a frictionless trial or demo request form is often the strongest lever against competitors."
		}
		return "SaaS is a crowded space — clear positioning, a prominent free trial offer, and a tight value proposition are the fastest ways to stand out to first-time visitors."
	case "portfolio":
		if !ux.HasContactInfo {
			return "Portfolio sites compete on credibility and ease of contact — making it simple for potential clients to reach out is the most direct way to generate leads."
		}
		return "Portfolios compete on distinctiveness and outcomes — showcasing measurable results alongside visuals helps separate strong work from a crowded field."
	case "blog":
		return "Content sites compete on depth and discoverability — structured data, internal linking, and topical clusters are the most effective long-term SEO levers."
	case "landing":
		return "Landing pages are won or lost on conversion rate — a single clear headline, one focused CTA, and visible social proof are the essential ingredients that separate high-converting pages from low ones."
	case "service":
		if !ux.HasContactInfo {
			return "Service businesses that make it immediately easy to get in touch consistently win more leads — a phone number, booking form, or live chat are high-value additions."
		}
		return "Service businesses compete locally and on trust — reviews, case studies, and clear contact paths are the primary differentiators in most niches."
	case "corporate":
		return "Corporate sites often under-invest in SEO and conversion clarity — well-structured pages with targeted meta content and clear service descriptions can set you apart in organic search."
	default:
		return "Defining a clearer purpose and audience for this page would be the most impactful way to differentiate it and make it easier to find and convert visitors."
	}
}

// ── Prioritized issues ────────────────────────────────────────────────────────

// buildPrioritizedIssues ranks the top issues by real-world impact.
func buildPrioritizedIssues(seo map[string]string, ux model.UXResult, stats model.PageStats, isHTTPS bool) []model.PrioritizedIssue {
	type candidate struct {
		priority int
		issue    model.PrioritizedIssue
	}
	var candidates []candidate

	add := func(priority int, issue, impact, why string) {
		candidates = append(candidates, candidate{priority, model.PrioritizedIssue{Issue: issue, Impact: impact, Why: why}})
	}

	if seo["robots"] == "fail" {
		add(1, "Page set to noindex", "SEO", "The page will not appear in search results — complete loss of organic traffic.")
	}
	if !isHTTPS {
		add(2, "Site not on HTTPS", "SEO + Trust", "Browsers warn visitors it's insecure. Google uses HTTPS as a ranking signal.")
	}
	if !ux.HasCTA {
		add(3, "No call-to-action", "Conversion", "Visitors have no obvious next step — they're likely to leave without converting.")
	}
	if seo["h1_count"] == "fail" {
		add(4, "Missing H1 heading", "SEO + Clarity", "Without an H1, search engines and visitors can't immediately identify the page topic.")
	}
	if seo["title"] == "fail" {
		add(5, "Missing page title", "SEO", "No title means no search snippet — this is a fundamental on-page SEO requirement.")
	}
	if stats.RenderBlockingScripts >= 3 {
		add(6, fmt.Sprintf("%d render-blocking scripts", stats.RenderBlockingScripts), "Performance", "Blocking scripts delay content from appearing, increasing bounce rate from impatient visitors.")
	}
	if seo["img_alt"] == "fail" {
		add(7, "Most images lack alt text", "Accessibility + SEO", "Fails accessibility standards and removes those images from Google Image search.")
	}
	if !ux.HasTrustSignals && !ux.HasSocialProof {
		add(8, "No trust signals or social proof", "Conversion + Trust", "Visitors have no reason to believe the site is credible — this directly suppresses conversions.")
	}
	if seo["meta_desc"] == "fail" {
		add(9, "Missing meta description", "SEO", "Google generates a random snippet, often poorly representing the page in search results.")
	}
	if seo["canonical"] == "fail" {
		add(10, "No canonical URL tag", "SEO", "Risk of duplicate content penalties if the page is accessible via multiple URLs.")
	}
	if seo["img_alt"] == "warning" {
		add(11, "Some images lack alt text", "Accessibility + SEO", "Partial alt coverage still hurts image SEO and accessibility for affected images.")
	}
	if seo["og_tags"] == "fail" {
		add(12, "No Open Graph tags", "Reach", "Social shares show a blank preview — no image, no description — which drastically reduces click-throughs.")
	}
	if !ux.HasContactInfo {
		add(13, "No contact information visible", "Trust + Conversion", "Hard to reach = hard to trust. Contact info is a basic credibility signal for most businesses.")
	}

	// Sort by priority and take top 5
	for i := 0; i < len(candidates)-1; i++ {
		for j := i + 1; j < len(candidates); j++ {
			if candidates[j].priority < candidates[i].priority {
				candidates[i], candidates[j] = candidates[j], candidates[i]
			}
		}
	}
	max := 5
	if len(candidates) < max {
		max = len(candidates)
	}
	result := make([]model.PrioritizedIssue, max)
	for i := 0; i < max; i++ {
		result[i] = candidates[i].issue
		result[i].Rank = i + 1
	}
	return result
}

// ── ELI5 (Explain Like I'm 5) ────────────────────────────────────────────────

// buildELI5 translates technical findings into plain-language explanations.
func buildELI5(seo map[string]string, ux model.UXResult) []model.ELI5Item {
	var items []model.ELI5Item

	add := func(technical, simple string) {
		items = append(items, model.ELI5Item{Technical: technical, Simple: simple})
	}

	if seo["https"] == "fail" {
		add("Not on HTTPS",
			"Your website isn't secure. Visitors' browsers will show a 'Not Secure' warning, which makes people nervous about entering any information.")
	}
	if seo["robots"] == "fail" {
		add("Noindex directive active",
			"You've accidentally told Google not to show your page in search results. It's like putting a sign on your shop saying 'Don't come in.'")
	}
	if seo["title"] == "fail" {
		add("Missing page title",
			"Your page has no title. When it appears in Google search results or browser tabs, it shows as blank — people don't know what they're clicking on.")
	}
	if seo["title"] == "warning" {
		add("Page title too long or too short",
			"Your page title gets cut off with '...' in Google search results because it's too long, or it's too short to tell people what the page is about.")
	}
	if seo["meta_desc"] == "fail" {
		add("Missing meta description",
			"There's no preview text under your page title in Google. Google will just grab random words from your page, which often looks messy and doesn't convince people to click.")
	}
	if seo["meta_desc"] == "warning" {
		add("Meta description too short or long",
			"The short description shown under your page title in Google isn't the right length — either it gets cut off or it's too brief to be convincing.")
	}
	if seo["h1_count"] == "fail" {
		add("No H1 heading",
			"Your page has no main heading. Every page needs one clear headline that tells visitors (and Google) what the page is about — like the title of a chapter in a book.")
	}
	if seo["h1_count"] == "warning" {
		add("Multiple H1 headings",
			"Your page has several 'main headings' instead of just one. It's like a book that has three different titles — confusing for both readers and search engines.")
	}
	if seo["img_alt"] == "fail" || seo["img_alt"] == "warning" {
		add("Images missing alt text",
			"Some images on your page have no text description. People who can't see images — including visually impaired visitors and Google's image search — rely on those descriptions.")
	}
	if seo["canonical"] == "fail" {
		add("No canonical tag",
			"If your page can be reached at multiple web addresses, Google might treat them as duplicate pages and split your ranking between them. A canonical tag tells Google which address is the real one.")
	}
	if seo["og_tags"] == "fail" {
		add("No Open Graph tags",
			"When someone shares your page on Facebook, LinkedIn, or WhatsApp, there's no preview image or description — just a plain link. OG tags are what create the card preview people expect to see.")
	}
	if seo["schema"] == "fail" {
		add("No structured data",
			"Your page is missing special labels that help Google understand your content and display rich results — like star ratings, event dates, or FAQ dropdowns — directly in search results.")
	}
	if seo["viewport"] == "fail" {
		add("No viewport meta tag",
			"Your page isn't set up to display correctly on mobile phones. About half of all web traffic comes from phones, so the page will likely look broken or tiny on mobile.")
	}
	if !ux.HasCTA {
		add("No call-to-action",
			"There's no button or prompt telling visitors what to do next. Without one, people often just leave — they need to be guided toward the next step.")
	}
	if !ux.HasTrustSignals && !ux.HasSocialProof {
		add("No trust signals or social proof",
			"There's nothing on the page to prove your business is legitimate. No reviews, no testimonials, no certificates. First-time visitors have no reason to trust you over a competitor.")
	}
	if !ux.HasContactInfo {
		add("No contact information",
			"Visitors can't find a way to reach you. Most people expect to see a phone number, email, or contact link — without it, the site feels less trustworthy.")
	}
	if !ux.HasPrivacyPolicy {
		add("No privacy policy",
			"There's no privacy policy link. This is legally required in many countries (like under GDPR) and tells visitors that their data is handled responsibly.")
	}

	// Cap at 8 most important items
	if len(items) > 8 {
		items = items[:8]
	}
	return items
}

// ── Shared helpers ────────────────────────────────────────────────────────────

// hasTechCat returns true if any detected technology belongs to the given category.
func hasTechCat(tech []model.TechItem, category string) bool {
	for _, t := range tech {
		if t.Category == category {
			return true
		}
	}
	return false
}

// anyIn returns true if the haystack contains any of the provided substrings.
func anyIn(haystack string, needles ...string) bool {
	for _, n := range needles {
		if strings.Contains(haystack, n) {
			return true
		}
	}
	return false
}

// describeScore builds a short note from a score and the reasons that drove it.
func describeScore(score int, reasons []string) string {
	if len(reasons) == 0 {
		return ""
	}
	// Return first 2 reasons as a readable note
	max := 2
	if len(reasons) < max {
		max = len(reasons)
	}
	return strings.Join(reasons[:max], ", ")
}
