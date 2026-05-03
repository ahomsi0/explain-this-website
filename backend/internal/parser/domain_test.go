package parser

import (
	"testing"
)

func TestParseDomainInfo_Full(t *testing.T) {
	data := []byte(`{
		"events": [
			{"eventAction": "registration", "eventDate": "2012-03-15T00:00:00Z"},
			{"eventAction": "expiration",   "eventDate": "2027-03-15T00:00:00Z"}
		],
		"entities": [{
			"roles": ["registrar"],
			"vcardArray": ["vcard", [
				["version", {}, "text", "4.0"],
				["fn",      {}, "text", "Cloudflare, Inc."]
			]]
		}]
	}`)
	result := parseDomainInfo(data)
	if result == nil {
		t.Fatal("expected non-nil result")
	}
	if result.RegisteredAt != "2012-03-15" {
		t.Errorf("expected RegisteredAt=2012-03-15, got %q", result.RegisteredAt)
	}
	if result.ExpiresAt != "2027-03-15" {
		t.Errorf("expected ExpiresAt=2027-03-15, got %q", result.ExpiresAt)
	}
	if result.Registrar != "Cloudflare, Inc." {
		t.Errorf("expected Cloudflare registrar, got %q", result.Registrar)
	}
	if result.AgeYears < 1 {
		t.Errorf("expected AgeYears >= 1, got %d", result.AgeYears)
	}
}

func TestParseDomainInfo_NoExpiry(t *testing.T) {
	data := []byte(`{
		"events": [
			{"eventAction": "registration", "eventDate": "2020-06-01T00:00:00Z"}
		],
		"entities": []
	}`)
	result := parseDomainInfo(data)
	if result == nil {
		t.Fatal("expected non-nil result")
	}
	if result.ExpiresAt != "" {
		t.Errorf("expected empty ExpiresAt, got %q", result.ExpiresAt)
	}
	if result.Registrar != "" {
		t.Errorf("expected empty Registrar, got %q", result.Registrar)
	}
}

func TestParseDomainInfo_InvalidJSON(t *testing.T) {
	result := parseDomainInfo([]byte(`not json`))
	if result != nil {
		t.Error("expected nil for invalid JSON")
	}
}
