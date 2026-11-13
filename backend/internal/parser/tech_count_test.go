package parser

import "testing"

// advertisedTechCount is the number the site quotes ("400+ technologies").
// The copy lives in frontend/src/seo/facts.ts (TECH_COUNT_LABEL); raise
// both together, and never let the catalog fall below what the site claims.
const advertisedTechCount = 400

// catalogTechCount counts every distinct technology the tech stack section can
// report: page source patterns, response header and cookie signals and the services
// Lighthouse confirms from network requests. Names are deduped the same way
// the report dedupes them.
func catalogTechCount() int {
	names := map[string]struct{}{}
	for _, p := range techPatterns {
		names[canonicalTechName(p.name)] = struct{}{}
	}
	for _, h := range headerTechSignals {
		names[canonicalTechName(h.name)] = struct{}{}
	}
	for _, h := range headerPresenceSignals {
		names[canonicalTechName(h.name)] = struct{}{}
	}
	for _, c := range cookieTechSignals {
		names[canonicalTechName(c.name)] = struct{}{}
	}
	for _, name := range conventionTechNames {
		names[canonicalTechName(name)] = struct{}{}
	}
	for _, meta := range thirdPartyEntityMap {
		names[canonicalTechName(meta.Name)] = struct{}{}
	}
	return len(names)
}

func TestCatalogCoversAdvertisedTechCount(t *testing.T) {
	got := catalogTechCount()
	t.Logf("tech catalog holds %d distinct technologies", got)
	if got < advertisedTechCount {
		t.Fatalf("the site advertises %d+ technologies but the catalog only holds %d", advertisedTechCount, got)
	}
}
