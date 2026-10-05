package parser

import (
	"fmt"
	"net/url"
	"regexp"
	"strings"

	"github.com/ahomsi/explain-website/internal/model"
)

type hreflangEntry struct {
	lang string
	href string
}

var (
	// <html lang>: BCP 47 language tag (language plus optional subtags).
	htmlLangRe = regexp.MustCompile(`^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$`)
	// hreflang: language[-script][-region], or the literal x-default.
	hreflangRe = regexp.MustCompile(`^[A-Za-z]{2,3}(-[A-Za-z]{4})?(-([A-Za-z]{2}|[0-9]{3}))?$`)
	// og:locale is ll_CC (underscore), though a bare language is tolerated.
	ogLocaleRe = regexp.MustCompile(`^[A-Za-z]{2,3}(_[A-Za-z]{2})?$`)
)

func primaryLanguage(tag string) string {
	tag = strings.ToLower(strings.TrimSpace(tag))
	if i := strings.IndexAny(tag, "-_"); i >= 0 {
		tag = tag[:i]
	}
	return tag
}

// normalizePageURL makes two URLs comparable: resolved against base, no
// fragment, no trailing slash, lowercase scheme and host.
func normalizePageURL(base, ref string) string {
	b, err := url.Parse(base)
	if err != nil {
		return ""
	}
	r, err := url.Parse(strings.TrimSpace(ref))
	if err != nil {
		return ""
	}
	u := b.ResolveReference(r)
	u.Fragment = ""
	u.Scheme = strings.ToLower(u.Scheme)
	u.Host = strings.ToLower(u.Host)
	u.Path = strings.TrimRight(u.Path, "/")
	return u.String()
}

// buildInternationalCheck reports language and locale problems. It is optional
// (excluded from scoring) because a single-language site has nothing to fix
// beyond declaring its language.
func buildInternationalCheck(s *seoState, sourceURL string) model.SEOCheck {
	check := model.SEOCheck{ID: "international", Label: "International Readiness", Optional: true}
	var issues []string
	lang := strings.TrimSpace(s.htmlLang)

	// <html lang> — also WCAG 3.1.1, so screen readers pronounce the page correctly.
	switch {
	case lang == "":
		issues = append(issues, "The <html> element has no lang attribute — screen readers, translation tools and search engines have to guess the language")
	case !htmlLangRe.MatchString(lang):
		issues = append(issues, fmt.Sprintf("lang=%q is not a valid language code (use e.g. \"en\" or \"en-GB\")", lang))
	}

	// hreflang entries.
	if len(s.hreflangEntries) > 0 {
		seen := map[string]bool{}
		selfRef, hasDefault, matchesLang := false, false, false
		self := normalizePageURL(sourceURL, sourceURL)
		canonical := ""
		if s.canonicalURL != "" {
			canonical = normalizePageURL(sourceURL, s.canonicalURL)
		}
		for _, e := range s.hreflangEntries {
			l := strings.TrimSpace(e.lang)
			key := strings.ToLower(l)
			if key == "x-default" {
				hasDefault = true
			} else if !hreflangRe.MatchString(l) {
				issues = append(issues, fmt.Sprintf("hreflang %q is not valid — use a language code like \"en\" or \"fr-CA\" (hyphen, not underscore)", l))
			} else if lang != "" && primaryLanguage(l) == primaryLanguage(lang) {
				matchesLang = true
			}
			if seen[key] {
				issues = append(issues, fmt.Sprintf("hreflang %q appears more than once", l))
			}
			seen[key] = true

			if u, err := url.Parse(strings.TrimSpace(e.href)); err != nil || !u.IsAbs() {
				issues = append(issues, fmt.Sprintf("hreflang %q uses a relative URL — hreflang URLs must be absolute", l))
			}
			// The self-reference must be a real language entry; an x-default
			// that happens to point here doesn't count.
			if n := normalizePageURL(sourceURL, e.href); key != "x-default" && n != "" && (n == self || n == canonical) {
				selfRef = true
			}
		}
		if !selfRef && !onlyDefault(s.hreflangEntries) {
			issues = append(issues, "No hreflang entry points to this page itself — every page in the set should list itself")
		}
		if !hasDefault && len(s.hreflangEntries) > 1 {
			issues = append(issues, "No x-default hreflang entry — add one for visitors whose language you don't serve")
		}
		if lang != "" && htmlLangRe.MatchString(lang) && !matchesLang {
			issues = append(issues, fmt.Sprintf("lang=%q but there is no hreflang entry for that language", lang))
		}
	}

	// og:locale consistency.
	if loc := strings.TrimSpace(s.ogLocale); loc != "" {
		switch {
		case strings.Contains(loc, "-"):
			issues = append(issues, fmt.Sprintf("og:locale %q should use an underscore (e.g. \"en_US\")", loc))
		case !ogLocaleRe.MatchString(loc):
			issues = append(issues, fmt.Sprintf("og:locale %q is not a valid locale (use e.g. \"en_US\")", loc))
		case lang != "" && htmlLangRe.MatchString(lang) && primaryLanguage(loc) != primaryLanguage(lang):
			issues = append(issues, fmt.Sprintf("og:locale %q doesn't match lang=%q", loc, lang))
		}
	}

	if len(issues) == 0 {
		check.Status = "pass"
		if len(s.hreflangEntries) > 0 {
			check.Detail = fmt.Sprintf("Language (%s), hreflang and locale are consistent", lang)
		} else {
			check.Detail = fmt.Sprintf("Language declared as %q — single-language site, nothing else needed", lang)
		}
		return check
	}
	check.Status = "warning"
	check.Details = issues
	if len(issues) == 1 {
		check.Detail = "1 international-readiness issue"
	} else {
		check.Detail = fmt.Sprintf("%d international-readiness issues", len(issues))
	}
	return check
}

// onlyDefault reports whether every hreflang entry is x-default (e.g. a
// language-picker page), in which case no per-language self-reference is expected.
func onlyDefault(entries []hreflangEntry) bool {
	for _, e := range entries {
		if strings.ToLower(strings.TrimSpace(e.lang)) != "x-default" {
			return false
		}
	}
	return true
}
