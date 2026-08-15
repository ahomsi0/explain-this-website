package requestip

import (
	"net"
	"net/http"
	"os"
	"strings"
)

// ClientIP returns the requester's peer address. Forwarded headers are only
// considered when the immediate peer belongs to an explicitly configured
// trusted proxy network.
func ClientIP(r *http.Request) string {
	peer := remoteIP(r.RemoteAddr)
	if peer == "" || !isTrustedProxy(peer) {
		if peer != "" {
			return peer
		}
		return "unknown"
	}

	// A trusted proxy should overwrite or append the actual client address.
	// Taking the rightmost valid entry prevents a caller-supplied leftmost XFF
	// value from overriding the address added by the proxy immediately upstream.
	parts := strings.Split(r.Header.Get("X-Forwarded-For"), ",")
	for i := len(parts) - 1; i >= 0; i-- {
		if ip := net.ParseIP(strings.TrimSpace(parts[i])); ip != nil {
			return ip.String()
		}
	}
	return peer
}

func remoteIP(remoteAddr string) string {
	host, _, err := net.SplitHostPort(remoteAddr)
	if err == nil && host != "" {
		return host
	}
	return strings.TrimSpace(remoteAddr)
}

func isTrustedProxy(peer string) bool {
	raw := strings.TrimSpace(os.Getenv("TRUSTED_PROXY_CIDRS"))
	if raw == "" {
		return false
	}
	peerIP := net.ParseIP(peer)
	if peerIP == nil {
		return false
	}
	for _, candidate := range strings.Split(raw, ",") {
		candidate = strings.TrimSpace(candidate)
		if candidate == "" {
			continue
		}
		if strings.Contains(candidate, "/") {
			_, network, err := net.ParseCIDR(candidate)
			if err == nil && network.Contains(peerIP) {
				return true
			}
			continue
		}
		if ip := net.ParseIP(candidate); ip != nil && ip.Equal(peerIP) {
			return true
		}
	}
	return false
}
