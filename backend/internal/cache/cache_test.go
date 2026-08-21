package cache

import "testing"

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
