package parser

import (
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/ahomsi/explain-website/internal/model"
)

// FetchDomainInfo calls the RDAP API for the domain in rawURL.
// Returns nil on any failure — domain info is always optional.
func FetchDomainInfo(rawURL string) *model.DomainInfo {
	u, err := url.Parse(rawURL)
	if err != nil {
		return nil
	}
	hostname := u.Hostname()
	// Strip subdomains — use the registrable domain (last two labels).
	// RDAP only works on registered domains, not subdomains.
	parts := strings.Split(hostname, ".")
	if len(parts) >= 2 {
		hostname = strings.Join(parts[len(parts)-2:], ".")
	}

	rdapURL := fmt.Sprintf("https://rdap.org/domain/%s", hostname)
	client := &http.Client{
		Timeout: 10 * time.Second,
		Transport: &http.Transport{
			DialContext: (&net.Dialer{Timeout: 5 * time.Second}).DialContext,
		},
	}
	resp, err := client.Get(rdapURL)
	if err != nil {
		return nil
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return nil
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, 64*1024))
	if err != nil {
		return nil
	}
	return parseDomainInfo(body)
}

// rdapResponse is the subset of the RDAP JSON we care about.
type rdapResponse struct {
	Events []struct {
		Action string `json:"eventAction"`
		Date   string `json:"eventDate"`
	} `json:"events"`
	Entities []struct {
		Roles      []string        `json:"roles"`
		VcardArray json.RawMessage `json:"vcardArray"`
	} `json:"entities"`
}

// parseDomainInfo parses a raw RDAP JSON response body into a DomainInfo.
// Unexported so it can be unit-tested without network.
func parseDomainInfo(data []byte) *model.DomainInfo {
	var r rdapResponse
	if err := json.Unmarshal(data, &r); err != nil {
		return nil
	}

	info := &model.DomainInfo{AgeYears: -1}

	for _, ev := range r.Events {
		if len(ev.Date) < 10 {
			continue
		}
		dateStr := ev.Date[:10] // "YYYY-MM-DD"
		switch strings.ToLower(ev.Action) {
		case "registration":
			info.RegisteredAt = dateStr
			if t, err := time.Parse("2006-01-02", dateStr); err == nil {
				info.AgeYears = time.Now().Year() - t.Year()
			}
		case "expiration":
			info.ExpiresAt = dateStr
		}
	}

	// Extract registrar name from vcardArray.
	for _, ent := range r.Entities {
		for _, role := range ent.Roles {
			if strings.EqualFold(role, "registrar") {
				info.Registrar = extractRegistrarName(ent.VcardArray)
				break
			}
		}
	}

	if info.RegisteredAt == "" {
		return nil // no useful data
	}
	return info
}

// extractRegistrarName parses the vcardArray JSON to find the "fn" (full name) field.
func extractRegistrarName(raw json.RawMessage) string {
	// vcardArray = ["vcard", [[type, params, kind, value], ...]]
	var arr []json.RawMessage
	if err := json.Unmarshal(raw, &arr); err != nil || len(arr) < 2 {
		return ""
	}
	var props [][]json.RawMessage
	if err := json.Unmarshal(arr[1], &props); err != nil {
		return ""
	}
	for _, prop := range props {
		if len(prop) < 4 {
			continue
		}
		var propType string
		if err := json.Unmarshal(prop[0], &propType); err != nil {
			continue
		}
		if strings.EqualFold(propType, "fn") {
			var val string
			if err := json.Unmarshal(prop[3], &val); err == nil {
				return val
			}
		}
	}
	return ""
}
