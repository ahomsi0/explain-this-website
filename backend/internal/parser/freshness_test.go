package parser

import (
	"fmt"
	"strings"
	"testing"
	"time"

	"golang.org/x/net/html"
)

func TestAuditFreshnessIgnoresFutureDates(t *testing.T) {
	future := time.Now().UTC().AddDate(0, 0, 30).Format("2006-01-02")
	rawHTML := fmt.Sprintf(`<html><head>
		<meta property="article:modified_time" content="%s">
	</head><body><time datetime="%s">Future</time></body></html>`, future, future)
	doc, err := html.Parse(strings.NewReader(rawHTML))
	if err != nil {
		t.Fatal(err)
	}

	result := auditFreshness(doc, rawHTML)
	if result.LatestDate != "" || result.Rating != "unknown" {
		t.Fatalf("future dates should not make a site look fresh: %+v", result)
	}
}
