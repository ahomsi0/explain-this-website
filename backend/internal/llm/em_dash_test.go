package llm

import "testing"

// The AI summary is the one piece of report text the product does not write
// itself, so it is cleaned on the way out.
func TestStripEmDashes(t *testing.T) {
	cases := map[string]string{
		"The site is fast — pages load in under a second.": "The site is fast, pages load in under a second.",
		"Strong SEO—weak conversion.":                      "Strong SEO-weak conversion.",
		"No dashes here, only commas.":                     "No dashes here, only commas.",
		"A range of 120–160 characters stays as it is.":    "A range of 120–160 characters stays as it is.",
	}
	for in, want := range cases {
		if got := stripEmDashes(in); got != want {
			t.Errorf("stripEmDashes(%q) = %q, want %q", in, got, want)
		}
	}
}
