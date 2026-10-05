package parser

import (
	"strings"
	"testing"

	"github.com/ahomsi/explain-website/internal/model"
	"golang.org/x/net/html"
)

func uxFor(t *testing.T, body string) (hasContact bool, contactHref, contactText string) {
	t.Helper()
	raw := "<html><body>" + body + "</body></html>"
	doc, err := html.Parse(strings.NewReader(raw))
	if err != nil {
		t.Fatal(err)
	}
	ux := analyzeUX(doc, raw)
	if ux.ContactEvidence != nil {
		contactHref, contactText = ux.ContactEvidence.Href, ux.ContactEvidence.Text
	}
	return ux.HasContactInfo, contactHref, contactText
}

func TestContactRoutes(t *testing.T) {
	cases := []struct {
		name     string
		body     string
		want     bool
		wantHref string
	}{
		{"mailto", `<a href="mailto:hi@example.com">Email</a>`, true, "mailto:hi@example.com"},
		{"tel", `<a href="tel:+15551234567">Call</a>`, true, "tel:+15551234567"},
		{"contact page by path", `<a href="/contact">Get in touch</a>`, true, "/contact"},
		{"contact page by text", `<a href="/x">Contact us</a>`, true, "/x"},
		{"support path", `<a href="/support/">Help center</a>`, true, "/support/"},
		{"feedback text", `<a href="/f">Feedback</a>`, true, "/f"},
		{"github discussions only", `<a title="Contact" href="https://github.com/user/proj/discussions">Community</a>`, true, "https://github.com/user/proj/discussions"},
		{"gitlab issues", `<a href="https://gitlab.com/user/proj/-/issues">Issues</a>`, true, "https://gitlab.com/user/proj/-/issues"},
		{"unrelated github link", `<a href="https://github.com/user/proj">Source</a>`, false, ""},
		{"unrelated word containing help", `<a href="/helpful-articles-about-cats">Cats</a>`, false, ""},
		{"long headline mentioning support", `<a href="/blog/1">How we built support tooling for our five hundred person team</a>`, false, ""},
		{"no links", `<p>Hello</p>`, false, ""},
		{"contactus slug", `<a href="/contactus">Reach</a>`, true, "/contactus"},
		{"helpdesk slug", `<a href="/helpdesk">Reach</a>`, true, "/helpdesk"},
		{"helpcenter slug", `<a href="/helpcenter/">Reach</a>`, true, "/helpcenter/"},
		{"contact button", `<button>Contact us</button>`, true, ""},
		{"support button", `<button>Get support</button>`, true, ""},
		{"unrelated button", `<button>Subscribe</button>`, false, ""},
		{"long button", `<button>How we built support tooling for our five hundred person team</button>`, false, ""},
		{"hidden button", `<button hidden>Contact us</button>`, false, ""},
		{"display none button", `<div style="display:none"><button>Contact us</button></div>`, false, ""},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, href, _ := uxFor(t, tc.body)
			if got != tc.want {
				t.Fatalf("HasContactInfo = %v, want %v", got, tc.want)
			}
			if href != tc.wantHref {
				t.Fatalf("evidence href = %q, want %q", href, tc.wantHref)
			}
		})
	}
}

func TestContactPhoneTextIsEvidence(t *testing.T) {
	got, href, text := uxFor(t, `<p>Call us on 020 7946 0958 today</p>`)
	if !got {
		t.Fatal("expected phone number to count as contact")
	}
	if href != "" || !strings.Contains(text, "7946") {
		t.Fatalf("unexpected evidence href=%q text=%q", href, text)
	}
}

func TestPrivacyEvidence(t *testing.T) {
	raw := `<html><body><a href="/legal/privacy">Privacy</a></body></html>`
	doc, _ := html.Parse(strings.NewReader(raw))
	ux := analyzeUX(doc, raw)
	if !ux.HasPrivacyPolicy || ux.PrivacyEvidence == nil {
		t.Fatalf("expected privacy evidence, got %+v", ux)
	}
	if ux.PrivacyEvidence.Href != "/legal/privacy" || ux.PrivacyEvidence.Text != "Privacy" {
		t.Fatalf("unexpected evidence %+v", ux.PrivacyEvidence)
	}

	raw = `<html><body><a href="/legal">Read our Privacy Policy</a></body></html>`
	doc, _ = html.Parse(strings.NewReader(raw))
	ux = analyzeUX(doc, raw)
	if !ux.HasPrivacyPolicy || ux.PrivacyEvidence == nil || ux.PrivacyEvidence.Text != "Read our Privacy Policy" {
		t.Fatalf("expected text match with original casing, got %+v", ux.PrivacyEvidence)
	}

	raw = `<html><body><a href="/about">About</a></body></html>`
	doc, _ = html.Parse(strings.NewReader(raw))
	ux = analyzeUX(doc, raw)
	if ux.HasPrivacyPolicy || ux.PrivacyEvidence != nil {
		t.Fatalf("expected no privacy match, got %+v", ux)
	}
}

func TestContactRoutesTightened(t *testing.T) {
	cases := []struct {
		name string
		body string
		want bool
	}{
		{"text without href", `<a>Contact</a>`, false},
		{"hash href", `<a href="#">Contact</a>`, false},
		{"javascript href", `<a href="javascript:void(0)">Help</a>`, false},
		{"text with real href", `<a href="/x">Contact us</a>`, true},
		{"unicode text within limit", `<a href="/x">Contact — 联系我们 联系我们 联系我们 联系我们 联系我们 联系我们</a>`, true},
		{"github discussions item", `<a href="https://github.com/user/proj/discussions/12">Talk</a>`, true},
		{"github issues-demo repo", `<a href="https://github.com/user/issues-demo">Source</a>`, false},
		{"gitlab issues", `<a href="https://gitlab.com/u/p/-/issues">Bugs</a>`, true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, _, _ := uxFor(t, tc.body)
			if got != tc.want {
				t.Fatalf("HasContactInfo = %v, want %v", got, tc.want)
			}
		})
	}
}

func TestPrivacyIgnoresMailtoAndTel(t *testing.T) {
	for _, body := range []string{
		`<a href="mailto:privacy@x.com">Email us</a>`,
		`<a href="tel:+15551234567">Privacy line</a>`,
	} {
		raw := "<html><body>" + body + "</body></html>"
		doc, _ := html.Parse(strings.NewReader(raw))
		ux := analyzeUX(doc, raw)
		if ux.HasPrivacyPolicy || ux.PrivacyEvidence != nil {
			t.Fatalf("%s: unexpected privacy match %+v", body, ux.PrivacyEvidence)
		}
	}
	raw := `<html><body><a href="mailto:a@b.com">Our privacy policy</a></body></html>`
	doc, _ := html.Parse(strings.NewReader(raw))
	if ux := analyzeUX(doc, raw); !ux.HasPrivacyPolicy {
		t.Fatal("link text 'privacy policy' must still match")
	}
}

func buildRecommendationsForTest(t *testing.T) (weak, recs []string) {
	t.Helper()
	return generateRecommendations(nil, model.UXResult{})
}

func TestAdviceDoesNotRequireEmailOrPhone(t *testing.T) {
	_, recs := buildRecommendationsForTest(t)
	for _, r := range recs {
		if strings.Contains(r, "phone number, email address") {
			t.Fatalf("advice still pushes phone/email: %q", r)
		}
	}
	found := false
	for _, r := range recs {
		if strings.Contains(r, "An email or phone number is not required") {
			found = true
		}
	}
	if !found {
		t.Fatalf("expected reworded contact recommendation, got %v", recs)
	}
}
