package requestip

import (
	"net/http"
	"testing"
)

func TestClientIPDoesNotTrustForwardingHeadersByDefault(t *testing.T) {
	t.Setenv("TRUSTED_PROXY_CIDRS", "")
	r := &http.Request{RemoteAddr: "192.0.2.10:443", Header: http.Header{"X-Forwarded-For": []string{"198.51.100.7"}}}
	if got := ClientIP(r); got != "192.0.2.10" {
		t.Fatalf("ClientIP() = %q, want peer address", got)
	}
}

func TestClientIPUsesRightmostForwardedAddressFromTrustedProxy(t *testing.T) {
	t.Setenv("TRUSTED_PROXY_CIDRS", "10.0.0.0/8")
	r := &http.Request{RemoteAddr: "10.0.0.2:443", Header: http.Header{"X-Forwarded-For": []string{"203.0.113.99, 198.51.100.7"}}}
	if got := ClientIP(r); got != "198.51.100.7" {
		t.Fatalf("ClientIP() = %q, want rightmost forwarded address", got)
	}
}
