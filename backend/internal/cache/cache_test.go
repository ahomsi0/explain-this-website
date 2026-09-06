package cache

import (
	"testing"
	"time"

	"github.com/ahomsi/explain-website/internal/model"
)

func TestNormalizeURL(t *testing.T) {
	tests := []struct {
		name string
		in   string
		want string
	}{
		{name: "default path", in: "HTTPS://Example.com", want: "https://example.com/"},
		{name: "default port and fragment", in: "http://Example.com:80/path#section", want: "http://example.com/path"},
		{name: "query preserved", in: "https://Example.com/page?b=2&a=1", want: "https://example.com/page?b=2&a=1"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := NormalizeURL(tt.in); got != tt.want {
				t.Fatalf("NormalizeURL(%q) = %q, want %q", tt.in, got, tt.want)
			}
		})
	}
}

// The UI tells the user how stale a cached result is, so Get must report the
// entry's age alongside the result.
func TestGetReportsEntryAge(t *testing.T) {
	c := New(time.Minute)
	c.Set("https://example.com/", &model.AnalysisResult{URL: "https://example.com/"}, nil)

	// Backdate the entry so the age is deterministic.
	c.mu.Lock()
	e := c.entries["https://example.com/"]
	e.insertedAt = time.Now().Add(-90 * time.Second)
	e.expiresAt = time.Now().Add(time.Minute)
	c.entries["https://example.com/"] = e
	c.mu.Unlock()

	_, _, age, ok := c.Get("https://example.com/")
	if !ok {
		t.Fatalf("expected a cache hit")
	}
	if age < 89*time.Second || age > 92*time.Second {
		t.Fatalf("age = %v, want ~90s", age)
	}
}

func TestGetOnMissReportsZeroAge(t *testing.T) {
	c := New(time.Minute)
	if _, _, age, ok := c.Get("https://nothing.test/"); ok || age != 0 {
		t.Fatalf("miss returned ok=%v age=%v, want false/0", ok, age)
	}
}
